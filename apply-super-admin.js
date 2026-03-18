const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  const resAdmin = await client.query("SELECT id FROM auth.users WHERE email = 'admin@sgc.com'");
  if (resAdmin.rows.length === 0) throw new Error('Admin not found');
  const adminId = resAdmin.rows[0].id;

  // Create or get 'Super Admin' Security Profile
  let secProfileId;
  const resSecProfile = await client.query("SELECT id FROM public.security_profiles WHERE nome = 'Super Admin'");
  if (resSecProfile.rows.length === 0) {
    const insertSec = await client.query("INSERT INTO public.security_profiles (nome, descricao, role_level) VALUES ('Super Admin', 'Acesso irrestrito ao sistema', 100) RETURNING id");
    secProfileId = insertSec.rows[0].id;
  } else {
    secProfileId = resSecProfile.rows[0].id;
  }

  const resources = [
    'meu_progresso', 'notificacoes', 'dashboard', 'logs_auditoria', 
    'atividades', 'comercial.atividades', 'comercial.vendas', 
    'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 
    'crm.leads', 
    'aprovacoes.atividades', 'aprovacoes.vendas', 'aprovacoes.cotacoes', 'aprovacoes.alteracoes', 
    'aprovacoes.admin.acesso', 'aprovacoes.admin.mfa', 'aprovacoes.admin.senha', 
    'inventario.companhias', 'inventario.produtos', 'inventario.modalidades', 'inventario.leads', 
    'equipe', 'usuarios', 'configuracoes', 'configuracoes.cargos', 'configuracoes.perfis_seguranca',
    'configuracoes.mfa', 'configuracoes.senhas', 'ferramentas.gerador_leads', 'landing_pages'
  ];

  // Grant all permissions to this Security Profile
  for (const res of resources) {
    await client.query("INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'view', true) ON CONFLICT ON CONSTRAINT security_profile_permissions_profile_id_resource_action_key DO UPDATE SET allowed = true", [secProfileId, res]).catch(e => {
        // If constraint is diff, just catch and ignore or handle. The constraint name is usually profile_id_resource_action_key. 
        // Oh wait, postgres 15+ "ON CONFLICT (profile_id, resource, action) DO UPDATE..." 
    });
  }
  // Try safer postgres upsert without hard constraint name:
  for (const res of resources) {
    try {
        await client.query("INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'view', true) ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true", [secProfileId, res]);
        await client.query("INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'edit', true) ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true", [secProfileId, res]);
    } catch (e) {
        console.error('Error on security_profile_permissions upsert for', res, e.message);
    }
  }

  // Create or get 'Administrador Mestre' Cargo
  let cargoId;
  const resCargo = await client.query("SELECT id FROM public.cargos WHERE nome = 'Administrador Mestre'");
  if (resCargo.rows.length === 0) {
    const insertCargo = await client.query("INSERT INTO public.cargos (nome, description, requires_leader, is_protected, security_profile_id) VALUES ('Administrador Mestre', 'Cargo Mestre com acesso total', false, true, $1) RETURNING id", [secProfileId]);
    cargoId = insertCargo.rows[0].id;
  } else {
    cargoId = resCargo.rows[0].id;
    await client.query("UPDATE public.cargos SET security_profile_id = $1 WHERE id = $2", [secProfileId, cargoId]);
  }

  // Grant all permissions to this Cargo directly too
  for (const res of resources) {
    try {
        await client.query("INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed) VALUES ($1, $2, 'view', true) ON CONFLICT (cargo_id, resource, action) DO UPDATE SET allowed = true", [cargoId, res]);
        await client.query("INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed) VALUES ($1, $2, 'edit', true) ON CONFLICT (cargo_id, resource, action) DO UPDATE SET allowed = true", [cargoId, res]);
    } catch (e) {
        console.error('Error on cargo_permissions upsert for', res, e.message);
    }
  }

  // Update User's Profile
  await client.query("UPDATE public.profiles SET cargo_id = $1, cargo = 'Administrador Mestre', perfil = 'Super Admin' WHERE id = $2", [cargoId, adminId]);
  
  console.log('Admin access fully granted to admin@sgc.com!');
  await client.end();
}

run().catch(console.error);
