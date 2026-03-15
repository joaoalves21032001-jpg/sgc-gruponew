import { Client } from 'pg';
import * as fs from 'fs';

const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const sql = fs.readFileSync('supabase/migrations/20260315050000_add_vinculo_emergencia.sql', 'utf8');
  console.log('Executando SQL...');
  await client.query(sql);
  
  console.log('Limpando cache do PostgREST...');
  await client.query(`NOTIFY pgrst, 'reload schema'`);
  
  console.log('Pronto!');
  await client.end();
}
run();
