/**
 * Task #145 — One-shot cleanup for duplicate Xero contact rows for a SINGLE company.
 *
 * What this does:
 *   For one company at a time, deletes every row in `xero_contact_details`
 *   that belongs to that company's ACTIVE `xero_integration_details`
 *   row(s) — but ONLY when no other PayTrade record references those
 *   rows. The intended follow-up is for the user to click "Sync" on the
 *   Xero Contacts tab; the partial unique index added in the Task #135
 *   migrations then keeps things clean.
 *
 * Safety guarantees:
 *   - Requires --company-id <id>. There is no all-companies mode.
 *   - Defaults to --dry-run. You must pass --apply to actually delete.
 *   - Refuses to run (no deletes) if ANY of the targeted rows are
 *     referenced by:
 *       * client_suppliers_details (via xero_contact_details.pt_contact_id mapping)
 *       * xero_invoices_bills.contact_id
 *       * xero_payments.contact_id
 *       * xero_sync_logs.reference->>'xeroId' JSONB references
 *   - With --apply, all DELETEs (xero_contact_details +
 *     xero_contact_dedupe_conflicts for the same integration) run inside
 *     a single transaction.
 *
 * How to run on Railway:
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
  --dry-run             (default) Print what would be deleted, change nothing.
  --apply               Perform the deletes inside a single transaction.
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

  console.log('=== Task #145 — Xero contacts cleanup ===');
  console.log(`Mode:        ${args.apply ? 'APPLY (will delete)' : 'DRY-RUN (no changes)'}`);
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

    // 2. Count xero_contact_details rows in scope (summary).
    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE contact_id IS NULL)::int AS null_contact_id
         FROM xero_contact_details
         WHERE integration_id = ANY($1::int[])`,
      [integrationIds],
    );
    const byStatusRes = await client.query(
      `SELECT contact_status, COUNT(*)::int AS c
         FROM xero_contact_details
         WHERE integration_id = ANY($1::int[])
         GROUP BY contact_status
         ORDER BY contact_status`,
      [integrationIds],
    );
    const total = totalRes.rows[0].total;
    console.log(`xero_contact_details rows in scope: ${total}`);
    console.log(`  contact_id IS NULL: ${totalRes.rows[0].null_contact_id}`);
    console.log('  By contact_status:');
    if (byStatusRes.rows.length === 0) {
      console.log('    (none)');
    } else {
      for (const r of byStatusRes.rows) {
        console.log(`    ${r.contact_status || '(null)'}: ${r.c}`);
      }
    }
    console.log('');

    if (total === 0) {
      console.log('Nothing to delete. Exiting.');
      await client.end();
      process.exit(0);
    }

    // 3. Reference checks. Each must be zero, or we abort.
    //    The set of in-scope xero_contact_details.id values is reused
    //    across each check via an IN (subquery) pattern.
    const inScopeSelector = `
      SELECT id FROM xero_contact_details
      WHERE integration_id = ANY($1::int[])
    `;

    const mappedRes = await client.query(
      `SELECT COUNT(*)::int AS c
         FROM xero_contact_details
         WHERE integration_id = ANY($1::int[])
           AND pt_contact_id IS NOT NULL`,
      [integrationIds],
    );
    const mappedClientSuppliersRes = await client.query(
      `SELECT COUNT(DISTINCT csd.client_supplier_id)::int AS c
         FROM client_suppliers_details csd
         WHERE csd.client_supplier_id IN (
           SELECT pt_contact_id FROM xero_contact_details
           WHERE integration_id = ANY($1::int[])
             AND pt_contact_id IS NOT NULL
         )`,
      [integrationIds],
    );

    const invoicesRes = await client.query(
      `SELECT COUNT(*)::int AS c
         FROM xero_invoices_bills
         WHERE contact_id IN (${inScopeSelector})`,
      [integrationIds],
    );

    const paymentsRes = await client.query(
      `SELECT COUNT(*)::int AS c
         FROM xero_payments
         WHERE contact_id IN (${inScopeSelector})`,
      [integrationIds],
    );

    const syncLogsRes = await client.query(
      `SELECT COUNT(*)::int AS c
         FROM xero_sync_logs
         WHERE reference IS NOT NULL
           AND (reference::jsonb->>'xeroId') IN (
             SELECT id::text FROM xero_contact_details
             WHERE integration_id = ANY($1::int[])
           )`,
      [integrationIds],
    );

    const conflictsRes = await client.query(
      `SELECT COUNT(*)::int AS c
         FROM xero_contact_dedupe_conflicts
         WHERE integration_id = ANY($1::int[])`,
      [integrationIds],
    );

    console.log('Reference checks (must all be zero to proceed):');
    console.log(`  client_suppliers_details mapped via pt_contact_id: ${mappedClientSuppliersRes.rows[0].c} (${mappedRes.rows[0].c} xero rows are mapped)`);
    console.log(`  xero_invoices_bills.contact_id references:         ${invoicesRes.rows[0].c}`);
    console.log(`  xero_payments.contact_id references:               ${paymentsRes.rows[0].c}`);
    console.log(`  xero_sync_logs.reference->>'xeroId' references:    ${syncLogsRes.rows[0].c}`);
    console.log(`  xero_contact_dedupe_conflicts rows (will clear):   ${conflictsRes.rows[0].c}`);
    console.log('');

    const blockingTotal =
      mappedRes.rows[0].c +
      invoicesRes.rows[0].c +
      paymentsRes.rows[0].c +
      syncLogsRes.rows[0].c;

    if (blockingTotal > 0) {
      console.error('ABORT: targeted xero_contact_details rows are still referenced elsewhere.');
      console.error('This script refuses to run when any of the following are non-zero:');
      if (mappedRes.rows[0].c > 0) {
        console.error(`  - ${mappedRes.rows[0].c} xero_contact_details rows are mapped to PT contacts (pt_contact_id IS NOT NULL).`);
      }
      if (invoicesRes.rows[0].c > 0) {
        console.error(`  - ${invoicesRes.rows[0].c} xero_invoices_bills rows reference these contacts.`);
      }
      if (paymentsRes.rows[0].c > 0) {
        console.error(`  - ${paymentsRes.rows[0].c} xero_payments rows reference these contacts.`);
      }
      if (syncLogsRes.rows[0].c > 0) {
        console.error(`  - ${syncLogsRes.rows[0].c} xero_sync_logs rows reference these contacts via reference->>'xeroId'.`);
      }
      console.error('');
      console.error('This profile is NOT safe for the delete-only cleanup. A merge-based');
      console.error('resolution is required instead. No changes were made.');
      await client.end();
      process.exit(2);
    }

    // 4. Either dry-run summary or apply inside a transaction.
    if (args.dryRun) {
      console.log('DRY-RUN: would execute (no changes applied):');
      console.log(`  DELETE FROM xero_contact_dedupe_conflicts WHERE integration_id = ANY('{${integrationIds.join(',')}}'::int[]);  -- ${conflictsRes.rows[0].c} row(s)`);
      console.log(`  DELETE FROM xero_contact_details          WHERE integration_id = ANY('{${integrationIds.join(',')}}'::int[]);  -- ${total} row(s)`);
      console.log('');
      console.log('Re-run with --apply to perform the deletes.');
      await client.end();
      process.exit(0);
    }

    // --apply: single transaction.
    console.log('Applying deletes inside a single transaction...');
    await client.query('BEGIN');
    try {
      const deletedConflicts = await client.query(
        `DELETE FROM xero_contact_dedupe_conflicts
           WHERE integration_id = ANY($1::int[])`,
        [integrationIds],
      );
      const deletedContacts = await client.query(
        `DELETE FROM xero_contact_details
           WHERE integration_id = ANY($1::int[])`,
        [integrationIds],
      );

      const afterRes = await client.query(
        `SELECT COUNT(*)::int AS c
           FROM xero_contact_details
           WHERE integration_id = ANY($1::int[])`,
        [integrationIds],
      );

      await client.query('COMMIT');

      console.log('');
      console.log('=== Apply complete ===');
      console.log(`xero_contact_dedupe_conflicts deleted: ${deletedConflicts.rowCount}`);
      console.log(`xero_contact_details deleted:          ${deletedContacts.rowCount}`);
      console.log(`xero_contact_details rows before:      ${total}`);
      console.log(`xero_contact_details rows after:       ${afterRes.rows[0].c}`);
      console.log('');
      console.log('Next step: ask the user to click **Sync** on the Xero Contacts tab.');
      console.log('The partial unique index from Task #135 will keep things clean.');
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
