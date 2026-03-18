// Script para habilitar REPLICA IDENTITY FULL e publicação realtime
// para a tabela password_reset_requests no Supabase.
const { Client } = require('pg');

const client = new Client({
  host: 'db.cfqtbvkiegwmzkzmpojt.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '19212527121973aA@',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados Supabase');

    // 1. Enable REPLICA IDENTITY FULL
    console.log('\n1. Habilitando REPLICA IDENTITY FULL...');
    await client.query('ALTER TABLE public.password_reset_requests REPLICA IDENTITY FULL');
    console.log('✓ REPLICA IDENTITY FULL habilitado');

    // 2. Add to supabase_realtime publication (if not already there)
    console.log('\n2. Adicionando à publicação supabase_realtime...');
    const check = await client.query(
      "SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'password_reset_requests'"
    );
    if (check.rows.length === 0) {
      await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests');
      console.log('✓ Tabela adicionada à publicação supabase_realtime');
    } else {
      console.log('✓ Tabela já estava na publicação supabase_realtime');
    }

    // 3. Verify
    const verify = await client.query(
      "SELECT tablename, pubname FROM pg_publication_tables WHERE tablename = 'password_reset_requests'"
    );
    console.log('\n3. Verificação final:', verify.rows);

    console.log('\n✅ Realtime configurado com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

run();
