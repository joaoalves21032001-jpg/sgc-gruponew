import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  process.stdout.write('Conectado.\n');

  // Find the Gerente cargo id
  const { rows: cargos } = await client.query(`
    SELECT c.id, c.nome, COUNT(cp.id) as perm_count
    FROM public.cargos c
    LEFT JOIN public.cargo_permissions cp ON cp.cargo_id = c.id
    GROUP BY c.id, c.nome
    ORDER BY c.nome
  `);
  
  process.stdout.write('Cargos:\n');
  for (const c of cargos) {
    process.stdout.write(`  [${c.nome}] id=${c.id} perms=${c.perm_count}\n`);
  }

  const gerenteCargo = cargos.find(c => c.nome.toLowerCase().includes('gerente'));
  if (!gerenteCargo) {
    process.stdout.write('Cargo Gerente nao encontrado!\n');
    return;
  }
  
  if (parseInt(gerenteCargo.perm_count) > 0) {
    process.stdout.write(`Gerente ja tem ${gerenteCargo.perm_count} permissoes configuradas. Nenhuma acao necessaria.\n`);
    return;
  }

  process.stdout.write(`Inserindo permissoes padrao para [${gerenteCargo.nome}] (id=${gerenteCargo.id})...\n`);

  // Default Gerente permissions:
  // Can see: Atividades, Minhas Ações, CRM, Aprovações, Equipe
  // Cannot see: Configurações, Usuários admin, Logs de Auditoria, Painel de Gestão, Inventário
  const perms = [
    // Atividades (view + edit)
    { resource: 'atividades.atividades', action: 'view', allowed: true },
    { resource: 'atividades.atividades', action: 'edit', allowed: true },
    { resource: 'atividades.vendas', action: 'view', allowed: true },
    { resource: 'atividades.vendas', action: 'edit', allowed: true },
    // CRM
    { resource: 'crm.leads', action: 'view', allowed: true },
    { resource: 'crm.leads', action: 'edit', allowed: true },
    { resource: 'crm.leads', action: 'view_all', allowed: true },
    { resource: 'crm.leads', action: 'create', allowed: true },
    { resource: 'crm.leads', action: 'view_own', allowed: true },
    // Minhas Ações
    { resource: 'minhas_acoes.pendentes', action: 'view', allowed: true },
    { resource: 'minhas_acoes.aprovados', action: 'view', allowed: true },
    { resource: 'minhas_acoes.devolvidos', action: 'view', allowed: true },
    // Aprovações (pode analisar e aprovar atividades/vendas)
    { resource: 'aprovacao_atividades', action: 'analisar', allowed: true },
    { resource: 'aprovacao_atividades', action: 'aprovar', allowed: true },
    { resource: 'aprovacao_atividades', action: 'devolver', allowed: true },
    { resource: 'aprovacao_vendas', action: 'analisar', allowed: true },
    { resource: 'aprovacao_vendas', action: 'aprovar', allowed: true },
    { resource: 'aprovacao_vendas', action: 'devolver', allowed: true },
    // Equipe (view only)
    { resource: 'equipe', action: 'view', allowed: true },
    // NO access to: config.permissoes, config.cargos, config.usuarios, inventario, logs
  ];

  const values = perms.map((p, i) => 
    `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`
  ).join(', ');
  
  const params = perms.flatMap(p => [gerenteCargo.id, p.resource, p.action, p.allowed]);
  
  await client.query(`
    INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed)
    VALUES ${values}
    ON CONFLICT (cargo_id, resource, action) DO UPDATE SET allowed = EXCLUDED.allowed
  `, params);
  
  process.stdout.write(`✅ ${perms.length} permissoes inseridas para o cargo Gerente!\n`);
  process.stdout.write('Jose agora so verá: Atividades, CRM, Minhas Acoes, Aprovacoes, Equipe\n');
  process.stdout.write('Nao verá: Configuracoes, Usuarios, Logs de Auditoria, Inventario, Painel de Gestao\n');

} catch (e) {
  process.stdout.write('ERRO: ' + e.message + '\n');
  process.stdout.write(e.stack + '\n');
} finally {
  await client.end();
}
