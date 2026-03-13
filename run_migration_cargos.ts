import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function runSQL() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado ao Supabase. Executando migration...');
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260313140000_add_cargos_description.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Migration executada com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await client.end();
  }
}

runSQL();
