const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- VERIFICAÇÃO DE RLS E POLÍTICAS ---');

  const tables = [
    'profiles', 
    'cargos', 
    'cargo_permissions', 
    'security_profiles', 
    'security_profile_permissions'
  ];

  for (const table of tables) {
    console.log(`\nTabela: public.${table}`);
    
    // Check if RLS is enabled
    const resRLS = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = $1
    `, [table]);
    
    console.log(`RLS Ativo: ${resRLS.rows[0].relrowsecurity}`);

    // Check policies
    const resPolicies = await client.query(`
      SELECT policyname, roles, cmd, qual 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = $1
    `, [table]);
    
    if (resPolicies.rows.length === 0) {
      console.log('Nenhuma política encontrada.');
    } else {
      resPolicies.rows.forEach(p => {
        console.log(`- Política: ${p.policyname} | Roles: ${p.roles} | Cmd: ${p.cmd}`);
        console.log(`  Qual: ${p.qual}`);
      });
    }

    // Check grants
    const resGrants = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [table]);
    console.log('Grants:');
    resGrants.rows.forEach(g => {
        console.log(`  ${g.grantee}: ${g.privilege_type}`);
    });
  }

  console.log('\n--- FIM ---');
  await client.end();
}

run().catch(console.error);
