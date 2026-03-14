const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  const resAdmin = await client.query("SELECT id FROM auth.users WHERE email = 'admin@sgc.com'");
  if (resAdmin.rows.length === 0) throw new Error('Admin not found');
  const adminId = resAdmin.rows[0].id;

  await client.query("INSERT INTO public.cargos (nome, description, requires_leader, is_protected) VALUES ('Administrador Mestre', 'Cargo Mestre com acesso total', false, true) ON CONFLICT (nome) DO UPDATE SET is_protected = true");
  
  const resCargo = await client.query("SELECT id FROM public.cargos WHERE nome = 'Administrador Mestre'");
  const cargoId = resCargo.rows[0].id;

  const resources = [
    'meu_progresso', 'notificacoes', 'dashboard', 'logs_auditoria', 
    'atividades', 'comercial.atividades', 'comercial.vendas', 
    'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 
    'crm.leads', 
    'aprovacoes.atividades', 'aprovacoes.vendas', 'aprovacoes.cotacoes', 'aprovacoes.alteracoes', 
    'aprovacoes.admin.acesso', 'aprovacoes.admin.mfa', 'aprovacoes.admin.senha', 
    'inventario.companhias', 'inventario.produtos', 'inventario.modalidades', 'inventario.leads', 
    'equipe', 'usuarios', 'configuracoes'
  ];

  for (const res of resources) {
    await client.query("INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed) VALUES ($1, $2, 'view', true) ON CONFLICT ON CONSTRAINT cargo_permissions_cargo_id_resource_action_key DO UPDATE SET allowed = true", [cargoId, res]);
    await client.query("INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed) VALUES ($1, $2, 'edit', true) ON CONFLICT ON CONSTRAINT cargo_permissions_cargo_id_resource_action_key DO UPDATE SET allowed = true", [cargoId, res]);
  }

  await client.query("UPDATE public.profiles SET cargo_id = $1 WHERE id = $2", [cargoId, adminId]);
  
  console.log('Cargo Administrador Mestre configurado e atribuído ao admin.');
  await client.end();
}

run().catch(console.error);
