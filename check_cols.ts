import { Client } from 'pg';
const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='access_requests';`);
  res.rows.forEach(r => console.log(r.column_name));
  await client.end();
}
run();
