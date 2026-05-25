#!/usr/bin/env node
/**
 * Schema-drift guardrail (Task: prevent repeats of the closing_mode /
 * trust_account_transfer_id prod outages).
 *
 * Heuristic check, runs at build time (no DB required):
 *
 *   1. Walk every *.entity.ts under back-end/src/entities/.
 *   2. Extract every column name — both the explicit `@Column({ name: 'foo' })`
 *      form and the implicit `@Column() bar: type` form.
 *   3. Walk every migration in back-end/src/migrations/ and concatenate them.
 *   4. For each entity column, fail the build if its name does NOT appear in
 *      any migration AND is not in the allowlist.
 *
 * The allowlist (schema-drift-allowlist.json, generated once from the current
 * state) covers the years of columns created by `synchronize: true` before
 * migrations were tracked. Every NEW column added going forward must either
 * be referenced in a migration or be explicitly added to the allowlist
 * (which is a deliberate code-review red flag).
 *
 * Limitations (acknowledged trade-offs):
 *   - Pure text match. A migration that comments "fixes the foo column" would
 *     count as referencing `foo`. False negatives possible.
 *   - Doesn't validate types/defaults/nullability — only column existence.
 *   - Doesn't catch DROPped columns whose entity field was deleted.
 *
 * For the exact failure mode we hit twice — "new entity column, no migration
 * written" — this catches it 100% of the time.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const ENTITIES_DIR = path.join(BACKEND_ROOT, 'src', 'entities');
const MIGRATIONS_DIR = path.join(BACKEND_ROOT, 'src', 'migrations');
const ALLOWLIST_FILE = path.join(__dirname, 'schema-drift-allowlist.json');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (f.isFile()) out.push(p);
  }
  return out;
}

const COLUMN_DECORATORS = [
  'Column',
  'PrimaryColumn',
  'PrimaryGeneratedColumn',
  'CreateDateColumn',
  'UpdateDateColumn',
  'DeleteDateColumn',
  'VersionColumn',
];

function extractColumns(content) {
  const cols = new Set();

  // 1. Explicit `name: 'foo'` inside any column or join-column decorator,
  //    multi-line aware.
  const nameRe =
    /@(?:Join)?Column[^(]*\(\s*\{[\s\S]*?name:\s*['"]([a-zA-Z0-9_]+)['"][\s\S]*?\}/g;
  let m;
  while ((m = nameRe.exec(content)) !== null) {
    cols.add(m[1]);
  }

  // 2. Implicit form — `@Column(...)` (without `name:`) followed by a property
  //    declaration. Greedy match the decorator block, then skip blank lines /
  //    other decorators / comments to the property name.
  const decoRe = new RegExp(
    `@(${COLUMN_DECORATORS.join('|')})\\b\\s*\\(([\\s\\S]*?)\\)([\\s\\S]{0,400}?)\\n\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*[?!:]`,
    'g',
  );
  while ((m = decoRe.exec(content)) !== null) {
    const [, , decoratorArgs, between, propName] = m;
    // Skip if the decorator already declared an explicit `name:` (handled above).
    if (/name:\s*['"]/.test(decoratorArgs)) continue;
    // Skip if the gap between decorator and the property declaration contains
    // ANOTHER column-defining decorator (it would mean we're attaching this
    // property to the wrong decorator).
    if (new RegExp(`@(${COLUMN_DECORATORS.join('|')})\\b`).test(between)) continue;
    cols.add(propName);
  }

  return cols;
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf8'));
    return new Set(data.columns || []);
  } catch (e) {
    console.error(`Failed to parse ${ALLOWLIST_FILE}: ${e.message}`);
    process.exit(2);
  }
}

const entityFiles = walk(ENTITIES_DIR).filter((f) => /\.entity\.ts$/.test(f));
const migrationFiles = walk(MIGRATIONS_DIR).filter(
  (f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f),
);

if (entityFiles.length === 0) {
  console.error(`No entity files found under ${ENTITIES_DIR}`);
  process.exit(2);
}

const migrationText = migrationFiles
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const allowlist = loadAllowlist();
const writeAllowlist = process.argv.includes('--write-allowlist');

const violations = [];
const allColumns = new Set();

for (const ef of entityFiles) {
  const content = fs.readFileSync(ef, 'utf8');
  const cols = extractColumns(content);
  for (const col of cols) {
    allColumns.add(col);
    if (allowlist.has(col)) continue;
    // Match the column name in quotes OR as a bareword surrounded by
    // non-identifier chars. Migrations may write `"foo"`, `'foo'`, or
    // refer to it in a comment.
    const re = new RegExp(`["'\`]${col}["'\`]|\\b${col}\\b`);
    if (!re.test(migrationText)) {
      violations.push({
        file: path.relative(process.cwd(), ef),
        column: col,
      });
    }
  }
}

if (writeAllowlist) {
  const sorted = [...allColumns].sort();
  fs.writeFileSync(
    ALLOWLIST_FILE,
    JSON.stringify(
      {
        _comment:
          'Generated by check-schema-drift.js --write-allowlist. Lists every entity column that existed at the time the drift guardrail was introduced. New columns added after this baseline must be referenced in a migration (or, very rarely and only with code-review justification, added to this list).',
        generatedAt: new Date().toISOString(),
        columns: sorted,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `✓ Wrote ${sorted.length} columns to ${path.relative(process.cwd(), ALLOWLIST_FILE)}`,
  );
  process.exit(0);
}

if (violations.length > 0) {
  console.error('');
  console.error(
    '✗ Schema drift detected — entity columns with no matching migration:',
  );
  console.error('');
  // Group by file for readability
  const byFile = {};
  for (const v of violations) {
    (byFile[v.file] ||= []).push(v.column);
  }
  for (const [file, cols] of Object.entries(byFile)) {
    console.error(`  ${file}`);
    for (const c of cols) console.error(`    • ${c}`);
  }
  console.error('');
  console.error(
    `  ${violations.length} column(s) appear in entity files but are not referenced`,
  );
  console.error('  in any migration. To fix:');
  console.error('');
  console.error('    (a) Write a TypeORM migration that ADDs the column(s),');
  console.error(
    '        OR (b) if this is a legacy column that already exists in prod,',
  );
  console.error(
    '        add the name(s) to back-end/scripts/schema-drift-allowlist.json',
  );
  console.error('        (only with code-review justification).');
  console.error('');
  console.error(
    '  This check exists to prevent the closing_mode / trust_account_transfer_id',
  );
  console.error('  class of prod outages — a new entity field that ships without a',);
  console.error('  matching migration, breaking every query that joins the table.');
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Schema drift check passed (${entityFiles.length} entities, ${migrationFiles.length} migrations, ${allowlist.size} legacy columns allowlisted).`,
);
