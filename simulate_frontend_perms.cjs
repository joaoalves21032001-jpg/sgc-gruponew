const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- SIMULAÇÃO DE FETCH DE PERMISSÕES ---');

  // 1. Get Admin Profile
  const resProfile = await client.query("SELECT cargo_id FROM public.profiles WHERE email = 'admin@sgc.com' OR id IN (SELECT id FROM auth.users WHERE email = 'admin@sgc.com')");
  const cargoId = resProfile.rows[0]?.cargo_id;
  console.log('cargo_id:', cargoId);

  if (!cargoId) {
      console.error('ERRO: Admin sem cargo_id');
      await client.end();
      return;
  }

  // 2. Mock useMyPermissions logic
  // Fetch cargo to find security_profile_id
  const resCargo = await client.query("SELECT security_profile_id FROM public.cargos WHERE id = $1", [cargoId]);
  const profileId = resCargo.rows[0]?.security_profile_id;
  console.log('profile_id (from cargo):', profileId);

  if (!profileId) {
      console.error('ERRO: Cargo sem security_profile_id');
      await client.end();
      return;
  }

  // Fetch security_profile_permissions
  const resSP = await client.query("SELECT resource, action, allowed FROM public.security_profile_permissions WHERE profile_id = $1", [profileId]);
  console.log('Total SP Perms:', resSP.rows.length);

  // Fetch cargo_permissions
  const resCP = await client.query("SELECT resource, action, allowed FROM public.cargo_permissions WHERE cargo_id = $1", [cargoId]);
  console.log('Total Cargo Perms:', resCP.rows.length);

  // Merge logic
  const merged = resSP.rows.map(sp => {
      const cp = resCP.rows.find(c => c.resource === sp.resource && c.action === sp.action);
      const cargoAllowed = cp ? cp.allowed : true;
      return {
          resource: sp.resource,
          action: sp.action,
          allowed: sp.allowed && cargoAllowed
      };
  });

  console.log('Merged Perms (allowed: true):');
  const allowed = merged.filter(m => m.allowed);
  console.log(allowed.map(a => `${a.resource} (${a.action})`).join(', '));

  console.log('\n--- FIM ---');
  await client.end();
}

run().catch(console.error);
