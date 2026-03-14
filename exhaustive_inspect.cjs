const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- INSPEÇÃO EXAUSTIVA ---');

  // 1. Perfil do admin no auth.users
  const resAdmin = await client.query("SELECT id, email FROM auth.users WHERE email = 'admin@sgc.com'");
  const adminId = resAdmin.rows[0].id;
  console.log('Admin Auth ID:', adminId);

  // 2. Perfil no public.profiles
  const resProfile = await client.query("SELECT * FROM public.profiles WHERE id = $1", [adminId]);
  console.log('Public Profile:', JSON.stringify(resProfile.rows[0], null, 2));

  const cargoId = resProfile.rows[0].cargo_id;
  const cargoText = resProfile.rows[0].cargo;

  // 3. Cargo
  const resCargo = await client.query("SELECT * FROM public.cargos WHERE id = $1", [cargoId]);
  console.log('Cargo Data:', JSON.stringify(resCargo.rows[0], null, 2));

  const spId = resCargo.rows[0]?.security_profile_id;

  // 4. Security Profile
  const resSP = await client.query("SELECT * FROM public.security_profiles WHERE id = $1", [spId]);
  console.log('Security Profile Data:', JSON.stringify(resSP.rows[0], null, 2));

  // 5. Permissões do Security Profile (allowed: false ou true)
  const resSPP = await client.query("SELECT resource, action, allowed FROM public.security_profile_permissions WHERE profile_id = $1 ORDER BY resource, action", [spId]);
  console.log('\n--- Permissões no Security Profile ---');
  resSPP.rows.forEach(r => {
      if (!r.allowed) console.log(`[DENIED] ${r.resource} (${r.action})`);
      else console.log(`[ALLOWED] ${r.resource} (${r.action})`);
  });

  // 6. Permissões do Cargo
  const resCP = await client.query("SELECT resource, action, allowed FROM public.cargo_permissions WHERE cargo_id = $1 ORDER BY resource, action", [cargoId]);
  console.log('\n--- Permissões no Cargo ---');
  resCP.rows.forEach(r => {
      if (!r.allowed) console.log(`[DENIED] ${r.resource} (${r.action})`);
      else console.log(`[ALLOWED] ${r.resource} (${r.action})`);
  });

  console.log('\n--- FIM ---');
  await client.end();
}

run().catch(console.error);
