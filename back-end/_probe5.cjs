const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT xid.integration_id, xid.company_id, xid.tenant_id, xid.status as xero_status,
           id.integration_status, id.integration_id as id_int_id, id.integration_name
    FROM xero_integration_details xid
    LEFT JOIN integration_details id ON id.integration_id = xid.integration_id
    WHERE xid.tenant_id = '1d38001d-0783-4911-a5ca-593e186bd0b9'
       OR xid.company_id = 1005
    ORDER BY xid.integration_id
  `);
  console.log('Demo (company 1005, tenant 1d38001d) integration rows:');
  console.table(r.rows);
  await c.end();
})().catch(e=>{console.error(e);process.exit(1);});
