const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- FINAL FIX: ALINHAMENTO DE CHAVES FRONT-BACK ---');

  const resAdmin = await client.query("SELECT id FROM auth.users WHERE email = 'admin@sgc.com'");
  if (resAdmin.rows.length === 0) {
    console.error('Admin user not found');
    await client.end();
    return;
  }
  const adminId = resAdmin.rows[0].id;

  // 1. Perfil de Segurança: Renomear para match exato com SUPER_ADMIN_PROFILE_NAME ('superadmin')
  const profileName = 'superadmin';
  let secProfileId;
  const resSP = await client.query("SELECT id FROM public.security_profiles WHERE name = $1", [profileName]);
  if (resSP.rows.length === 0) {
     const insertSP = await client.query("INSERT INTO public.security_profiles (name, description, is_system) VALUES ($1, 'Acesso Total - Sistema', true) RETURNING id", [profileName]);
     secProfileId = insertSP.rows[0].id;
  } else {
     secProfileId = resSP.rows[0].id;
  }

  // Chaves de recursos EXATAS do MODULES_DEF + prefixes do Sidebar
  // Note: Sidebar follows PAGE_TO_CARGO_PREFIX and PATH_TO_RESOURCE
  const macroResources = [
    'progresso', 'notificacoes', 'dashboard', 'logs_auditoria', 
    'atividades', 'minhas_acoes', 'crm', 'aprovacoes', 'inventario', 
    'equipe', 'configuracoes'
  ];

  const microResources = [
    // Sub-items for Cargo logic (which uses prefixes)
    'atividades.', 'atividades.atividades', 'atividades.vendas',
    'crm.', 'crm.leads', 'crm.clientes',
    'inventario.', 'inventario.companhias', 'inventario.produtos', 'inventario.modalidades', 'inventario.leads',
    'aprovacao', 'aprovacao_atividades', 'aprovacao_vendas', 'aprovacao_cotacoes', 'aprovacao_alteracoes',
    'aprovacao_admin_acesso', 'aprovacao_admin_mfa', 'aprovacao_admin_senha',
    'configuracoes', 'logs_auditoria', 'notificacoes', 
    'progresso', 'dashboard', 'minhas_acoes', 'equipe'
  ];

  console.log('Inserindo permissões no Security Profile:', profileName);
  for (const res of macroResources) {
      await client.query("INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'view', true) ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true", [secProfileId, res]);
      await client.query("INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'edit', true) ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true", [secProfileId, res]);
  }

  // 2. Cargo: Vinculado ao superadmin
  let cargoId;
  const cargoName = 'Administrador Mestre';
  const resCargo = await client.query("SELECT id FROM public.cargos WHERE nome = $1", [cargoName]);
  if (resCargo.rows.length === 0) {
      const insertCargo = await client.query("INSERT INTO public.cargos (nome, description, security_profile_id, is_protected) VALUES ($1, 'Cargo Mestre', $2, true) RETURNING id", [cargoName, secProfileId]);
      cargoId = insertCargo.rows[0].id;
  } else {
      cargoId = resCargo.rows[0].id;
      await client.query("UPDATE public.cargos SET security_profile_id = $1 WHERE id = $2", [secProfileId, cargoId]);
  }

  console.log('Inserindo permissões no Cargo (incluindo prefixos):', cargoName);
  for (const res of microResources) {
      await client.query("INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed) VALUES ($1, $2, 'view', true) ON CONFLICT (cargo_id, resource, action) DO UPDATE SET allowed = true", [cargoId, res]);
      await client.query("INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed) VALUES ($1, $2, 'edit', true) ON CONFLICT (cargo_id, resource, action) DO UPDATE SET allowed = true", [cargoId, res]);
  }

  // 3. Vincular Admin ao Cargo
  await client.query("UPDATE public.profiles SET cargo_id = $1, cargo = 'Administrador Mestre' WHERE id = $2", [cargoId, adminId]);

  console.log('--- ACESSO TOTAL CONFIGURADO COM SUCESSO ---');
  await client.end();
}

run().catch(console.error);
