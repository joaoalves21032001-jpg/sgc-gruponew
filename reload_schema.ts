import { Client } from 'pg';

const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function runSQL() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado. Executando NOTIFY pgrst...');
    const res = await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('Schema recarregado!', res);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

runSQL();
