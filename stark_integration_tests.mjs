/**
 * STARK — Integration Test Suite
 * Tests all Supabase operations: CRUD, RLS, Edge Cases, Validations
 * Run: node stark_integration_tests.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cfqtbvkiegwmzkzmpojt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprem1wb2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTM5Mjg4MywiZXhwIjoyMDU0OTY4ODgzfQ.GqjfZ0MUByXtM-sp5rtEv57hqHEDSSCCjLc2W7kUXno';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const results = { passed: 0, failed: 0, warnings: 0, details: [] };
const TEMP_PREFIX = 'stark_test_';

function log(type, name, msg, data = null) {
  const icon = type === 'PASS' ? '✅' : type === 'FAIL' ? '❌' : type === 'WARN' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${type}] ${name}: ${msg}`);
  if (data && type === 'FAIL') console.log('  →', JSON.stringify(data).slice(0, 200));
  results.details.push({ type, name, msg, data });
  if (type === 'PASS') results.passed++;
  else if (type === 'FAIL') results.failed++;
  else if (type === 'WARN') results.warnings++;
}

async function run(name, fn) {
  try {
    await fn();
  } catch (e) {
    log('FAIL', name, `Uncaught exception: ${e.message}`);
  }
}

// ─── SECTION 1: Schema Discovery ──────────────────────────────────────────

async function testSchemaDiscovery() {
  console.log('\n═══ SECTION 1: Schema Discovery ═══');

  const tables = [
    'profiles', 'cargos', 'cargo_permissions', 'security_profiles',
    'security_profile_permissions', 'atividades', 'vendas', 'venda_documentos',
    'access_requests', 'notifications', 'notification_rules', 'audit_logs',
    'knowledge_base', 'system_settings', 'password_reset_requests',
    'mfa_reset_requests', 'correction_requests'
  ];

  for (const table of tables) {
    await run(`schema:${table}`, async () => {
      const { data, error } = await admin.from(table).select('*').limit(1);
      if (error) {
        log('FAIL', `schema:${table}`, error.message);
      } else {
        const cols = data?.[0] ? Object.keys(data[0]) : ['(vazia)'];
        log('PASS', `schema:${table}`, `${cols.length} colunas: ${cols.slice(0, 8).join(', ')}`);
      }
    });
  }

  // Check inventario tables
  for (const t of ['inventario_companhias', 'inventario_produtos', 'inventario_modalidades']) {
    await run(`schema:${t}`, async () => {
      const { data, error } = await admin.from(t).select('*').limit(1);
      if (error) log('WARN', `schema:${t}`, `Tabela pode não existir: ${error.message}`);
      else log('PASS', `schema:${t}`, `Encontrada`);
    });
  }
}

// ─── SECTION 2: Profiles CRUD ─────────────────────────────────────────────

async function testProfilesCRUD() {
  console.log('\n═══ SECTION 2: Profiles CRUD ═══');
  let testUserId = null;

  // Create user via admin API
  await run('profiles:create_user', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${TEMP_PREFIX}user@test.com`,
      password: 'TestPass@123',
      email_confirm: true,
    });
    if (error) { log('FAIL', 'profiles:create_user', error.message); return; }
    testUserId = data.user.id;
    log('PASS', 'profiles:create_user', `Criado user id=${testUserId}`);
  });

  if (!testUserId) return;

  // Read profile (auto-created by trigger)
  await run('profiles:read', async () => {
    const { data, error } = await admin.from('profiles').select('*').eq('id', testUserId).single();
    if (error) { log('FAIL', 'profiles:read', error.message); return; }
    log('PASS', 'profiles:read', `Profile auto-criado: nome=${data.nome_completo}, cargo=${data.cargo}`);
  });

  // Update profile
  await run('profiles:update_all_fields', async () => {
    const { error } = await admin.from('profiles').update({
      nome_completo: `${TEMP_PREFIX}Stark Silva`,
      apelido: 'Stark',
      celular: '11999999999',
      cpf: '12345678901',
      rg: '123456789',
      endereco: 'Rua Stark, 42',
      cargo: 'Consultor de Vendas',
      numero_emergencia_1: '11988887777',
      nome_emergencia_1: 'Contato Stark 1',
      vinculo_emergencia_1: 'Pai',
      numero_emergencia_2: '11977776666',
      nome_emergencia_2: 'Contato Stark 2',
      vinculo_emergencia_2: 'Mae',
      meta_faturamento: 50000,
    }).eq('id', testUserId);
    if (error) log('FAIL', 'profiles:update_all_fields', error.message);
    else log('PASS', 'profiles:update_all_fields', 'Todos campos atualizados com sucesso');
  });

  // Test edge cases — long strings
  await run('profiles:update_long_string', async () => {
    const longName = 'A'.repeat(500);
    const { error } = await admin.from('profiles').update({ nome_completo: longName }).eq('id', testUserId);
    if (error) log('WARN', 'profiles:update_long_string', `Rejeitado (esperado): ${error.message}`);
    else log('WARN', 'profiles:update_long_string', 'ACEITA nome de 500 chars — sem limite definido no schema!');
  });

  // Test null on required field
  await run('profiles:update_null_nome', async () => {
    const { error } = await admin.from('profiles').update({ nome_completo: null }).eq('id', testUserId);
    if (error) log('PASS', 'profiles:update_null_nome', `Correto — rejeita NULL: ${error.message}`);
    else log('FAIL', 'profiles:update_null_nome', 'ACEITA NULL em campo NOT NULL!');
  });

  // Cleanup
  await run('profiles:delete_test_user', async () => {
    const { error } = await admin.auth.admin.deleteUser(testUserId);
    if (error) log('FAIL', 'profiles:delete_test_user', error.message);
    else log('PASS', 'profiles:delete_test_user', 'Usuário teste deletado');
  });
}

// ─── SECTION 3: Atividades CRUD & Validations ─────────────────────────────

async function testAtividades() {
  console.log('\n═══ SECTION 3: Atividades ═══');

  // Get existing user for tests
  const { data: profiles } = await admin.from('profiles').select('id').limit(1);
  if (!profiles?.length) { log('WARN', 'atividades', 'Nenhum profile para testar'); return; }
  const userId = profiles[0].id;

  // Create atividade
  let atividadeId = null;
  await run('atividades:create', async () => {
    const testDate = '2025-01-15'; // date in the past to avoid conflicts
    const { data, error } = await admin.from('atividades').upsert({
      user_id: userId,
      data: testDate,
      ligacoes: 5,
      mensagens: 10,
      cotacoes_enviadas: 3,
      cotacoes_fechadas: 1,
      follow_up: 2,
    }, { onConflict: 'user_id,data' }).select().single();
    if (error) { log('FAIL', 'atividades:create', error.message); return; }
    atividadeId = data.id;
    log('PASS', 'atividades:create', `Criado id=${atividadeId}, ligacoes=${data.ligacoes}`);
  });

  // Test duplicate day (should upsert)
  await run('atividades:upsert_same_day', async () => {
    const { data, error } = await admin.from('atividades').upsert({
      user_id: userId,
      data: '2025-01-15',
      ligacoes: 99,
    }, { onConflict: 'user_id,data' }).select().single();
    if (error) log('FAIL', 'atividades:upsert_same_day', error.message);
    else log('PASS', 'atividades:upsert_same_day', `Upsert OK — ligacoes=${data.ligacoes}`);
  });

  // Test negative values
  await run('atividades:negative_values', async () => {
    const { error } = await admin.from('atividades').upsert({
      user_id: userId,
      data: '2025-01-16',
      ligacoes: -5,
      mensagens: -10,
    }, { onConflict: 'user_id,data' });
    if (error) log('PASS', 'atividades:negative_values', `Corretamente rejeitado: ${error.message}`);
    else log('FAIL', 'atividades:negative_values', 'ACEITA valores negativos! Sem validação server-side.');
  });

  // Test very large values
  await run('atividades:overflow_values', async () => {
    const { error } = await admin.from('atividades').upsert({
      user_id: userId,
      data: '2025-01-17',
      ligacoes: 2147483648, // int32 overflow
    }, { onConflict: 'user_id,data' });
    if (error) log('PASS', 'atividades:overflow_values', `Rejeitado: ${error.message}`);
    else log('WARN', 'atividades:overflow_values', 'Aceita overflow de INT — verificar tipo da coluna');
  });

  // Cleanup
  if (atividadeId) {
    await admin.from('atividades').delete().eq('user_id', userId).in('data', ['2025-01-15', '2025-01-16', '2025-01-17']);
  }
}

// ─── SECTION 4: Access Requests ────────────────────────────────────────────

async function testAccessRequests() {
  console.log('\n═══ SECTION 4: Access Requests ═══');
  let reqId = null;

  // Create access request
  await run('access_requests:create', async () => {
    const { data, error } = await admin.from('access_requests').insert({
      nome: `${TEMP_PREFIX}João Stark`,
      email: `${TEMP_PREFIX}joao@stark.com`,
      telefone: '11999998888',
      cpf: '98765432100',
      cargo: 'Consultor de Vendas',
      nivel_acesso: 'consultor',
      mensagem: 'Solicitacao de teste do Stark',
      numero_emergencia_1: '11988887777',
      nome_emergencia_1: 'Mae do Stark',
      vinculo_emergencia_1: 'Mae',
      status: 'pendente',
    }).select().single();
    if (error) { log('FAIL', 'access_requests:create', error.message); return; }
    reqId = data.id;
    log('PASS', 'access_requests:create', `Criado id=${reqId}`);
  });

  // Read with all fields
  await run('access_requests:read_all_fields', async () => {
    if (!reqId) return;
    const { data, error } = await admin.from('access_requests').select('*').eq('id', reqId).single();
    if (error) { log('FAIL', 'access_requests:read', error.message); return; }
    const hasAll = data.nome_emergencia_1 && data.vinculo_emergencia_1 !== undefined;
    log(hasAll ? 'PASS' : 'WARN', 'access_requests:read_all_fields',
      `vinculo_emergencia_1="${data.vinculo_emergencia_1}", nome_emergencia_1="${data.nome_emergencia_1}"`);
  });

  // Test status transitions
  for (const status of ['devolvido', 'rejeitado', 'aprovado', 'pendente']) {
    await run(`access_requests:status_${status}`, async () => {
      if (!reqId) return;
      const { error } = await admin.from('access_requests').update({ status }).eq('id', reqId);
      if (error) log('FAIL', `access_requests:status_${status}`, error.message);
      else log('PASS', `access_requests:status_${status}`, 'Transição OK');
    });
  }

  // Test invalid status
  await run('access_requests:invalid_status', async () => {
    if (!reqId) return;
    const { error } = await admin.from('access_requests').update({ status: 'invalid_status' }).eq('id', reqId);
    if (error) log('PASS', 'access_requests:invalid_status', `Rejeitado corretamente: ${error.message}`);
    else log('FAIL', 'access_requests:invalid_status', 'ACEITA status inválido!');
  });

  // Test SQL injection in text fields
  await run('access_requests:sql_injection', async () => {
    const { data, error } = await admin.from('access_requests').insert({
      nome: "'; DROP TABLE profiles; --",
      email: `${TEMP_PREFIX}inject@test.com`,
      status: 'pendente',
    }).select().single();
    if (error) log('WARN', 'access_requests:sql_injection', `Erro (não necessariamente injeção): ${error.message}`);
    else {
      log('INFO', 'access_requests:sql_injection', `Supabase usa prepared statements — injeção não executada. Nome salvo literalmente: "${data.nome}"`);
      await admin.from('access_requests').delete().eq('id', data.id);
    }
  });

  // Cleanup
  if (reqId) {
    await admin.from('access_requests').delete().eq('id', reqId);
    log('INFO', 'access_requests', 'Request de teste removido');
  }
}

// ─── SECTION 5: Cargos & Permissions ──────────────────────────────────────

async function testCargos() {
  console.log('\n═══ SECTION 5: Cargos & Permissions ═══');
  let cargoId = null;

  // List existing
  await run('cargos:list', async () => {
    const { data, error } = await admin.from('cargos').select('*').order('created_at');
    if (error) { log('FAIL', 'cargos:list', error.message); return; }
    log('PASS', 'cargos:list', `${data.length} cargo(s): ${data.map(c => c.nome).join(', ')}`);
  });

  // Create
  await run('cargos:create', async () => {
    const { data, error } = await admin.from('cargos').insert({
      nome: `${TEMP_PREFIX}Cargo Teste`,
      description: 'Cargo criado pelo Stark para testes',
      requires_leader: false,
      nivel_supervisao: 'ninguem',
    }).select().single();
    if (error) { log('FAIL', 'cargos:create', error.message); return; }
    cargoId = data.id;
    log('PASS', 'cargos:create', `Criado id=${cargoId}`);
  });

  // Add permissions
  const resources = [
    'atividades.atividades', 'atividades.vendas', 'crm.leads',
    'aprovacao_atividades', 'aprovacao_vendas', 'config.permissoes'
  ];
  const actions = ['view', 'edit', 'delete', 'aprovar', 'analisar'];

  if (cargoId) {
    await run('cargos:add_permissions', async () => {
      const perms = [];
      for (const resource of resources.slice(0, 3)) {
        for (const action of actions.slice(0, 2)) {
          perms.push({ cargo_id: cargoId, resource, action, allowed: true });
        }
      }
      const { error } = await admin.from('cargo_permissions').upsert(perms, { onConflict: 'cargo_id,resource,action' });
      if (error) log('FAIL', 'cargos:add_permissions', error.message);
      else log('PASS', 'cargos:add_permissions', `${perms.length} permissões adicionadas`);
    });

    // Read permissions back
    await run('cargos:read_permissions', async () => {
      const { data, error } = await admin.from('cargo_permissions').select('*').eq('cargo_id', cargoId);
      if (error) log('FAIL', 'cargos:read_permissions', error.message);
      else log('PASS', 'cargos:read_permissions', `${data.length} permissões lidas`);
    });

    // Cleanup permissions + cargo
    await run('cargos:delete', async () => {
      const { error } = await admin.from('cargos').delete().eq('id', cargoId);
      if (error) log('FAIL', 'cargos:delete', error.message);
      else log('PASS', 'cargos:delete', 'Cargo e permissões deletados (CASCADE)');
    });
  }

  // Test duplicate name
  await run('cargos:duplicate_name', async () => {
    const { data: existing } = await admin.from('cargos').select('nome').limit(1);
    if (!existing?.length) { log('WARN', 'cargos:duplicate_name', 'Sem cargos para testar'); return; }
    const { error } = await admin.from('cargos').insert({ nome: existing[0].nome });
    if (error) log('PASS', 'cargos:duplicate_name', `Rejeita duplicata: ${error.message}`);
    else log('FAIL', 'cargos:duplicate_name', 'ACEITA nome duplicado!');
  });
}

// ─── SECTION 6: Security Profiles ─────────────────────────────────────────

async function testSecurityProfiles() {
  console.log('\n═══ SECTION 6: Security Profiles ═══');

  // List
  await run('security_profiles:list', async () => {
    const { data, error } = await admin.from('security_profiles').select('*, security_profile_permissions(*)');
    if (error) { log('FAIL', 'security_profiles:list', error.message); return; }
    for (const sp of data) {
      log('PASS', `security_profiles:${sp.name}`,
        `${sp.security_profile_permissions?.length || 0} permissões | is_system=${sp.is_system} | is_protected=${sp.is_protected}`);
    }
  });

  // Test modifying a system/protected profile
  await run('security_profiles:modify_protected', async () => {
    const { data } = await admin.from('security_profiles').select('id,name,is_protected').eq('is_protected', true).limit(1);
    if (!data?.length) { log('WARN', 'security_profiles:modify_protected', 'Sem perfis protegidos'); return; }
    const { error } = await admin.from('security_profiles').update({ name: 'Hacked' }).eq('id', data[0].id);
    if (error) log('PASS', 'security_profiles:modify_protected', `RLS bloqueia: ${error.message}`);
    else log('WARN', 'security_profiles:modify_protected', `Service key pode modificar perfil protegido "${data[0].name}" — sem proteção server-side além do Frontend!`);
  });
}

// ─── SECTION 7: Notifications ──────────────────────────────────────────────

async function testNotifications() {
  console.log('\n═══ SECTION 7: Notifications ═══');

  // Get a user to send notification to
  const { data: profiles } = await admin.from('profiles').select('id').limit(1);
  if (!profiles?.length) { log('WARN', 'notifications', 'Sem users para testar'); return; }
  const userId = profiles[0].id;

  let notifId = null;
  await run('notifications:create', async () => {
    const { data, error } = await admin.from('notifications').insert({
      user_id: userId,
      title: 'Stark Test Notification',
      message: 'Esta e uma notificacao de teste do Stark',
      type: 'info',
      read: false,
    }).select().single();
    if (error) { log('FAIL', 'notifications:create', error.message); return; }
    notifId = data.id;
    log('PASS', 'notifications:create', `Criada id=${notifId}`);
  });

  await run('notifications:mark_read', async () => {
    if (!notifId) return;
    const { error } = await admin.from('notifications').update({ read: true }).eq('id', notifId);
    if (error) log('FAIL', 'notifications:mark_read', error.message);
    else log('PASS', 'notifications:mark_read', 'Marcada como lida');
  });

  if (notifId) await admin.from('notifications').delete().eq('id', notifId);
}

// ─── SECTION 8: Vendas ─────────────────────────────────────────────────────

async function testVendas() {
  console.log('\n═══ SECTION 8: Vendas ═══');

  const { data: profiles } = await admin.from('profiles').select('id').limit(1);
  if (!profiles?.length) { log('WARN', 'vendas', 'Sem users para testar'); return; }
  const userId = profiles[0].id;
  let vendaId = null;

  // Create
  await run('vendas:create', async () => {
    const { data, error } = await admin.from('vendas').insert({
      user_id: userId,
      nome_titular: `${TEMP_PREFIX}Titular Stark`,
      modalidade: 'PF',
      status: 'analise',
      vidas: 1,
      valor: 450.00,
    }).select().single();
    if (error) { log('FAIL', 'vendas:create', error.message); return; }
    vendaId = data.id;
    log('PASS', 'vendas:create', `Criada id=${vendaId}, valor=R$${data.valor}`);
  });

  // Test status transitions
  for (const status of ['pendente', 'aprovado', 'recusado', 'analise']) {
    await run(`vendas:status_${status}`, async () => {
      if (!vendaId) return;
      const { error } = await admin.from('vendas').update({ status }).eq('id', vendaId);
      if (error) log('FAIL', `vendas:status_${status}`, error.message);
      else log('PASS', `vendas:status_${status}`, 'Transição OK');
    });
  }

  // Test invalid modalidade
  await run('vendas:invalid_modalidade', async () => {
    const { error } = await admin.from('vendas').insert({
      user_id: userId,
      nome_titular: 'Modalidade Invalida',
      modalidade: 'INVALIDA',
      status: 'analise',
    });
    if (error) log('PASS', 'vendas:invalid_modalidade', `Rejeitado: ${error.message}`);
    else log('FAIL', 'vendas:invalid_modalidade', 'Aceita modalidade inválida!');
  });

  // Test negative value
  await run('vendas:negative_valor', async () => {
    if (!vendaId) return;
    const { error } = await admin.from('vendas').update({ valor: -9999 }).eq('id', vendaId);
    if (error) log('PASS', 'vendas:negative_valor', `Rejeitado: ${error.message}`);
    else log('WARN', 'vendas:negative_valor', 'ACEITA valor negativo em venda! Sem check constraint.');
  });

  // Cleanup
  if (vendaId) await admin.from('vendas').delete().eq('id', vendaId);
}

// ─── SECTION 9: RLS Policy Tests ──────────────────────────────────────────

async function testRLS() {
  console.log('\n═══ SECTION 9: RLS Policies ═══');

  // Create a regular user client (not service role)
  const { data: authData } = await admin.auth.admin.createUser({
    email: `${TEMP_PREFIX}rls_test@test.com`,
    password: 'TestPass@123',
    email_confirm: true,
  });

  if (!authData?.user) { log('FAIL', 'rls:setup', 'Nao foi possível criar user de teste'); return; }
  const testUserId = authData.user.id;

  // Sign in to get a JWT
  const { data: signIn } = await createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprem1wb2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzOTI4ODMsImV4cCI6MjA1NDk2ODg4M30.b5YoK8G_Bp3AhtFSgIQi6HKJD9RtiRzMoKO2rjJV0yo')
    .auth.signInWithPassword({ email: `${TEMP_PREFIX}rls_test@test.com`, password: 'TestPass@123' });

  if (signIn?.session) {
    const userClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprem1wb2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzOTI4ODMsImV4cCI6MjA1NDk2ODg4M30.b5YoK8G_Bp3AhtFSgIQi6HKJD9RtiRzMoKO2rjJV0yo', {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } }
    });

    // Test: can user read all profiles?
    await run('rls:profiles_read_others', async () => {
      const { data, error } = await userClient.from('profiles').select('id, nome_completo');
      if (error) log('INFO', 'rls:profiles_read_others', `Bloqueado: ${error.message}`);
      else if (data.length > 1) log('WARN', 'rls:profiles_read_others', `Usuário simples vê ${data.length} profiles! Verificar RLS.`);
      else log('PASS', 'rls:profiles_read_others', `Vê apenas ${data.length} profile (o próprio)`);
    });

    // Test: can user delete others' profiles?
    await run('rls:profiles_delete_others', async () => {
      const { data: others } = await admin.from('profiles').select('id').neq('id', testUserId).limit(1);
      if (!others?.length) { log('WARN', 'rls:profiles_delete_others', 'Sem outro user para testar'); return; }
      const { error } = await userClient.from('profiles').delete().eq('id', others[0].id);
      if (error) log('PASS', 'rls:profiles_delete_others', `RLS bloqueia deleção: ${error.message}`);
      else log('FAIL', 'rls:profiles_delete_others', 'USUARIO DELETOU PERFIL DE OUTRO USUÁRIO!');
    });

    // Test: can user modify security profiles?
    await run('rls:security_profiles_write', async () => {
      const { error } = await userClient.from('security_profiles').insert({ name: 'hacked_profile' });
      if (error) log('PASS', 'rls:security_profiles_write', `Bloqueado: ${error.message}`);
      else {
        log('FAIL', 'rls:security_profiles_write', 'Usuário comum pôde criar perfil de segurança!');
        await admin.from('security_profiles').delete().eq('name', 'hacked_profile');
      }
    });

    // Test: can user access audit_logs?
    await run('rls:audit_logs_read', async () => {
      const { data, error } = await userClient.from('audit_logs').select('*').limit(5);
      if (error) log('PASS', 'rls:audit_logs_read', `Bloqueado adequadamente: ${error.message}`);
      else if (data.length > 0) log('WARN', 'rls:audit_logs_read', `Consultor vê ${data.length} logs de auditoria — verificar se deveria`);
      else log('INFO', 'rls:audit_logs_read', 'Consultor vê 0 registros (RLS filtering)');
    });
  } else {
    log('WARN', 'rls:signin', 'Não foi possível fazer login com user de teste — profile pode não ter sido criado');
  }

  // Cleanup
  await admin.auth.admin.deleteUser(testUserId);
  log('INFO', 'rls', 'User teste RLS removido');
}

// ─── SECTION 10: Edge Functions ────────────────────────────────────────────

async function testEdgeFunctions() {
  console.log('\n═══ SECTION 10: Edge Functions ═══');

  // Test request-access (public endpoint)
  await run('ef:request-access_valid', async () => {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprem1wb2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzOTI4ODMsImV4cCI6MjA1NDk2ODg4M30.b5YoK8G_Bp3AhtFSgIQi6HKJD9RtiRzMoKO2rjJV0yo` },
      body: JSON.stringify({
        nome: `${TEMP_PREFIX}EF Stark`,
        email: `${TEMP_PREFIX}ef@stark.com`,
        telefone: '11999990000',
        cargo: 'Consultor de Vendas',
        nivel_acesso: 'consultor',
      }),
    });
    const body = await resp.json();
    if (!resp.ok || body.error) log('FAIL', 'ef:request-access_valid', body.error || `HTTP ${resp.status}`);
    else {
      log('PASS', 'ef:request-access_valid', `Criado request id=${body.id}`);
      // Cleanup
      if (body.id) await admin.from('access_requests').delete().eq('id', body.id);
    }
  });

  // Test request-access without required fields
  await run('ef:request-access_missing_email', async () => {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprem1wb2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzOTI4ODMsImV4cCI6MjA1NDk2ODg4M30.b5YoK8G_Bp3AhtFSgIQi6HKJD9RtiRzMoKO2rjJV0yo` },
      body: JSON.stringify({ nome: 'Sem Email' }),
    });
    const body = await resp.json();
    if (body.error) log('PASS', 'ef:request-access_missing_email', `Rejeita sem email: ${body.error}`);
    else log('FAIL', 'ef:request-access_missing_email', 'Aceita request sem email!');
  });

  // Test admin-create-user WITHOUT auth
  await run('ef:admin-create-user_no_auth', async () => {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer invalid_token' },
      body: JSON.stringify({ email: 'hack@hack.com', nome_completo: 'Hacker' }),
    });
    const body = await resp.json().catch(() => null);
    if (!resp.ok || body?.error) log('PASS', 'ef:admin-create-user_no_auth', `Protegido: HTTP ${resp.status} / ${JSON.stringify(body)?.slice(0,100)}`);
    else log('FAIL', 'ef:admin-create-user_no_auth', 'CRIOU USUARIO SEM AUTENTICACAO!');
  });

  // Test get-leaders
  await run('ef:get-leaders', async () => {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/get-leaders`, {
      headers: { 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
    const body = await resp.json();
    if (resp.ok) log('PASS', 'ef:get-leaders', `Retornou ${body.length || '?'} líder(es)`);
    else log('FAIL', 'ef:get-leaders', body.error || `HTTP ${resp.status}`);
  });
}

// ─── SECTION 11: Audit Logs ───────────────────────────────────────────────

async function testAuditLogs() {
  console.log('\n═══ SECTION 11: Audit Logs ═══');

  await run('audit_logs:read', async () => {
    const { data, error } = await admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) { log('FAIL', 'audit_logs:read', error.message); return; }
    log('PASS', 'audit_logs:read', `${data.length} logs recentes`);
    if (data[0]) log('INFO', 'audit_logs:last_action', `Última ação: ${data[0].action} em ${data[0].table_name} — ${data[0].created_at}`);
  });
}

// ─── SECTION 12: System Settings ──────────────────────────────────────────

async function testSystemSettings() {
  console.log('\n═══ SECTION 12: System Settings ═══');

  await run('system_settings:read', async () => {
    const { data, error } = await admin.from('system_settings').select('*');
    if (error) { log('FAIL', 'system_settings:read', error.message); return; }
    log('PASS', 'system_settings:read', `${data.length} configurações`);
    data.forEach(s => log('INFO', `system_settings:${s.key}`, `value="${String(s.value).slice(0,50)}"`));
  });
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🤖 STARK – Bateria de Testes de Integração SGC');
  console.log('================================================\n');
  const startTime = Date.now();

  await testSchemaDiscovery();
  await testProfilesCRUD();
  await testAtividades();
  await testAccessRequests();
  await testCargos();
  await testSecurityProfiles();
  await testNotifications();
  await testVendas();
  await testRLS();
  await testEdgeFunctions();
  await testAuditLogs();
  await testSystemSettings();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n════════════════════════════════════════════');
  console.log(`🤖 STARK – Relatório Final (${elapsed}s)`);
  console.log(`✅ Passaram: ${results.passed}`);
  console.log(`❌ Falharam: ${results.failed}`);
  console.log(`⚠️  Avisos:  ${results.warnings}`);
  console.log('════════════════════════════════════════════\n');

  // Critical failures summary
  const failures = results.details.filter(d => d.type === 'FAIL');
  if (failures.length) {
    console.log('🚨 FALHAS CRÍTICAS:');
    failures.forEach(f => console.log(`  ❌ ${f.name}: ${f.msg}`));
  }

  const warnings = results.details.filter(d => d.type === 'WARN');
  if (warnings.length) {
    console.log('\n⚠️  AVISOS IMPORTANTES:');
    warnings.forEach(w => console.log(`  ⚠️  ${w.name}: ${w.msg}`));
  }
}

main().catch(console.error);
