const { Client } = require('pg');

const dbClient = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

const RESOURCES = [
  { key: 'progresso',      actions: ['view'] },
  { key: 'notificacoes',   actions: ['view'] },
  { key: 'dashboard',      actions: ['view'] },
  { key: 'logs_auditoria', actions: ['view'] },
  { key: 'atividades',     actions: ['view', 'edit'] },
  { key: 'minhas_acoes',   actions: ['view', 'edit'] },
  { key: 'crm',            actions: ['view', 'edit'] },
  { key: 'aprovacoes',     actions: ['view', 'edit'] },
  { key: 'inventario',     actions: ['view', 'edit'] },
  { key: 'equipe',         actions: ['view', 'edit'] },
  { key: 'usuarios',       actions: ['view', 'edit'] },
  { key: 'configuracoes',  actions: ['view', 'edit'] }
];

async function run() {
  try {
    console.log('Conectando ao banco de dados...');
    await dbClient.connect();

    // 1. Super Admin profile ID
    const spRes = await dbClient.query(`SELECT id FROM security_profiles WHERE name = 'Super Admin' LIMIT 1`);
    const spId = spRes.rows[0]?.id;
    console.log('Super Admin Profile ID:', spId || 'NAO ENCONTRADO');

    // 2. Administrador Mestre cargo ID
    const cargoRes = await dbClient.query(`SELECT id FROM cargos WHERE nome = 'Administrador Mestre' LIMIT 1`);
    const cargoId = cargoRes.rows[0]?.id;
    console.log('Administrador Mestre Cargo ID:', cargoId || 'NAO ENCONTRADO');

    if (spId) {
      console.log('\nInjetando todas permissoes no perfil Super Admin...');
      for (const res of RESOURCES) {
        for (const action of res.actions) {
          await dbClient.query(
            `INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true`,
            [spId, res.key, action]
          );
        }
      }
      console.log(`✅ ${RESOURCES.reduce((s, r) => s + r.actions.length, 0)} permissoes aplicadas ao Super Admin.`);
    }

    if (cargoId) {
      console.log('\nInjetando todas permissoes no cargo Administrador Mestre...');
      for (const res of RESOURCES) {
        for (const action of res.actions) {
          await dbClient.query(
            `INSERT INTO cargo_permissions (cargo_id, resource, action, allowed)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (cargo_id, resource, action) DO UPDATE SET allowed = true`,
            [cargoId, res.key, action]
          );
        }
      }
      console.log(`✅ ${RESOURCES.reduce((s, r) => s + r.actions.length, 0)} permissoes aplicadas ao Administrador Mestre.`);
    }

    console.log('\n🎉 Concluido! Atualize a pagina para ver o efeito.');

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await dbClient.end();
  }
}

run();
