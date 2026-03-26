#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const backendModules = path.join(__dirname, '..', 'back-end', 'node_modules');
const { Client } = require(path.join(backendModules, 'pg'));
const bcrypt = require(path.join(backendModules, 'bcryptjs'));

const DEMO_PASSWORD = 'Demo2024!';
const DEMO_MARKER = 'PTAU_DEMO';

const SUBCONTRACTORS = [
  { name: 'I Can Dig That', email: 'ptausub1@paytrade.app', contact: 'Doug Walker', acct: '123456', total: 220000, retention: 0, type: 'Excavation' },
  { name: 'Leigh King Plumbing', email: 'ptausub2@paytrade.app', contact: 'Leigh King', acct: '234567', total: 600000, retention: 0.05, type: 'Plumber' },
  { name: 'Bright Spark Electricians', email: 'ptausub3@paytrade.app', contact: 'Suzan Spinks', acct: '345678', total: 1200000, retention: 0.05, type: 'Electrician' },
  { name: 'Hard And Fast Concreting', email: 'ptausub4@paytrade.app', contact: 'Billy Jones', acct: '456789', total: 410000, retention: 0.05, type: 'Concreter' },
  { name: 'Swinging Hammers', email: 'ptausub5@paytrade.app', contact: 'Eddie Clavetta', acct: '678901', total: 290000, retention: 0.05, type: 'Carpenter' },
  { name: "Can't Hurt Steel", email: 'ptausub6@paytrade.app', contact: 'Luke Howard', acct: '765432', total: 815000, retention: 0.05, type: 'Structural steel' },
  { name: 'Get It Started', email: 'ptausub7@paytrade.app', contact: 'Craig McInnes', acct: '654321', total: 250000, retention: 0.05, type: 'Electricity (Fire) supply' },
  { name: 'World Beating Sheeting', email: 'ptausub8@paytrade.app', contact: 'Jason Arthurs', acct: '789012', total: 187000, retention: 0.05, type: 'Plasterer' },
  { name: 'Pick And Stick Tiling', email: 'ptausub9@paytrade.app', contact: 'Kurt Williams', acct: '890123', total: 86000, retention: 0.05, type: 'Tiler' },
  { name: 'Strokes Painting', email: 'ptausub10@paytrade.app', contact: 'Wendy Murphy', acct: '901234', total: 144000, retention: 0.05, type: 'Painter' },
  { name: 'Classy Glass', email: 'ptausub11@paytrade.app', contact: 'Cameron Langdon', acct: '987654', total: 54000, retention: 0.05, type: 'Glass and aluminum' },
  { name: "You're Covered Roofing", email: 'ptausub12@paytrade.app', contact: 'Geoff Valk', acct: '876543', total: 290000, retention: 0.05, type: 'Roofing' },
  { name: "Stack 'Em", email: 'ptausub13@paytrade.app', contact: 'Michael Brown', acct: '567890', total: 15000, retention: 0.05, type: 'Bricklayer' },
  { name: 'Rocks, Roots, And Shoots', email: 'ptausub14@paytrade.app', contact: 'Emily Joseph', acct: '543219', total: 24000, retention: 0.05, type: 'Landscaping' },
];

function excelDateToJS(serial) {
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * 86400000);
}

function fmtDate(d) {
  if (typeof d === 'number') d = excelDateToJS(d);
  return d.toISOString().split('T')[0];
}

