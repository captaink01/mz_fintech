const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('[migrate] Applying schema...');
  await pool.query(sql);
  console.log('[migrate] Done. Tables ready: customers, accounts, transactions');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
