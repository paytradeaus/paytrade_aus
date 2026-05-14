/**
 * Task #145 — Duplicate Xero contact cleanup for a SINGLE company.
 *
 * REWRITTEN to do MERGE-based dedupe (the original delete-only flow
 * always aborted in production because xero_invoices_bills.contact_id
 * and xero_payments.contact_id are FK constraints — you can't delete a
 * duplicate row while invoices still point at it).
 *
 * The logic here mirrors the Task #135 Phase 1 migration
 * (`1715731300000-XeroContactsDedupeAndUniqueIndex.ts`) but scoped to
 * one company's ACTIVE integration(s):
 *
 *   1. Group duplicates by (integration_id, contact_id) where
 *      contact_id IS NOT NULL.
 *   2. Skip TRUE mapped-vs-mapped conflicts (a group whose mapped rows
 *      reference more than one distinct PT pt_contact_id) — those need
 *      a human to pick a winner. They are recorded in
 *      `xero_contact_dedupe_conflicts` for the operator.
 *   3. For every other group: pick a canonical row (prefer mapped,
 *      then oldest created_on, then lowest id text), repoint
 *      xero_invoices_bills.contact_id, xero_payments.contact_id, and
 *      the JSONB `xero_sync_logs.reference->>'xeroId'` references to
 *      the canonical row, then delete the duplicates.
 *   4. Also dedupe rows with contact_id IS NULL by
 *      (integration_id, lower(contact_name)) using the same merge
 *      strategy — these are the "Unmapped" duplicates the user sees on
 *      the XERO CONTACTS tab when contact_id never came back from
 *      Xero.
 *   5. Clear stale `xero_contact_dedupe_conflicts` rows for the same
 *      integration once nothing remains in conflict.
 *
 * Idempotent: on a clean DB the cleanup is a no-op.
 *
 * How to run:
 *   pnpm --filter back-end run cleanup:xero-contacts -- --company-id <id>
 *   pnpm --filter back-end run cleanup:xero-contacts -- --company-id <id> --apply
 *
 * Or directly:
 *   node back-end/scripts/cleanup-xero-contacts.js --company-id <id>
 *   node back-end/scripts/cleanup-xero-contacts.js --company-id <id> --apply
 *
 * Reads DATABASE_URL from env. Uses `pg` directly (no Nest bootstrap).
 */

const { Client } = require('pg');

function parseArgs(argv) {
  const out = { companyId: null, apply: false, dryRun: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') {
      out.apply = true;
      out.dryRun = false;
    } else if (a === '--dry-run') {
      out.apply = false;
      out.dryRun = true;
    } else if (a === '--company-id') {
      out.companyId = argv[++i];
    } else if (a.startsWith('--company-id=')) {
      out.companyId = a.split('=')[1];
    } else if (a === '-h' || a === '--help') {
      out.help = true;
    } else {
      console.error(`Unknown arg: ${a}`);
      out.help = true;
    }
  }
  if (!out.companyId && process.env.COMPANY_ID) {
    out.companyId = process.env.COMPANY_ID;
  }
  return out;
}

