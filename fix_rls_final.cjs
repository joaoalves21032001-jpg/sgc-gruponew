const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- APLICANDO FIX DE RLS NAS TABELAS DE SEGURANÇA ---');

  const tables = [
    'cargos',
    'cargo_permissions',
    'security_profiles',
    'security_profile_permissions'
  ];

  for (const table of tables) {
    console.log(`Fixing table: public.${table}`);
    
    // 1. Grant SELECT to authenticated and anon
    await client.query(`GRANT SELECT ON public.${table} TO authenticated, anon;`);
    
    // 2. Enable RLS (just in case)
    await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);

    // 3. Drop existing "allow select" policy if it exists to avoid conflicts
    const policyName = `allow_select_${table}`;
    await client.query(`DROP POLICY IF EXISTS ${policyName} ON public.${table};`);

    // 4. Create policy to allow SELECT for all authenticated users
    // For these specific tables, reading is generally safe as they are configuration metadata.
    await client.query(`
      CREATE POLICY ${policyName} ON public.${table}
      FOR SELECT
      TO authenticated, anon
      USING (true);
    `);
    
    console.log(`- Policy ${policyName} applied (USING true).`);
  }

  console.log('\n--- VERIFICANDO GRANT NA TABELA PROFILES ---');
  await client.query('GRANT SELECT ON public.profiles TO authenticated, anon;');
  
  // Ensure "Administrador Mestre" exists and is linked
  console.log('--- RE-VERIFICANDO VÍNCULO DO ADMIN ---');
  const resAdmin = await client.query("SELECT id FROM auth.users WHERE email = 'admin@sgc.com'");
  if (resAdmin.rows.length > 0) {
      const adminId = resAdmin.rows[0].id;
      const resCargo = await client.query("SELECT id FROM public.cargos WHERE nome = 'Administrador Mestre'");
      if (resCargo.rows.length > 0) {
          const cargoId = resCargo.rows[0].id;
          await client.query("UPDATE public.profiles SET cargo_id = $1, cargo = 'Administrador Mestre' WHERE id = $2", [cargoId, adminId]);
          console.log('Vínculo do admin atualizado/confirmado.');
      }
  }

  console.log('\n--- FIX DE RLS CONCLUÍDO ---');
  await client.end();
}

run().catch(console.error);
