const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- INSPEÇÃO DETALHADA DE CHAVES ---');

  const resAdmin = await client.query("SELECT id FROM auth.users WHERE email = 'admin@sgc.com'");
  const adminId = resAdmin.rows[0].id;

  const resProfile = await client.query("SELECT * FROM public.profiles WHERE id = $1", [adminId]);
  const profile = resProfile.rows[0];
  console.log('Perfil Admin:', {
      cargo_id: profile.cargo_id,
      cargo_text: profile.cargo,
      disabled: profile.disabled,
      atividades_desabilitadas: profile.atividades_desabilitadas,
      progresso_desabilitado: profile.progresso_desabilitado,
      acoes_desabilitadas: profile.acoes_desabilitadas
  });

  const cargoId = profile.cargo_id;
  if (cargoId) {
    const resCargo = await client.query("SELECT * FROM public.cargos WHERE id = $1", [cargoId]);
    console.log('Cargo:', resCargo.rows[0]);
    
    const spId = resCargo.rows[0].security_profile_id;
    if (spId) {
      const resPerms = await client.query("SELECT resource, action, allowed FROM public.security_profile_permissions WHERE profile_id = $1 ORDER BY resource", [spId]);
      console.log('Permissões do Profile (primeiras 20):');
      console.table(resPerms.rows.slice(0, 20));

      const resourceNames = resPerms.rows.map(r => r.resource);
      
      // Chaves críticas que o Sidebar procura:
      const criticalKeys = ['progresso', 'atividades', 'minhas_acoes', 'crm', 'notificacoes', 'aprovacoes', 'dashboard', 'inventario', 'equipe', 'configuracoes', 'logs_auditoria'];
      
      console.log('--- Verificação de Chaves Críticas ---');
      criticalKeys.forEach(key => {
          const hasView = resPerms.rows.some(p => p.resource === key && p.action === 'view' && p.allowed);
          console.log(`Chave '${key}': ${hasView ? 'VIEW ALLOWED' : 'DENIED/NOT FOUND'}`);
      });
    }
  }

  console.log('--- FIM DA INSPEÇÃO ---');
  await client.end();
}

run().catch(console.error);