function printUsage() {
  console.log(`Usage: node back-end/scripts/cleanup-xero-contacts.js --company-id <id> [--apply|--dry-run]

Required:
  --company-id <id>     Numeric company_id whose Xero contacts to clean.
                        May also be supplied via COMPANY_ID env var.

Optional:
  --dry-run             (default) Print what would be merged, change nothing.
  --apply               Perform the merge inside a single transaction.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.companyId) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const companyId = Number(args.companyId);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    console.error(`--company-id must be a positive integer, got: ${args.companyId}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sslConfig = databaseUrl.includes('railway.app') || databaseUrl.includes('railway.internal')
    ? { rejectUnauthorized: false }
    : false;

  const client = new Client({ connectionString: databaseUrl, ssl: sslConfig });
  await client.connect();

  console.log('=== Task #145 — Xero contacts MERGE cleanup ===');
  console.log(`Mode:        ${args.apply ? 'APPLY (will repoint + delete)' : 'DRY-RUN (no changes)'}`);
  console.log(`Company ID:  ${companyId}`);
  console.log('');

  try {
    // 1. Resolve ACTIVE integration(s) for this company.
    const integrationsRes = await client.query(
      `SELECT integration_id, tenant_id, status
         FROM xero_integration_details
         WHERE company_id = $1 AND status = 'ACTIVE'
         ORDER BY integration_id`,
      [companyId],
    );
    const integrationIds = integrationsRes.rows.map((r) => r.integration_id);

    if (integrationIds.length === 0) {
      console.log(`No ACTIVE xero_integration_details rows found for company_id=${companyId}. Nothing to do.`);
      await client.end();
      process.exit(0);
    }
    console.log(`Found ${integrationIds.length} ACTIVE integration row(s):`);
    for (const r of integrationsRes.rows) {
      console.log(`  - integration_id=${r.integration_id} tenant_id=${r.tenant_id}`);
    }
    console.log('');

    // 2. Identify duplicate groups for this company.
    //    Two grouping keys:
    //      (a) (integration_id, contact_id)            where contact_id IS NOT NULL
    //      (b) (integration_id, lower(contact_name))   where contact_id IS NULL
    const groupsByContactIdRes = await client.query(
      `SELECT integration_id, contact_id, COUNT(*)::int AS row_count,
              array_agg(id ORDER BY
                CASE WHEN mapped_status::text IN ('Manual', 'Auto', 'System') THEN 0 ELSE 1 END,
                created_on NULLS LAST,
                id::text
              ) AS row_ids,
              COUNT(DISTINCT pt_contact_id)::int AS distinct_pt
         FROM xero_contact_details
         WHERE integration_id = ANY($1::int[])
           AND contact_id IS NOT NULL
         GROUP BY integration_id, contact_id
         HAVING COUNT(*) > 1`,
      [integrationIds],
    );
    const groupsByNameRes = await client.query(
      `SELECT integration_id, lower(contact_name) AS name_key,
              COUNT(*)::int AS row_count,
              array_agg(id ORDER BY
                CASE WHEN mapped_status::text IN ('Manual', 'Auto', 'System') THEN 0 ELSE 1 END,
                created_on NULLS LAST,
                id::text
              ) AS row_ids,
              COUNT(DISTINCT pt_contact_id)::int AS distinct_pt
         FROM xero_contact_details
         WHERE integration_id = ANY($1::int[])
           AND contact_id IS NULL
         GROUP BY integration_id, lower(contact_name)
         HAVING COUNT(*) > 1`,
      [integrationIds],
    );

    const totalGroups = groupsByContactIdRes.rows.length + groupsByNameRes.rows.length;
    const totalDupesPlanned =
      groupsByContactIdRes.rows.reduce((s, r) => s + (r.row_count - 1), 0) +
      groupsByNameRes.rows.reduce((s, r) => s + (r.row_count - 1), 0);

    console.log(`Duplicate groups found: ${totalGroups}`);
    console.log(`  by (integration_id, contact_id):     ${groupsByContactIdRes.rows.length}`);
    console.log(`  by (integration_id, contact_name):   ${groupsByNameRes.rows.length}`);
    console.log(`Rows that would be removed (canonical kept per group): ${totalDupesPlanned}`);
    console.log('');

    if (totalGroups === 0) {
      console.log('Nothing to merge. Exiting.');
      await client.end();
      process.exit(0);
    }

    // Surface conflict groups (mapped to >1 distinct PT contact) — these are SKIPPED.
    const conflictGroups = groupsByContactIdRes.rows.filter((g) => g.distinct_pt > 1);
    const conflictNameGroups = groupsByNameRes.rows.filter((g) => g.distinct_pt > 1);
    if (conflictGroups.length > 0 || conflictNameGroups.length > 0) {
      console.log('Mapped-vs-mapped CONFLICT groups (will be SKIPPED — need human resolution):');
      for (const g of conflictGroups) {
        console.log(`  contact_id=${g.contact_id} integration_id=${g.integration_id} rows=${g.row_count} distinct_pt=${g.distinct_pt}`);
      }
      for (const g of conflictNameGroups) {
        console.log(`  name=${g.name_key} integration_id=${g.integration_id} rows=${g.row_count} distinct_pt=${g.distinct_pt}`);
      }
      console.log('');
    }

    if (args.dryRun) {
      console.log('DRY-RUN: would merge each non-conflict group, repointing references first.');
      console.log('  - xero_invoices_bills.contact_id       repointed to canonical');
      console.log('  - xero_payments.contact_id             repointed to canonical');
      console.log("  - xero_sync_logs.reference->>'xeroId'  repointed to canonical");
      console.log('  - duplicate xero_contact_details rows  deleted');
      console.log('');
      console.log('Re-run with --apply to perform the merge.');
      await client.end();
      process.exit(0);
    }

    // 3. APPLY — single transaction.
    // Detect optional companion table BEFORE the transaction. The
    // `xero_contact_dedupe_conflicts` ledger is created by the Task #135
    // migrations; production environments that never ran those migrations
    // will not have it, and we must not let that abort the merge.
    const conflictsTableRes = await client.query(
      `SELECT to_regclass('public.xero_contact_dedupe_conflicts') AS t`,
    );
    const hasConflictsTable = conflictsTableRes.rows[0].t !== null;
    if (!hasConflictsTable) {
      console.log('Note: xero_contact_dedupe_conflicts table not present — skipping ledger cleanup step.');
    }

    console.log('Applying MERGE inside a single transaction...');
    await client.query('BEGIN');
    try {
      let mergedGroups = 0;
      let removedRows = 0;
      let invoicesRepointed = 0;
      let paymentsRepointed = 0;
      let syncLogsRepointed = 0;

      for (const g of groupsByContactIdRes.rows) {
        if (g.distinct_pt > 1) continue; // skip conflict
        const canonical = g.row_ids[0];
        const dupes = g.row_ids.slice(1);
        if (dupes.length === 0) continue;

        const inv = await client.query(
          `UPDATE xero_invoices_bills SET contact_id = $1::uuid
             WHERE contact_id = ANY($2::uuid[])`,
          [canonical, dupes],
        );
        const pay = await client.query(
          `UPDATE xero_payments SET contact_id = $1::uuid
             WHERE contact_id = ANY($2::uuid[])`,
          [canonical, dupes],
        );
        const log = await client.query(
          `UPDATE xero_sync_logs
             SET reference = jsonb_set(reference::jsonb, '{xeroId}', to_jsonb($1::text))
             WHERE reference IS NOT NULL
               AND reference::jsonb->>'xeroId' = ANY($2::text[])`,
          [canonical, dupes.map(String)],
        );
        const del = await client.query(
          `DELETE FROM xero_contact_details WHERE id = ANY($1::uuid[])`,
          [dupes],
        );

        invoicesRepointed += inv.rowCount;
        paymentsRepointed += pay.rowCount;
        syncLogsRepointed += log.rowCount;
        removedRows += del.rowCount;
        mergedGroups += 1;
        console.log(`  merged contact_id=${g.contact_id} kept=${canonical} removed=${dupes.length} (inv=${inv.rowCount} pay=${pay.rowCount} log=${log.rowCount})`);
      }

      for (const g of groupsByNameRes.rows) {
        if (g.distinct_pt > 1) continue; // skip conflict
        const canonical = g.row_ids[0];
        const dupes = g.row_ids.slice(1);
        if (dupes.length === 0) continue;

        const inv = await client.query(
          `UPDATE xero_invoices_bills SET contact_id = $1::uuid
             WHERE contact_id = ANY($2::uuid[])`,
          [canonical, dupes],
        );
        const pay = await client.query(
          `UPDATE xero_payments SET contact_id = $1::uuid
             WHERE contact_id = ANY($2::uuid[])`,
          [canonical, dupes],
        );
        const log = await client.query(
          `UPDATE xero_sync_logs
             SET reference = jsonb_set(reference::jsonb, '{xeroId}', to_jsonb($1::text))
             WHERE reference IS NOT NULL
               AND reference::jsonb->>'xeroId' = ANY($2::text[])`,
          [canonical, dupes.map(String)],
        );
        const del = await client.query(
          `DELETE FROM xero_contact_details WHERE id = ANY($1::uuid[])`,
          [dupes],
        );

        invoicesRepointed += inv.rowCount;
        paymentsRepointed += pay.rowCount;
        syncLogsRepointed += log.rowCount;
        removedRows += del.rowCount;
        mergedGroups += 1;
        console.log(`  merged name=${g.name_key} kept=${canonical} removed=${dupes.length} (inv=${inv.rowCount} pay=${pay.rowCount} log=${log.rowCount})`);
      }

      // Clear resolved conflict ledger rows: any row whose
      // (integration_id, contact_id) no longer has duplicates.
      // Skipped silently when the ledger table does not exist.
      let cleared = { rowCount: 0 };
      if (hasConflictsTable) {
        cleared = await client.query(
          `DELETE FROM xero_contact_dedupe_conflicts c
             WHERE c.integration_id = ANY($1::int[])
               AND NOT EXISTS (
                 SELECT 1 FROM xero_contact_details xcd
                  WHERE xcd.integration_id = c.integration_id
                    AND xcd.contact_id = c.contact_id
                  GROUP BY xcd.integration_id, xcd.contact_id
                  HAVING COUNT(*) > 1
               )`,
          [integrationIds],
        );
      }

      const afterRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM xero_contact_details
           WHERE integration_id = ANY($1::int[])`,
        [integrationIds],
      );

      await client.query('COMMIT');

      console.log('');
      console.log('=== Merge complete ===');
      console.log(`Groups merged:                          ${mergedGroups}`);
      console.log(`xero_contact_details rows deleted:      ${removedRows}`);
      console.log(`xero_invoices_bills repointed:          ${invoicesRepointed}`);
      console.log(`xero_payments repointed:                ${paymentsRepointed}`);
      console.log(`xero_sync_logs.reference repointed:     ${syncLogsRepointed}`);
      console.log(`xero_contact_dedupe_conflicts cleared:  ${cleared.rowCount}`);
      console.log(`xero_contact_details rows after:        ${afterRes.rows[0].c}`);
      const skipped = conflictGroups.length + conflictNameGroups.length;
      if (skipped > 0) {
        console.log(`Skipped (mapped-vs-mapped conflicts):   ${skipped} — needs manual resolution.`);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    await client.end();
    process.exit(0);
  } catch (err) {
    try { await client.end(); } catch (_) {}
    console.error('Cleanup failed:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