function fmtDateDDMMYYYY(d) {
  if (typeof d === 'number') d = excelDateToJS(d);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const CLAIMS_DATA = [
  { inv: 23, sub: 'I Can Dig That', claimDate: 45007, dueDate: 45040, claimed: 220000, paid: 220000, retention: 0, desc: 'Clearing site and removal of waste', subTotal: 220000 },
  { inv: 174, sub: 'Leigh King Plumbing', claimDate: 45007, dueDate: 45043, claimed: 230000, paid: 142500, retention: 0.05, desc: 'Rough in', subTotal: 600000, scheduleAmt: 150000, scheduleReason: 'Incomplete work', scheduleDate: 45031 },
  { inv: 106, sub: 'Bright Spark Electricians', claimDate: 45007, dueDate: 45044, claimed: 300000, paid: 285000, retention: 0.05, desc: 'Rough in', subTotal: 1200000 },
  { inv: 2089, sub: 'Hard And Fast Concreting', claimDate: 45007, dueDate: 45044, claimed: 120000, paid: 114000, retention: 0.05, desc: 'Pour and install of base', subTotal: 410000 },
  { inv: 79, sub: 'Swinging Hammers', claimDate: 45008, dueDate: 45045, claimed: 90000, paid: 85500, retention: 0.05, desc: 'Base framing', subTotal: 290000 },
  { inv: 179, sub: 'Leigh King Plumbing', claimDate: 45037, dueDate: 45075, claimed: 80000, paid: 76000, retention: 0.05, desc: 'Completed rough in', subTotal: 0 },
  { inv: 5853, sub: "Can't Hurt Steel", claimDate: 45039, dueDate: 45077, claimed: 815000, paid: 774250, retention: 0.05, desc: 'Walls and roof framing', subTotal: 815000, scenario: 6 },
  { inv: 2111, sub: 'Hard And Fast Concreting', claimDate: 45040, dueDate: 45078, claimed: 160000, paid: 152000, retention: 0.05, desc: 'Set and install of structural walls', subTotal: 0 },
  { inv: 55, sub: 'Get It Started', claimDate: 45042, dueDate: 45077, claimed: 125000, paid: 118750, retention: 0.05, desc: 'Rough in', subTotal: 250000 },
  { inv: 80, sub: 'Swinging Hammers', claimDate: 45072, dueDate: 45106, claimed: 100000, paid: 95000, retention: 0.05, desc: 'Wall and roof framing', subTotal: 0 },
  { inv: 180, sub: 'Leigh King Plumbing', claimDate: 45072, dueDate: 45107, claimed: 150000, paid: 142500, retention: 0.05, desc: 'Install fittings', subTotal: 0 },
  { inv: 4556, sub: 'World Beating Sheeting', claimDate: 45072, dueDate: 45107, claimed: 187000, paid: 177650, retention: 0.05, desc: 'All works', subTotal: 187000 },
  { inv: 107, sub: 'Bright Spark Electricians', claimDate: 45072, dueDate: 45107, claimed: 300000, paid: 285000, retention: 0.05, desc: 'Internal base install', subTotal: 0 },
  { inv: 56, sub: 'Get It Started', claimDate: 45100, dueDate: 45135, claimed: 125000, paid: 118750, retention: 0.05, desc: 'Emergency lighting and fire detection', subTotal: 0 },
  { inv: 2150, sub: 'Hard And Fast Concreting', claimDate: 45100, dueDate: 45135, claimed: 130000, paid: 123500, retention: 0.05, desc: 'All car park works', subTotal: 0 },
  { inv: 5855, sub: "Can't Hurt Steel", claimDate: 45100, dueDate: 45136, claimed: 0, paid: 0, retention: 0, desc: 'Revision correction', subTotal: 0 },
  { inv: 108, sub: 'Bright Spark Electricians', claimDate: 45101, dueDate: 45136, claimed: 300000, paid: 285000, retention: 0.05, desc: 'Internal ceiling install', subTotal: 0 },
  { inv: 81, sub: 'Swinging Hammers', claimDate: 45101, dueDate: 45136, claimed: 100000, paid: 95000, retention: 0.05, desc: 'Internal framing fit-off', subTotal: 0 },
  { inv: 181, sub: 'Leigh King Plumbing', claimDate: 45101, dueDate: 45138, claimed: 140000, paid: 133000, retention: 0.05, desc: 'Final fix plumbing', subTotal: 0 },
  { inv: 601, sub: 'Classy Glass', claimDate: 45101, dueDate: 45138, claimed: 54000, paid: 51300, retention: 0.05, desc: 'All works', subTotal: 54000 },
  { inv: 900, sub: "You're Covered Roofing", claimDate: 45102, dueDate: 45138, claimed: 290000, paid: 275500, retention: 0.05, desc: 'All works', subTotal: 290000 },
  { inv: 453, sub: 'Pick And Stick Tiling', claimDate: 45130, dueDate: 45165, claimed: 86000, paid: 81700, retention: 0.05, desc: 'All tiling', subTotal: 86000 },
  { inv: 348, sub: 'Strokes Painting', claimDate: 45130, dueDate: 45166, claimed: 72000, paid: 68400, retention: 0.05, desc: 'Internal painting', subTotal: 144000 },
  { inv: 109, sub: 'Bright Spark Electricians', claimDate: 45131, dueDate: 45166, claimed: 300000, paid: 285000, retention: 0.05, desc: 'External supply and install', subTotal: 0 },
  { inv: 110, sub: 'Bright Spark Electricians', claimDate: 45131, dueDate: 45167, claimed: 300000, paid: 285000, retention: 0.05, desc: 'Final fix', subTotal: 0 },
  { inv: 77, sub: 'Rocks, Roots, And Shoots', claimDate: 45158, dueDate: 45194, claimed: 24000, paid: 22800, retention: 0.05, desc: 'Supply and install of turf and native shrubs', subTotal: 24000 },
  { inv: 349, sub: 'Strokes Painting', claimDate: 45163, dueDate: 45198, claimed: 72000, paid: 34200, retention: 0.05, desc: 'External', subTotal: 0, scheduleAmt: 36000, scheduleReason: 'Incomplete work', scheduleDate: 45198, scenario: 5 },
  { inv: 99, sub: "Stack 'Em", claimDate: 45163, dueDate: 45197, claimed: 15000, paid: 14250, retention: 0.05, desc: 'Building car park brick wall', subTotal: 15000 },
  { inv: '349A', sub: 'Strokes Painting', claimDate: 45219, dueDate: 45226, claimed: 36000, paid: 34200, retention: 0.05, desc: 'Adjudication decision from INV 349', subTotal: 0, scenario: 5 },
];

const BUILDER_CLAIMS = [
  { inv: 2002, desc: 'Initial Deposit', claimDate: 44977, dueDate: 45016, amount: 2714160 },
  { inv: 2003, desc: 'April', claimDate: 45042, dueDate: 45056, amount: 3290484 },
  { inv: 2004, desc: 'May', claimDate: 45071, dueDate: 45087, amount: 590479.20 },
  { inv: 2005, desc: 'June', claimDate: 45102, dueDate: 45117, amount: 2025679.20 },
  { inv: 2006, desc: 'July', claimDate: 45132, dueDate: 45148, amount: 664879.20 },
  { inv: 2007, desc: 'August', claimDate: 45163, dueDate: 45179, amount: 137366 },
  { inv: 2008, desc: 'September', claimDate: 45194, dueDate: 45209, amount: 164839.20 },
  { inv: 2009, desc: 'October', claimDate: 45224, dueDate: 45240, amount: 16639.20 },
];

const TRUSTEE_PAYMENTS = [
  { id: 3001, date: 45006, amount: 2714160, desc: 'Initial deposit from AJS Development' },
  { id: 3002, date: 45079, amount: 2110484, desc: 'Progress claim April from AJS Development' },
  { id: 3003, date: 45142, amount: 1627679.20, desc: 'Progress claim June from AJS Development' },
  { id: 3004, date: 45169, amount: 372879.20, desc: 'Progress claim July/Aug from AJS Development' },
  { id: 3005, date: 45205, amount: 26366, desc: 'Progress claim Sept from AJS Development' },
];

const TOPUPS = [
  { id: 3006, date: 45039, amount: 880000, desc: 'Trustee top-up for March subcontractor payments' },
  { id: 3007, date: 45099, amount: 1133920.80, desc: 'Trustee top-up for June subcontractor payments' },
];

const EARLY_WITHDRAWAL = { date: 45007, amount: 2714160, desc: 'Early withdrawal - no registered beneficiaries' };

async function seedDemo() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');
    console.log('Starting demo account seed...\n');

    const saltRounds = bcrypt.genSaltSync(5);
    const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, saltRounds);

    console.log('1. Creating financial institution (MR Bank)...');
    const fiResult = await client.query(`
      INSERT INTO financial_institutions_details (institution_name, institution_code, place, place_id, institution_address, country, region, latitude, longitude, acc_number_maxlength, institution_status, created_group, updated_group)
      VALUES ('MR Bank', 'MRB', 'Brisbane QLD', 'demo_place_id', '1 Bank St, Brisbane QLD 4000', 'Australia', 'Queensland', '-27.4705', '153.0260', 6, 'Active', 'SYSTEM', 'SYSTEM')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    let fiId;
    if (fiResult.rows.length > 0) {
      fiId = fiResult.rows[0].id;
    } else {
      const existing = await client.query("SELECT id FROM financial_institutions_details WHERE institution_name = 'MR Bank'");
      fiId = existing.rows[0].id;
    }
    console.log('   FI ID:', fiId);

    console.log('2. Creating demo user...');
    const userResult = await client.query(`
      INSERT INTO user_details (first_name, last_name, email_id, password, position_title, user_phone_no, place_id, user_address, country, region, latitude, longitude, user_status, is_verified, user_role, created_group)
      VALUES ('James', $$O'Connor$$, 'ptaupu1@paytrade.app', $1, 'Director', '0400000001', 'demo_place_id', '456 Builder Ave, Brisbane QLD 4000', 'Australia', 'Queensland', '-27.4705', '153.0260', 'Active', true, 'STANDARD USER', 'USER')
      RETURNING user_id
    `, [hashedPassword]);
    const userId = userResult.rows[0].user_id;
    console.log('   User ID:', userId);

    console.log('3. Creating head contractor company...');
    const companyResult = await client.query(`
      INSERT INTO company_details (company_name, company_email_id, company_phone_no, entity_type, place_id, company_address, country, region, latitude, longitude, abn_number, qbcc_number, is_verified, is_system_added, is_admin_blocked, created_by, created_group)
      VALUES ('ABC Constructions Pty Ltd', 'ptauhead@paytrade.app', '0700000001', 'Business', 'demo_place_id', '789 Construction Rd, Brisbane QLD 4000', 'Australia', 'Queensland', '-27.4705', '153.0260', '12345678901', '1234567', true, false, false, $1, 'USER')
      RETURNING company_id
    `, [userId]);
    const companyId = companyResult.rows[0].company_id;
    console.log('   Company ID:', companyId);

    console.log('4. Linking user to company...');
    await client.query(`
      INSERT INTO company_user_roles (user_id, company_id, user_name, company_role, status, joined_on, is_system_added, created_group)
      VALUES ($1, $2, $$James O'Connor$$, 'PRIMARY ADMIN', 'Active', NOW(), false, 'USER')
    `, [userId, companyId]);

    console.log('5. Creating subscription (Pro Audit)...');
    await client.query(`
      INSERT INTO subscription_details (company_id, plan_id, price_id, amount, start_date, status, created_group)
      VALUES ($1, 8, 11, 0, NOW(), 'Subscribed', 'SYSTEM')
    `, [companyId]);

    console.log('6. Creating client (AJS Development)...');
    const clientResult = await client.query(`
      INSERT INTO client_suppliers_details (company_id, client_supplier_name, client_supplier_type, client_supplier_status, related_entity, entity_type, client_email_id, client_phone_no, place_id, client_supplier_address, country, region, latitude, longitude, is_deleted, notice_generated, created_group, abn_number)
      VALUES ($1, 'AJS Development', 'Client', 'Completed', 'No', 'Business', 'ptauprincipal@paytrade.app', '0700000002', 'demo_place_id', '100 Developer Dr, Brisbane QLD 4000', 'Australia', 'Queensland', '-27.4705', '153.0260', false, false, 'USER', '98765432109')
      RETURNING client_supplier_id
    `, [companyId]);
    const clientId = clientResult.rows[0].client_supplier_id;
    console.log('   Client ID:', clientId);

    console.log('7. Creating 14 subcontractors...');
    const subIds = {};
    for (const sub of SUBCONTRACTORS) {
      const result = await client.query(`
        INSERT INTO client_suppliers_details (company_id, client_supplier_name, client_supplier_type, client_supplier_status, related_entity, entity_type, client_email_id, client_phone_no, place_id, client_supplier_address, country, region, latitude, longitude, is_deleted, notice_generated, created_group, abn_number)
        VALUES ($1, $2, 'Supplier', 'Completed', 'No', 'Business', $3, $4, 'demo_place_id', '1 Sub St, Brisbane QLD 4000', 'Australia', 'Queensland', '-27.4705', '153.0260', false, false, 'USER', $5)
        RETURNING client_supplier_id
      `, [companyId, sub.name, sub.email, '040000' + sub.acct.substring(0, 4), '1000000' + sub.acct.substring(0, 4)]);
      subIds[sub.name] = result.rows[0].client_supplier_id;
      console.log(`   ${sub.name}: ID ${subIds[sub.name]}`);
    }

    console.log('8. Creating bank accounts...');
    const cashResult = await client.query(`
      INSERT INTO bank_accounts (account_name, account_type, account_number, bsb_number, company_id, status, financial_institution, current_balance, opening_date, created_group)
      VALUES ('ABC Constructions General Account', 'Cash Account', '555666', 999999, $1, 'Open', $2, 0, '2023-01-01', 'USER')
      RETURNING bank_account_id
    `, [companyId, fiId]);
    const cashAccountId = cashResult.rows[0].bank_account_id;
    console.log('   Cash Account ID:', cashAccountId);

    const ptaResult = await client.query(`
      INSERT INTO bank_accounts (account_name, account_type, account_number, bsb_number, company_id, client_supplier_id, project_ids, status, financial_institution, current_balance, opening_date, associated_cash_account_id, contract_date, contract_value, contract_practical_completion_date, first_sub_contract_date, created_group)
      VALUES ('Twin Pines ABC Constructions Project Trust', 'Project Trust Account', '111222', 999999, $1, $2, NULL, 'Open', $3, 0, '2023-03-01', $4, '2023-03-06', 9600000, '2023-10-15', '2023-03-06', 'USER')
      RETURNING bank_account_id
    `, [companyId, clientId, fiId, cashAccountId]);
    const ptaAccountId = ptaResult.rows[0].bank_account_id;
    console.log('   PTA Account ID:', ptaAccountId);

    const rtaResult = await client.query(`
      INSERT INTO bank_accounts (account_name, account_type, account_number, bsb_number, company_id, status, financial_institution, current_balance, opening_date, associated_cash_account_id, created_group)
      VALUES ('ABC Constructions Retention Trust', 'Retention Trust Account', '333444', 999999, $1, 'Open', $2, 0, '2023-03-01', $3, 'USER')
      RETURNING bank_account_id
    `, [companyId, fiId, cashAccountId]);
    const rtaAccountId = rtaResult.rows[0].bank_account_id;
    console.log('   RTA Account ID:', rtaAccountId);

    await client.query(`UPDATE bank_accounts SET project_ids = $1 WHERE bank_account_id IN ($2, $3)`, [null, ptaAccountId, rtaAccountId]);

    console.log('9. Creating project...');
    const projectResult = await client.query(`
      INSERT INTO project_details (company_id, project_name, project_role, project_date, project_description, site_address, country, region, place_id, latitude, longitude, head_contract_sum, retention_type, number_of_units, pta_eligibility, rta_eligibility, project_status, created_by, created_group)
      VALUES ($1, 'Twin Pines Shops', 'Head Contractor', '2023-03-06', 'Block of ten commercial properties', '123 Trail Road, Lutwyche QLD 4030', 'Australia', 'Queensland', 'demo_place_id', '-27.4200', '153.0300', 9600000, 'Cash', 10, 'Yes', 'Yes', 'In Progress', $2, 'USER')
      RETURNING project_id
    `, [companyId, userId]);
    const projectId = projectResult.rows[0].project_id;
    console.log('   Project ID:', projectId);

    await client.query(`UPDATE bank_accounts SET project_ids = $1 WHERE bank_account_id IN ($2, $3)`, [String(projectId), ptaAccountId, rtaAccountId]);

    console.log('10. Creating contracts...');
    const headContractResult = await client.query(`
      INSERT INTO contract_details (company_id, contract_name, client_supplier_role, contract_type, contract_status, contract_date, project_id, client_supplier_id, retention_type, payment_terms, initial_contract_sum, contract_start_date, defect_liability_end_date, payment_from_account, retention_from_account, payment_to_account, created_by, created_group)
      VALUES ($1, 'Twin Pines Head Contract', 'Principal', 'Head Contract', 'In Progress', '2023-03-06', $2, $3, 'Cash', 30, 9600000, '2023-03-06', '2024-10-15', $4, $5, $6, $7, 'USER')
      RETURNING contract_id
    `, [companyId, projectId, clientId, ptaAccountId, rtaAccountId, cashAccountId, userId]);
    const headContractId = headContractResult.rows[0].contract_id;
    console.log('   Head Contract ID:', headContractId);

    const subContractIds = {};
    for (const sub of SUBCONTRACTORS) {
      const subId = subIds[sub.name];
      const subBankResult = await client.query(`
        INSERT INTO bank_accounts (account_name, account_type, account_number, bsb_number, company_id, client_supplier_id, status, financial_institution, current_balance, opening_date, created_group)
        VALUES ($1, 'Cash Account', $2, 999999, $3, $4, 'Open', $5, 0, '2023-03-01', 'USER')
        RETURNING bank_account_id
      `, [`${sub.name} Account`, sub.acct, companyId, subId, fiId]);
      const subBankId = subBankResult.rows[0].bank_account_id;

      const retType = sub.retention > 0 ? 'Cash' : 'None';
      const contractResult = await client.query(`
        INSERT INTO contract_details (company_id, contract_name, client_supplier_role, contract_type, contract_status, contract_date, project_id, client_supplier_id, retention_type, payment_terms, initial_contract_sum, contract_start_date, defect_liability_end_date, payment_from_account, retention_from_account, payment_to_account, created_by, created_group)
        VALUES ($1, $2, 'Sub Contractor', 'Sub Contract', 'In Progress', '2023-03-06', $3, $4, $5, 30, $6, '2023-03-06', '2024-10-15', $7, $8, $9, $10, 'USER')
        RETURNING contract_id
      `, [companyId, `${sub.name} Contract`, projectId, subId, retType, sub.total, ptaAccountId, sub.retention > 0 ? rtaAccountId : null, subBankId, userId]);
      subContractIds[sub.name] = { contractId: contractResult.rows[0].contract_id, bankId: subBankId };
      console.log(`   ${sub.name}: Contract ${subContractIds[sub.name].contractId}`);
    }

    console.log('\n11. Processing simulation data chronologically...');

    let ptaBalance = 0;
    let rtaBalance = 0;
    let ptaJournalNum = 0;
    let rtaJournalNum = 0;

    const ptaTransactions = [];
    const rtaTransactions = [];

    async function addPtaJournal(date, desc, debit, credit, contractId, supplierId, auditId) {
      ptaJournalNum++;
      await client.query(`
        INSERT INTO journal_entries (company_id, project_id, contract_id, supplier_id, bank_account_id, journal_number, journal_date, journal_description, debit_amount, credit_amount, journal_process_id, entry_type, journal_suffix, activity_suffix, audit_id, transaction_account_id, is_reversed, created_group)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'System', 'J', 'A', $11, $12, false, 'SYSTEM')
      `, [companyId, projectId, contractId, supplierId, ptaAccountId, ptaJournalNum, fmtDate(date), desc, debit || 0, credit || 0, auditId, supplierId ? subContractIds[Object.keys(subIds).find(k => subIds[k] === supplierId)]?.bankId || cashAccountId : cashAccountId]);
    }

    async function addRtaJournal(date, desc, debit, credit, contractId, supplierId, auditId) {
      rtaJournalNum++;
      await client.query(`
        INSERT INTO journal_entries (company_id, project_id, contract_id, supplier_id, bank_account_id, journal_number, journal_date, journal_description, debit_amount, credit_amount, journal_process_id, entry_type, journal_suffix, activity_suffix, audit_id, transaction_account_id, is_reversed, created_group)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'System', 'J', 'A', $11, $12, false, 'SYSTEM')
      `, [companyId, projectId, contractId, supplierId, rtaAccountId, rtaJournalNum, fmtDate(date), desc, debit || 0, credit || 0, auditId, cashAccountId]);
    }

    function addPtaTxn(date, amount, desc) {
      ptaBalance += amount;
      ptaTransactions.push({ date, amount, desc, balance: ptaBalance });
    }

    function addRtaTxn(date, amount, desc) {
      rtaBalance += amount;
      rtaTransactions.push({ date, amount, desc, balance: rtaBalance });
    }

    console.log('   --- Initial deposit received ---');
    const depositDate = TRUSTEE_PAYMENTS[0].date;
    const depositAmt = TRUSTEE_PAYMENTS[0].amount;
    const builderClaim1 = await client.query(`
      INSERT INTO payment_claims (company_id, claim_type, status, list_status, project_id, contract_id, client_supplier_id, due_date, claim_amount, cash_retention, retention_percentage, memo, created_by, created_group)
      VALUES ($1, 'Receivable', 'Confirmed', 'Confirmed', $2, $3, $4, $5, $6, false, 0, 'Initial deposit', $7, 'USER')
      RETURNING payment_claim_id
    `, [companyId, projectId, headContractId, clientId, fmtDate(BUILDER_CLAIMS[0].dueDate), depositAmt, userId]);
    const depositClaimId = builderClaim1.rows[0].payment_claim_id;
    await client.query(`UPDATE payment_claims SET payment_claim_id = 100000 + payment_claim_id WHERE payment_claim_id = $1`, [depositClaimId]);

    addPtaTxn(depositDate, depositAmt, 'Deposit from AJS Development');
    await addPtaJournal(depositDate, 'Initial deposit received from AJS Development', depositAmt, 0, headContractId, null, depositClaimId);
    await addPtaJournal(depositDate, 'Trustee - Initial deposit', 0, depositAmt, headContractId, null, depositClaimId);

    console.log('   --- Early withdrawal ---');
    addPtaTxn(EARLY_WITHDRAWAL.date, -depositAmt, 'Early withdrawal to general account');
    await addPtaJournal(EARLY_WITHDRAWAL.date, 'Early withdrawal - no registered beneficiaries', 0, depositAmt, headContractId, null, null);

    console.log('   --- Processing subcontractor claims ---');
    let claimCounter = 0;
    for (const claim of CLAIMS_DATA) {
      claimCounter++;
      const subId = subIds[claim.sub];
      const contractInfo = subContractIds[claim.sub];
      if (!subId || !contractInfo) {
        console.log(`   WARNING: No sub found for "${claim.sub}"`);
        continue;
      }

      const retentionAmt = claim.retention > 0 ? Math.round(claim.claimed * claim.retention * 100) / 100 : 0;
      const paidAmt = claim.paid;
      const hasRetention = retentionAmt > 0;

      const claimResult = await client.query(`
        INSERT INTO payment_claims (company_id, claim_type, status, list_status, project_id, contract_id, client_supplier_id, due_date, sent_date, claim_amount, cash_retention, retention_percentage, retention_amount_with_gst, memo, claim_reference, created_by, created_group)
        VALUES ($1, 'Billable', 'Confirmed', 'Confirmed', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'USER')
        RETURNING payment_claim_id
      `, [companyId, projectId, contractInfo.contractId, subId, fmtDate(claim.dueDate), fmtDate(claim.claimDate), claim.claimed, hasRetention, claim.retention * 100, retentionAmt, claim.desc, `INV ${claim.inv}`, userId]);
      const pcId = claimResult.rows[0].payment_claim_id;
      await client.query(`UPDATE payment_claims SET payment_claim_id = 100000 + payment_claim_id WHERE payment_claim_id = $1`, [pcId]);
      const updatedPcId = 100000 + pcId;

      await client.query(`
        INSERT INTO payment_claim_invoices (payment_claim_id, description, quantity, unit_price, gst, total_amount_including_gst, created_group)
        VALUES ($1, $2, 1, $3, $4, $5, 'USER')
      `, [updatedPcId, claim.desc, claim.claimed / 1.1, claim.claimed / 11, claim.claimed]);

      if (paidAmt > 0) {
        const paymentResult = await client.query(`
          INSERT INTO payment_details (company_id, payment_claim_id, project_id, contract_id, client_supplier_id, payment_type, cash_retention, payment_from_account, payment_to_account, retention_account, total_amount, payment_date, current_status, list_status, created_by, created_group)
          VALUES ($1, $2, $3, $4, $5, 'Full', $6, $7, $8, $9, $10, $11, 'Confirmed - Unmatched', 'Confirmed', $12, 'USER')
          RETURNING payment_id
        `, [companyId, updatedPcId, projectId, contractInfo.contractId, subId, hasRetention, ptaAccountId, contractInfo.bankId, hasRetention ? rtaAccountId : null, paidAmt, fmtDate(claim.dueDate), userId]);
        const paymentId = paymentResult.rows[0].payment_id;

        const subPayResult = await client.query(`
          INSERT INTO sub_payments (payment_id, sub_payment_type, amount, status, created_group)
          VALUES ($1, 'Payment', $2, 'Unmatched', 'USER')
          RETURNING sub_payment_id
        `, [paymentId, paidAmt]);

        addPtaTxn(claim.dueDate, -paidAmt, `Payment to ${claim.sub} INV ${claim.inv}`);
        await addPtaJournal(claim.dueDate, `Payment to ${claim.sub} - ${claim.desc}`, 0, paidAmt, contractInfo.contractId, subId, updatedPcId);

        if (hasRetention && retentionAmt > 0) {
          const retSubPayResult = await client.query(`
            INSERT INTO sub_payments (payment_id, sub_payment_type, amount, status, created_group)
            VALUES ($1, 'Retention', $2, 'Unmatched', 'USER')
            RETURNING sub_payment_id
          `, [paymentId, retentionAmt]);

          await client.query(`
            INSERT INTO retention_details (sub_payment_id, payment_id, retained_amount, retention_status, client_supplier_id, beneficiary_type, company_id, created_group)
            VALUES ($1, $2, $3, 'Retained', $4, 'Current supplier', $5, 'USER')
          `, [retSubPayResult.rows[0].sub_payment_id, paymentId, retentionAmt, subId, companyId]);

          addRtaTxn(claim.dueDate, retentionAmt, `Retention from ${claim.sub} INV ${claim.inv}`);
          await addRtaJournal(claim.dueDate, `Retention withheld - ${claim.sub}`, retentionAmt, 0, contractInfo.contractId, subId, updatedPcId);
        }
      }

      if (claimCounter % 5 === 0) console.log(`   Processed ${claimCounter}/${CLAIMS_DATA.length} claims...`);
    }

    console.log('   --- Processing builder claims (receivable) ---');
    for (let i = 1; i < BUILDER_CLAIMS.length; i++) {
      const bc = BUILDER_CLAIMS[i];
      await client.query(`
        INSERT INTO payment_claims (company_id, claim_type, status, list_status, project_id, contract_id, client_supplier_id, due_date, sent_date, claim_amount, cash_retention, retention_percentage, memo, claim_reference, created_by, created_group)
        VALUES ($1, 'Receivable', 'Confirmed', 'Confirmed', $2, $3, $4, $5, $6, $7, false, 0, $8, $9, $10, 'USER')
      `, [companyId, projectId, headContractId, clientId, fmtDate(bc.dueDate), fmtDate(bc.claimDate), bc.amount, `Builder claim ${bc.desc}`, `INV ${bc.inv}`, userId]);
    }

    console.log('   --- Processing trustee payments (deposits to PTA) ---');
    for (let i = 1; i < TRUSTEE_PAYMENTS.length; i++) {
      const tp = TRUSTEE_PAYMENTS[i];
      addPtaTxn(tp.date, tp.amount, tp.desc);
      await addPtaJournal(tp.date, tp.desc, tp.amount, 0, headContractId, null, null);
    }

    console.log('   --- Processing top-ups ---');
    for (const tu of TOPUPS) {
      addPtaTxn(tu.date, tu.amount, tu.desc);
      await addPtaJournal(tu.date, tu.desc, tu.amount, 0, null, null, null);
    }

    console.log('\n12. Updating account balances...');
    await client.query(`UPDATE bank_accounts SET current_balance = $1, last_journal_id = $2 WHERE bank_account_id = $3`, [ptaBalance, ptaJournalNum, ptaAccountId]);
    await client.query(`UPDATE bank_accounts SET current_balance = $1, last_journal_id = $2 WHERE bank_account_id = $3`, [rtaBalance, rtaJournalNum, rtaAccountId]);
    console.log(`   PTA Balance: $${ptaBalance.toFixed(2)}`);
    console.log(`   RTA Balance: $${rtaBalance.toFixed(2)}`);

    console.log('\n13. Generating CSV bank statement files...');
    const ptaCsvHeader = 'txn_amount,txn_date,description,balance\n';
    let ptaCsv = ptaCsvHeader;
    for (const txn of ptaTransactions) {
      ptaCsv += `${txn.amount.toFixed(2)},${fmtDateDDMMYYYY(txn.date)},"${txn.desc}",${txn.balance.toFixed(2)}\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'demo-pta-transactions.csv'), ptaCsv);
    console.log(`   PTA CSV: ${ptaTransactions.length} transactions`);

    const rtaCsvHeader = 'txn_amount,txn_date,description,balance\n';
    let rtaCsv = rtaCsvHeader;
    for (const txn of rtaTransactions) {
      rtaCsv += `${txn.amount.toFixed(2)},${fmtDateDDMMYYYY(txn.date)},"${txn.desc}",${txn.balance.toFixed(2)}\n`;
    }
    fs.writeFileSync(path.join(__dirname, 'demo-rta-transactions.csv'), rtaCsv);
    console.log(`   RTA CSV: ${rtaTransactions.length} transactions`);

    await client.query('COMMIT');
    console.log('\n=== Demo account seeded successfully! ===');
    console.log(`Login: ptaupu1@paytrade.app / ${DEMO_PASSWORD}`);
    console.log(`Company: ABC Constructions Pty Ltd (ID: ${companyId})`);
    console.log(`Project: Twin Pines Shops (ID: ${projectId})`);
    console.log(`PTA Account ID: ${ptaAccountId}, RTA Account ID: ${rtaAccountId}`);
    console.log(`\nCSV files generated:`);
    console.log(`  scripts/demo-pta-transactions.csv (${ptaTransactions.length} txns)`);
    console.log(`  scripts/demo-rta-transactions.csv (${rtaTransactions.length} txns)`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nSeed failed, rolled back:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDemo();
