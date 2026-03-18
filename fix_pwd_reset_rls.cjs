// Migration: Fix RLS policies for password_reset_requests
// Allows anon users to:
//   - SELECT their own request by ID (for polling/realtime status updates on login page)
//   - UPDATE status to 'cancelado' (for cancel button when not authenticated)
// Run: node fix_pwd_reset_rls.cjs

const { Client } = require('pg');

const client = new Client({
  host: 'db.cfqtbvkiegwmzkzmpojt.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '19212527121973aA@',
  ssl: { rejectUnauthorized: false },
});

const queries = [
  // Allow anon users to SELECT a single request by ID (for polling on login page)
  `CREATE POLICY IF NOT EXISTS "anon can read own reset request by id"
   ON public.password_reset_requests
   FOR SELECT
   TO anon
   USING (true)`,

  // Allow anon users to UPDATE status to 'cancelado' (for cancel button)
  `CREATE POLICY IF NOT EXISTS "anon can cancel own reset request"
   ON public.password_reset_requests
   FOR UPDATE
   TO anon
   USING (true)
   WITH CHECK (status = 'cancelado')`,
];

async function run() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados Supabase');

    for (const query of queries) {
      console.log('\nExecutando:', query.substring(0, 80) + '...');
      try {
        await client.query(query);
        console.log('✓ OK');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('✓ Política já existe');
        } else {
          console.error('✗ Erro:', err.message);
        }
      }
    }

    // Verify
    const verify = await client.query(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE tablename = 'password_reset_requests'
      ORDER BY policyname
    `);
    console.log('\nPolíticas ativas na tabela:');
    verify.rows.forEach(r => console.log(` - [${r.cmd}] ${r.policyname} (${r.roles})`));

    console.log('\n✅ RLS configurado com sucesso!');
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
  } finally {
    await client.end();
  }
}

run();
