const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const resSP = await client.query("SELECT * FROM security_profiles LIMIT 1");
  console.log('SP Columns:', Object.keys(resSP.rows[0] || {}));
  const resCargos = await client.query("SELECT * FROM cargos LIMIT 1");
  console.log('Cargos Columns:', Object.keys(resCargos.rows[0] || {}));
  await client.end();
}
run().catch(console.error);
