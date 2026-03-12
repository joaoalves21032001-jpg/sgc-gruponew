
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../copilot/cors.ts';

const openAiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cfqtbvkiegwmzkzmpojt.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ADMIN_EMAIL = 'admin@sgc.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user if auth header provided (manual trigger)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
      if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    if (!openAiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500, headers: corsHeaders });

    console.log('Stark: Starting full system analysis...');
    const results: Record<string, string> = {};
    const starkQuestions: string[] = [];

    // ═══════════════════════════════════════════
    // DISCOVER SCHEMA — detect new tables/features
    // ═══════════════════════════════════════════
    const { data: tables } = await supabaseAdmin
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .not('table_name', 'like', 'pg_%');

    const knownTables = ['profiles', 'user_roles', 'leads', 'vendas', 'atividades', 'notifications',
      'knowledge_base', 'system_errors', 'access_requests', 'perfis_seguranca', 'permissoes',
      'cotacoes', 'companhias', 'produtos', 'modalidades', 'lead_stages', 'audit_logs',
      'notification_rules', 'mfa_reset_requests', 'venda_documentos'];
    const discoveredNewTables = (tables as any[])?.filter(t => !knownTables.includes(t.table_name)).map(t => t.table_name) || [];

    if (discoveredNewTables.length > 0) {
      starkQuestions.push(`Identifiquei ${discoveredNewTables.length} novas tabela(s) no banco de dados que não conheço: ${discoveredNewTables.join(', ')}. Poderia me explicar para que servem e qual o fluxo dessas funcionalidades?`);
    }

    // ═══════════════════════════════════════════
    // 1. LEADS — Complete demographic profile
    // ═══════════════════════════════════════════
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('tipo, endereco, idade, peso, altura, livre, origem, produto, quantidade_vidas, companhia_nome, valor, plano_anterior, created_at');

    const { data: cotacoes } = await supabaseAdmin
      .from('cotacoes')
      .select('companhia_nome, produto_nome, modalidade, quantidade_vidas, com_dental, co_participacao, status, created_at');

    const totalLeads = leads?.length || 0;
    const leadsWithAge = leads?.filter((l: any) => l.idade) || [];
    const avgAge = leadsWithAge.length ? Math.round(leadsWithAge.reduce((s: number, l: any) => s + l.idade, 0) / leadsWithAge.length) : 0;

    const ageBuckets: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56-65': 0, '65+': 0 };
    leadsWithAge.forEach((l: any) => {
      const a = l.idade;
      if (a <= 25) ageBuckets['18-25']++; else if (a <= 35) ageBuckets['26-35']++;
      else if (a <= 45) ageBuckets['36-45']++; else if (a <= 55) ageBuckets['46-55']++;
      else if (a <= 65) ageBuckets['56-65']++; else ageBuckets['65+']++;
    });

    const freq = (arr: any[], key: string) => arr.reduce((acc: any, item: any) => { if (item[key]) acc[item[key]] = (acc[item[key]] || 0) + 1; return acc; }, {});
    const origens = freq(leads || [], 'origem');
    const companhias = freq(leads || [], 'companhia_nome');
    const produtos = freq(leads || [], 'produto');
    const coParticipacoes = freq(cotacoes || [], 'co_participacao');

    const leadsComValor = leads?.filter((l: any) => l.valor > 0) || [];
    const avgValor = leadsComValor.length ? (leadsComValor.reduce((s: number, l: any) => s + l.valor, 0) / leadsComValor.length).toFixed(2) : 0;
    const avgVidas = totalLeads ? ((leads || []).reduce((s: number, l: any) => s + (l.quantidade_vidas || 1), 0) / totalLeads).toFixed(1) : 0;

    const leadsContext = `TOTAL: ${totalLeads} | Pessoa Física: ${leads?.filter((l: any) => l.tipo === 'pessoa_fisica').length || 0} | Empresa: ${leads?.filter((l: any) => l.tipo === 'empresa').length || 0}
Idade média: ${avgAge} | Distribuição: ${JSON.stringify(ageBuckets)}
Origens: ${JSON.stringify(origens)} | Companhias: ${JSON.stringify(companhias)} | Produtos: ${JSON.stringify(produtos)}
Ticket médio: R$ ${avgValor} | Média de vidas: ${avgVidas}
Com plano anterior (migração): ${leads?.filter((l: any) => l.plano_anterior).length || 0}
Co-participação preferida: ${JSON.stringify(coParticipacoes)} | Total cotações: ${cotacoes?.length || 0}`;

    results['insight_leads'] = await gpt(openAiKey, 'Leads e Perfil para Campanhas Digitais', leadsContext,
      `Gere um relatório de inteligência de marketing com:
1. Perfil demográfico ideal por companhia/produto
2. Análise dos melhores canais de origem
3. Estratégia Facebook/Instagram Ads (faixa etária, interesses, comportamentos, localização)
4. Estratégia Google Ads (palavras-chave, intenção de busca)
5. Oportunidades não exploradas baseadas nesses dados
6. Produtos de maior potencial de conversão
Inclua dados concretos e recomendações acionáveis.`);

    // ═══════════════════════════════════════════
    // 2. VENDAS — Sales performance
    // ═══════════════════════════════════════════
    const { data: vendas } = await supabaseAdmin
      .from('vendas')
      .select('modalidade, status, valor, vidas, created_at, data_lancamento');

    const aprovadas = vendas?.filter((v: any) => v.status === 'aprovada') || [];
    const ticketVendas = aprovadas.length ? (aprovadas.reduce((s: number, v: any) => s + (v.valor || 0), 0) / aprovadas.length).toFixed(2) : 0;
    const modalidades = vendas?.reduce((acc: any, v: any) => {
      if (!acc[v.modalidade]) acc[v.modalidade] = { total: 0, aprovadas: 0, recusadas: 0 };
      acc[v.modalidade].total++;
      if (v.status === 'aprovada') acc[v.modalidade].aprovadas++;
      if (v.status === 'recusada') acc[v.modalidade].recusadas++;
      return acc;
    }, {});

    const vendasContext = `Total vendas: ${vendas?.length || 0} | Aprovadas: ${aprovadas.length} | Taxa: ${vendas?.length ? Math.round(aprovadas.length / vendas.length * 100) : 0}%
Ticket médio: R$ ${ticketVendas} | Por modalidade: ${JSON.stringify(modalidades)}`;

    results['insight_vendas'] = await gpt(openAiKey, 'Performance de Vendas', vendasContext,
      `Analise os dados de vendas e gere insights sobre modalidades campeãs, taxa de rejeição, ticket médio e recomendações para aumentar conversão. Responda em Português.`);

    // ═══════════════════════════════════════════
    // 3. PERFORMANCE CONSULTORES — Minhas Ações + metas
    // ═══════════════════════════════════════════
    const { data: atividades } = await supabaseAdmin.from('atividades')
      .select('user_id, ligacoes, mensagens, cotacoes_enviadas, cotacoes_fechadas, follow_up, cotacoes_nao_respondidas, data');
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, nome_completo, cargo, role');

    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const recente = atividades?.filter((a: any) => new Date(a.data) >= thirtyAgo) || [];
    const userStats: any = {};
    recente.forEach((a: any) => {
      if (!userStats[a.user_id]) userStats[a.user_id] = { lig: 0, msg: 0, cot_env: 0, cot_fech: 0, followup: 0, sem_resp: 0 };
      userStats[a.user_id].lig += a.ligacoes || 0;
      userStats[a.user_id].msg += a.mensagens || 0;
      userStats[a.user_id].cot_env += a.cotacoes_enviadas || 0;
      userStats[a.user_id].cot_fech += a.cotacoes_fechadas || 0;
      userStats[a.user_id].followup += a.follow_up || 0;
      userStats[a.user_id].sem_resp += a.cotacoes_nao_respondidas || 0;
    });
    const uids = Object.keys(userStats);
    const teamAvg = uids.length ? {
      ligacoes: Math.round(uids.reduce((s, id) => s + userStats[id].lig, 0) / uids.length),
      mensagens: Math.round(uids.reduce((s, id) => s + userStats[id].msg, 0) / uids.length),
      cotacoes: Math.round(uids.reduce((s, id) => s + userStats[id].cot_env, 0) / uids.length),
    } : {};
    const consultores = uids.map(uid => {
      const p = profiles?.find((x: any) => x.id === uid) as any;
      return { nome: p?.nome_completo || uid.substring(0, 8), cargo: p?.cargo || p?.role, ...userStats[uid], taxa: userStats[uid].cot_env > 0 ? `${Math.round(userStats[uid].cot_fech / userStats[uid].cot_env * 100)}%` : '0%' };
    });

    results['insight_performance'] = await gpt(openAiKey, 'Performance Individual dos Consultores (Últimos 30 dias)', `Média equipe: ${JSON.stringify(teamAvg)}\nConsultores: ${JSON.stringify(consultores)}`,
      `Crie um ranking de performance, identifique GAPS específicos por consultor (ex: "Pedro tem 40% menos ligações que a média"), destaque quem está performando bem e dê recomendações de melhoria individuais. Aponte consultores com alto índice de cotações sem resposta. Responda em Português.`);

    // ═══════════════════════════════════════════
    // 4. APROVAÇÕES — Fluxos de aprovação
    // ═══════════════════════════════════════════
    const { data: accessReqs } = await supabaseAdmin.from('access_requests').select('status, cargo, created_at, updated_at').limit(200);
    const { data: mfaResets } = await supabaseAdmin.from('mfa_reset_requests' as any).select('status, created_at').limit(100).catch(() => ({ data: [] }));

    const aprovStatus = freq(accessReqs || [], 'status');
    const avgAprovTime = accessReqs?.filter((r: any) => r.updated_at && r.status !== 'pending').length ?
      Math.round(accessReqs.filter((r: any) => r.updated_at && r.status !== 'pending')
        .reduce((s: number, r: any) => s + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3600000, 0) /
        accessReqs.filter((r: any) => r.status !== 'pending').length) : 0;

    const aprovContext = `Solicitações de acesso: ${JSON.stringify(aprovStatus)} | Tempo médio aprovação: ${avgAprovTime}h
Resets MFA: ${(mfaResets as any[])?.length || 0}`;

    results['insight_aprovacoes'] = await gpt(openAiKey, 'Fluxo de Aprovações', aprovContext,
      `Analise o fluxo de aprovações: tempo médio, gargalos, pendências acumuladas. Dê recomendações para agilizar o processo. Responda em Português.`);

    // ═══════════════════════════════════════════
    // 5. ERROS & BUGS DO SISTEMA — Stark Watchdog
    // ═══════════════════════════════════════════
    const { data: sysErrors } = await supabaseAdmin.from('system_errors' as any)
      .select('source, error_message, status, created_at, ai_analysis').order('created_at', { ascending: false }).limit(50);

    const errStats = { total: (sysErrors as any[])?.length || 0, resolved: (sysErrors as any[])?.filter((e: any) => e.status === 'resolved').length || 0, unresolved: (sysErrors as any[])?.filter((e: any) => e.status === 'unresolved').length || 0 };
    const errBySrc = freq(sysErrors || [], 'source');
    const recentErrors = (sysErrors as any[])?.slice(0, 5).map((e: any) => `[${e.source}] ${e.error_message}`) || [];

    results['insight_bugs'] = await gpt(openAiKey, 'Saúde do Sistema e Erros', `Estatísticas: ${JSON.stringify(errStats)}\nPor fonte: ${JSON.stringify(errBySrc)}\nErros mais recentes: ${recentErrors.join('\n')}`,
      `Como especialista em engenharia de software, analise a saúde do sistema SGC com base nos erros. Identifique padrões, componentes problemáticos recorrentes, e dê recomendações de correção. Cite os erros mais críticos. Responda em Português.`);

    // ═══════════════════════════════════════════
    // 6. CONFIGURAÇÕES DO SISTEMA
    // ═══════════════════════════════════════════
    const { data: secProfiles } = await supabaseAdmin.from('perfis_seguranca' as any).select('nome, descricao').limit(20);
    const { data: notifRules } = await supabaseAdmin.from('notification_rules' as any).select('event_key, enabled, audiences').limit(50);
    const { data: companhiasData } = await supabaseAdmin.from('companhias').select('nome, meta_titulo').limit(20);

    const configContext = `Perfis de Segurança cadastrados: ${(secProfiles as any[])?.map((p: any) => p.nome).join(', ') || 'Nenhum'}
Regras de notificação: ${(notifRules as any[])?.filter((r: any) => r.enabled).length || 0} ativas de ${(notifRules as any[])?.length || 0} total
Companhias/Seguradoras: ${(companhiasData as any[])?.map((c: any) => `${c.nome} (meta: ${c.meta_titulo})`).join(', ') || 'Nenhuma'}
Novas tabelas detectadas: ${discoveredNewTables.length > 0 ? discoveredNewTables.join(', ') : 'Nenhuma'}`;

    results['insight_configuracoes'] = await gpt(openAiKey, 'Configurações e Estrutura do Sistema', configContext,
      `Com base na configuração do sistema SGC, gere uma leitura estratégica:
1. Estrutura de permissões e se parece bem configurada para o porte da equipe
2. Configurações de notificação — se as regras ativas parecem suficientes
3. Seguradoras cadastradas — oportunidades de negócio baseadas nos cadastros
4. Novas funcionalidades detectadas (se houver) e o que podem significar para o sistema
Responda em Português com tom consultivo.`);

    // ═══════════════════════════════════════════
    // 7. CAMPANHAS — Cruzamento de todos os dados
    // ═══════════════════════════════════════════
    results['insight_campanhas'] = await gpt(openAiKey, 'Estratégia de Campanhas Digitais', `${leadsContext}\n${vendasContext}`,
      `Com base nos dados REAIS de leads e vendas, crie um plano de campanha completo:
1. Facebook/Instagram Ads: público-alvo detalhado (idade, interesses, comportamentos, localização, tipo de campanha)
2. Google Ads: palavras-chave de alta intenção e mensagem dos anúncios
3. Tom e criativo: o que comunicar para atrair o perfil que mais converte
4. Segmentação negativa: públicos a excluir para evitar desperdício
5. Distribuição de orçamento sugerida por canal
Seja específico e tático como um especialista em mídia paga. Responda em Português.`);

    // ═══════════════════════════════════════════
    // SALVAR TODOS OS INSIGHTS NA KNOWLEDGE BASE
    // ═══════════════════════════════════════════
    const labels: Record<string, string> = {
      insight_leads: 'Análise de Leads e Perfil de Cliente',
      insight_vendas: 'Performance de Vendas',
      insight_performance: 'Performance Individual dos Consultores',
      insight_aprovacoes: 'Fluxo de Aprovações',
      insight_bugs: 'Saúde do Sistema e Bugs',
      insight_configuracoes: 'Configurações e Estrutura do Sistema',
      insight_campanhas: 'Estratégia de Campanhas Digitais',
    };

    for (const [cat, content] of Object.entries(results)) {
      await supabaseAdmin.from('knowledge_base').delete().eq('categoria', cat);
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: content, model: 'text-embedding-3-small' }),
      });
      const embData = await embRes.json();
      const embedding = embData.data?.[0]?.embedding;
      const payload: any = {
        content: `[AUTO-ATUALIZADO: ${new Date().toLocaleDateString('pt-BR')}]\n**${labels[cat]}**\n\n${content}`,
        categoria: cat,
      };
      if (embedding) payload.embedding = embedding;
      await supabaseAdmin.from('knowledge_base').insert(payload);
    }

    // ═══════════════════════════════════════════
    // NOTIFICAR ADMIN SE STARK TEM PERGUNTAS
    // ═══════════════════════════════════════════
    if (starkQuestions.length > 0) {
      const adminProfile = await supabaseAdmin.from('profiles').select('id').eq('email', ADMIN_EMAIL).single().catch(() => null) as any;
      const adminUser = await supabaseAdmin.from('profiles').select('id').eq('role', 'administrador').limit(1).single().catch(() => null) as any;
      const adminId = adminProfile?.data?.id || adminUser?.data?.id;

      if (adminId) {
        for (const question of starkQuestions) {
          await supabaseAdmin.from('notifications').insert({
            user_id: adminId,
            titulo: '🤖 Stark tem uma pergunta para você',
            descricao: question,
            tipo: 'info',
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      categorias_atualizadas: Object.keys(results),
      perguntas_do_stark: starkQuestions.length,
      message: `Análise completa! ${Object.keys(results).length} módulos analisados${starkQuestions.length > 0 ? ` — Stark enviou ${starkQuestions.length} pergunta(s) para o admin.` : '.'}`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Stark analysis error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

async function gpt(apiKey: string, domain: string, data: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `Você é o Stark, IA especialista em análise de negócios e engenharia do SGC. Analise os dados de ${domain} e gere insights estratégicos e práticos.` },
        { role: 'user', content: `DADOS DO SISTEMA:\n${data}\n\n${prompt}` },
      ],
      temperature: 0.3,
    }),
  });
  const result = await res.json();
  return result.choices?.[0]?.message?.content || 'Não foi possível gerar o insight.';
}
