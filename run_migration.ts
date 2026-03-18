import { Client } from 'pg';

// O host real do projeto cfqtbvkiegwmzkzmpojt é db.cfqtbvkiegwmzkzmpojt.supabase.co
const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function runSQL() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado. Executando...');
    const res = await client.query('ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_tipo_check;');
    console.log('Constraint removida! BUG-002 resolvido.', res.command);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

runSQL();
