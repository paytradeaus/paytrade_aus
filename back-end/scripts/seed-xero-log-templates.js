const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sslConfig = databaseUrl.includes('railway.app')
    ? { rejectUnauthorized: false }
    : false;

  const client = new Client({ connectionString: databaseUrl, ssl: sslConfig });
  await client.connect();
  console.log('Connected to database');

  const sqlFile = path.join(__dirname, 'seed-xero-log-templates.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  const statements = sql
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('--'));

  console.log(`Found ${statements.length} template statements to process`);

  const beforeResult = await client.query(
    'SELECT COUNT(*)::int AS count FROM xero_log_templates',
  );
  console.log(`Current template count: ${beforeResult.rows[0].count}`);

  for (const stmt of statements) {
    await client.query(stmt);
  }

  const afterResult = await client.query(
    'SELECT COUNT(*)::int AS count FROM xero_log_templates',
  );
  const newRows = afterResult.rows[0].count - beforeResult.rows[0].count;
  console.log(`Backfill complete: ${newRows} new templates inserted`);
  console.log(`Total templates now: ${afterResult.rows[0].count}`);

  const maxResult = await client.query(
    'SELECT MAX(id) AS max_id FROM xero_log_templates',
  );
  if (maxResult.rows[0].max_id) {
    await client.query(
      `SELECT setval('xero_log_templates_id_seq', $1, true)`,
      [maxResult.rows[0].max_id],
    );
    console.log(`Sequence reset to ${maxResult.rows[0].max_id}`);
  }

  await client.end();
  console.log('Done');
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
