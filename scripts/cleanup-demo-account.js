#!/usr/bin/env node
const path = require('path');
const backendModules = path.join(__dirname, '..', 'back-end', 'node_modules');
const { Client } = require(path.join(backendModules, 'pg'));

async function cleanupDemo() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');
    console.log('Cleaning up demo account data...\n');

    const userResult = await client.query("SELECT user_id FROM user_details WHERE email_id = 'ptaupu1@paytrade.app'");
    if (userResult.rows.length === 0) {
      console.log('No demo account found. Nothing to clean up.');
      await client.query('ROLLBACK');
      return;
    }
    const userId = userResult.rows[0].user_id;

    const companyResult = await client.query("SELECT company_id FROM company_details WHERE company_email_id = 'ptauhead@paytrade.app'");
    if (companyResult.rows.length === 0) {
      console.log('No demo company found.');
      await client.query('ROLLBACK');
      return;
    }
    const companyId = companyResult.rows[0].company_id;
    console.log(`Found demo user (${userId}) and company (${companyId})`);

    console.log('1. Deleting journal entries...');
    const je = await client.query('DELETE FROM journal_entries WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${je.rowCount} journal entries`);

    console.log('2. Deleting retention details...');
    const rd = await client.query('DELETE FROM retention_details WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${rd.rowCount} retention details`);

    console.log('3. Deleting sub payments...');
    const sp = await client.query(`
      DELETE FROM sub_payments WHERE payment_id IN (SELECT payment_id FROM payment_details WHERE company_id = $1)
    `, [companyId]);
    console.log(`   Deleted ${sp.rowCount} sub payments`);

    console.log('4. Deleting payment details...');
    const pd = await client.query('DELETE FROM payment_details WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${pd.rowCount} payment details`);

    console.log('5. Deleting payment claim invoices...');
    const pci = await client.query(`
      DELETE FROM payment_claim_invoices WHERE payment_claim_id IN (SELECT payment_claim_id FROM payment_claims WHERE company_id = $1)
    `, [companyId]);
    console.log(`   Deleted ${pci.rowCount} payment claim invoices`);

    console.log('6. Deleting payment claims...');
    const pc = await client.query('DELETE FROM payment_claims WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${pc.rowCount} payment claims`);

    console.log('7. Deleting reconciliation reports...');
    const rr = await client.query(`
      DELETE FROM reconciliation_report WHERE bank_account_id IN (SELECT bank_account_id FROM bank_accounts WHERE company_id = $1)
    `, [companyId]);
    console.log(`   Deleted ${rr.rowCount} reconciliation reports`);

    console.log('8. Deleting transactions...');
    const txn = await client.query(`
      DELETE FROM transaction_details WHERE company_id = $1
    `, [companyId]);
    console.log(`   Deleted ${txn.rowCount} transactions`);

    console.log('9. Deleting bank statements...');
    const bs = await client.query(`
      DELETE FROM bank_statements WHERE bank_account_id IN (SELECT bank_account_id FROM bank_accounts WHERE company_id = $1)
    `, [companyId]);
    console.log(`   Deleted ${bs.rowCount} bank statements`);

    console.log('10. Deleting compliance records...');
    await client.query('DELETE FROM pta_compliances WHERE project_id IN (SELECT project_id FROM project_details WHERE company_id = $1)', [companyId]);
    await client.query('DELETE FROM rta_compliances WHERE project_id IN (SELECT project_id FROM project_details WHERE company_id = $1)', [companyId]);
    await client.query('DELETE FROM compliance_of_projects WHERE project_id IN (SELECT project_id FROM project_details WHERE company_id = $1)', [companyId]);

    console.log('11. Deleting contracts...');
    const cd = await client.query('DELETE FROM contract_details WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${cd.rowCount} contracts`);

    console.log('12. Deleting project...');
    const proj = await client.query('DELETE FROM project_details WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${proj.rowCount} projects`);

    console.log('13. Deleting bank accounts...');
    const ba = await client.query('DELETE FROM bank_accounts WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${ba.rowCount} bank accounts`);

    console.log('14. Deleting client/suppliers...');
    const cs = await client.query('DELETE FROM client_suppliers_details WHERE company_id = $1', [companyId]);
    console.log(`   Deleted ${cs.rowCount} client/suppliers`);

    console.log('15. Deleting subscription...');
    await client.query('DELETE FROM subscription_details WHERE company_id = $1', [companyId]);

    console.log('16. Deleting company-user link...');
    await client.query('DELETE FROM company_user_roles WHERE company_id = $1', [companyId]);

    console.log('17. Deleting company...');
    await client.query('DELETE FROM company_details WHERE company_id = $1', [companyId]);

    console.log('18. Deleting user...');
    await client.query("DELETE FROM user_details WHERE email_id = 'ptaupu1@paytrade.app'");

    console.log('19. Deleting subcontractor users...');
    await client.query("DELETE FROM user_details WHERE email_id LIKE 'ptausub%@paytrade.app'");
    await client.query("DELETE FROM user_details WHERE email_id = 'ptauprincipal@paytrade.app'");

    console.log('20. Cleaning up financial institution...');
    await client.query("DELETE FROM financial_institutions_details WHERE institution_name = 'MR Bank' AND institution_code = 'MRB'");

    console.log('21. Cleaning up generated CSV files...');
    const fs = require('fs');
    const path = require('path');
    const csvFiles = ['demo-pta-transactions.csv', 'demo-rta-transactions.csv'];
    for (const f of csvFiles) {
      const fp = path.join(__dirname, f);
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        console.log(`   Deleted ${f}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n=== Demo account cleaned up successfully! ===');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nCleanup failed, rolled back:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupDemo();
