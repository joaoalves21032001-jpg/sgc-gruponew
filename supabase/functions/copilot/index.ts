import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';

const openAiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const jsonBody = await req.json();
    const { message, historyContext = [], action, content, categoria } = jsonBody;

    if (!message && !historyContext.length && action !== 'embed_knowledge') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openAiKey) {
      return new Response(JSON.stringify({
        error: "OPENAI_API_KEY environment variable is not configured in Supabase."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Authenticate Request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cfqtbvkiegwmzkzmpojt.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Auth getUser error:", userError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabaseAdmin.from('profiles')
      .select('nome_completo, role, cargo, perfil_id, security_profile_id')
      .eq('id', user.id).single();

    // -- ADMIN ROUTE: Create new knowledge embedding --
    if (action === 'embed_knowledge') {
       if (!content || !categoria) {
          return new Response(JSON.stringify({ error: 'Conteúdo e categoria são obrigatórios' }), { status: 400, headers: corsHeaders });
       }
       const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: content, model: 'text-embedding-3-small' }),
       });
       const embeddingData = await embeddingResponse.json();
       const embeddingVector = embeddingData.data[0].embedding;
       const { data: inserted, error: insertError } = await supabaseAdmin.from('knowledge_base').insert({
          content, categoria, embedding: embeddingVector, created_by: user.id
       }).select();
       if (insertError) throw insertError;
       return new Response(JSON.stringify({ success: true, data: inserted }), { headers: corsHeaders });
    }

    // -- CHAT ROUTE: Standard RAG Copilot --

    // 2. Permissions & Tool Injection
    let allowedTools: any[] = [];
    const profileId = (profile as any)?.security_profile_id;
    const cargo = (profile as any)?.cargo || '';
    const isSuperAdmin = user?.email === 'admin@sgc.com';
    const isAdminWithNoProfile = !profileId && cargo.toLowerCase().includes('admin');
    let perms: any[] = [];

    // =================== TOOL DEFINITIONS ===================

    // --- Existing Tools ---
    const toolApproveAccess = {
       type: "function", function: {
          name: "aprovar_solicitacao_acesso",
          description: "Aprova uma solicitação de acesso pendente. Use quando o usuário pedir para aprovar o acesso de alguém.",
          parameters: { type: "object", properties: {
             solicitacao_id: { type: "string", description: "ID da solicitação a aprovar." }
          }, required: ["solicitacao_id"] }
       }
    };

    const toolCriarProduto = {
       type: "function", function: {
          name: "criar_produto",
          description: "Cria um novo produto no Inventário vinculado a uma companhia. Use quando pedido para criar produto.",
          parameters: { type: "object", properties: {
             nome: { type: "string", description: "Nome do produto." },
             companhia_id: { type: "string", description: "ID ou nome da companhia." }
          }, required: ["nome", "companhia_id"] }
       }
    };

    // --- Diretiva 2: Manutenção ---
    const toolLerLogs = {
       type: "function", function: {
          name: "ler_logs_sistema",
          description: "Lê os logs e registros de auditoria do sistema SGC. Use para investigar um bug, rastrear ações de usuários, ou analisar erros. Aceita filtros por módulo e período.",
          parameters: { type: "object", properties: {
             periodo: { type: "string", description: "Período para filtrar logs. Ex: 'hoje', 'ultimos_7_dias', 'ultimos_30_dias'. Padrão: 'ultimos_7_dias'." },
             modulo: { type: "string", description: "Módulo específico do sistema para filtrar. Ex: 'leads', 'produtos', 'usuarios'. Deixar vazio para todos." },
             limite: { type: "number", description: "Quantidade máxima de logs a retornar. Padrão: 20." }
          }, required: [] }
       }
    };

    const toolEnviarCorrecao = {
       type: "function", function: {
          name: "enviar_correcao_aprovacao_admin",
          description: "Envia uma proposta de correção de bug para revisão e aprovação do administrador principal. NUNCA aplique corrações diretamente — use sempre esta ferramenta. O admin receberá uma notificação para aprovar ou rejeitar.",
          parameters: { type: "object", properties: {
             descricao_bug: { type: "string", description: "Descrição detalhada do bug identificado e sua causa raiz." },
             codigo_correcao: { type: "string", description: "Código ou conjunto de instruções para corrigir o problema." },
             impacto_estimado: { type: "string", description: "Impacto esperado da correção: 'baixo', 'medio' ou 'alto'." }
          }, required: ["descricao_bug", "codigo_correcao", "impacto_estimado"] }
       }
    };

    // --- Diretiva 3: Aprendizado ---
    const toolConsultarBase = {
       type: "function", function: {
          name: "consultar_base_conhecimento",
          description: "Busca informações específicas na base de conhecimento interna do SGC. Use para verificar se uma regra de negócio ou procedimento já está documentado antes de responder.",
          parameters: { type: "object", properties: {
             termo: { type: "string", description: "Termo ou pergunta para buscar na base de conhecimento." }
          }, required: ["termo"] }
       }
    };

    const toolSolicitarEnsino = {
       type: "function", function: {
          name: "solicitar_ensino_admin",
          description: "Dispara uma notificação ao administrador indicando que o Stark encontrou uma lacuna de conhecimento. Use quando não souber a resposta para uma pergunta sobre o sistema e precisar que o admin ensine.",
          parameters: { type: "object", properties: {
             duvida_especifica: { type: "string", description: "Descrição exata da dúvida ou funcionalidade desconhecida." },
             contexto: { type: "string", description: "Contexto da conversa que originou a dúvida." }
          }, required: ["duvida_especifica"] }
       }
    };

    const toolSalvarAprendizado = {
       type: "function", function: {
          name: "salvar_novo_aprendizado",
          description: "Salva uma nova regra de negócio ou procedimento na base de conhecimento permanente. Use após receber uma instrução do administrador para registrá-la definitivamente.",
          parameters: { type: "object", properties: {
             categoria: { type: "string", description: "Categoria do aprendizado. Ex: 'regra_de_negocio', 'fluxo_de_tela', 'procedimento'." },
             regra: { type: "string", description: "Conteúdo completo da regra ou procedimento a ser salvo." }
          }, required: ["categoria", "regra"] }
       }
    };

    // --- Diretiva 4: Business Intelligence ---
    const toolMetricasConsultor = {
       type: "function", function: {
          name: "obter_metricas_consultor",
          description: "Obtém métricas de performance de um consultor: leads atendidos, atividades registradas, propostas e vendas. Use para analisar desempenho individual.",
          parameters: { type: "object", properties: {
             id_consultor: { type: "string", description: "ID ou nome do consultor. Deixar vazio para listar todos." },
             data_inicio: { type: "string", description: "Data início no formato YYYY-MM-DD. Padrão: 30 dias atrás." },
             data_fim: { type: "string", description: "Data fim no formato YYYY-MM-DD. Padrão: hoje." }
          }, required: [] }
       }
    };

    const toolPerfilLeads = {
       type: "function", function: {
          name: "obter_perfil_leads_convertidos",
          description: "Retorna o perfil dos leads que fecharam negócio (dados como tipo, modalidade, valor, origem). Use para identificar padrões de clientes e estructurar campanhas Lookalike.",
          parameters: { type: "object", properties: {
             quantidade: { type: "number", description: "Quantidade de conversões recentes a analisar. Padrão: 20." }
          }, required: [] }
       }
    };

    const toolGerarCampanha = {
       type: "function", function: {
          name: "gerar_draft_campanha_ads",
          description: "Cria e salva um rascunho de campanha de anúncios no módulo de marketing do SGC, com segmentação e texto sugeridos.",
          parameters: { type: "object", properties: {
             segmentacao_sugerida: { type: "string", description: "Descrição detalhada do público-alvo sugerido (idade, perfil, localização, interesses)." },
             copy: { type: "string", description: "Texto do anúncio proposto (headline + body copy)." }
          }, required: ["segmentacao_sugerida", "copy"] }
       }
    };

    // =================== PERMISSION MAPPING ===================
    const allSuperAdminTools = [
       toolApproveAccess, toolCriarProduto,
       toolLerLogs, toolEnviarCorrecao,
       toolConsultarBase, toolSolicitarEnsino, toolSalvarAprendizado,
       toolMetricasConsultor, toolPerfilLeads, toolGerarCampanha,
    ];

    if (isSuperAdmin || isAdminWithNoProfile) {
       allowedTools = allSuperAdminTools;
       perms = [{ resource: 'all', action: 'all', allowed: true }];
    } else if (profileId) {
       const { data: permsData } = await supabaseAdmin
          .from('security_profile_permissions')
          .select('resource, action, allowed')
          .eq('profile_id', profileId)
          .eq('allowed', true);
       perms = permsData ?? [];

       const can = (resource: string, act: string) => perms.some((p: any) => p.resource === resource && p.action === act);
       if (can('admin.solicitacoes', 'edit')) allowedTools.push(toolApproveAccess);
       if (can('inventario.produtos', 'edit')) allowedTools.push(toolCriarProduto);
       // Analytics tools available to consultants with view permission
       if (can('inventario.leads', 'view_own') || can('inventario.leads', 'view_all')) {
         allowedTools.push(toolConsultarBase, toolSolicitarEnsino);
       }
       if (can('inventario.leads', 'view_all')) {
         allowedTools.push(toolMetricasConsultor, toolPerfilLeads);
       }
    }

    console.log("=== STARK PERMISSIONS ===");
    console.log("User:", user?.email, "| superAdmin:", isSuperAdmin);
    console.log("Tools:", allowedTools.map((t: any) => t.function.name).join(', '));

    // 3. RAG Search
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: message || 'consulta geral', model: 'text-embedding-3-small' }),
    });
    const embeddingData = await embeddingResponse.json();
    let contextText = "";
    if (embeddingData.data?.[0]) {
      const { data: documents } = await supabaseAdmin.rpc('match_knowledge_base', {
        query_embedding: embeddingData.data[0].embedding,
        match_threshold: 0.2,
        match_count: 5
      });
      if (documents?.length > 0) {
        contextText = documents.map((doc: any) => `[${doc.categoria}] ${doc.content}`).join('\n\n');
      }
    }

    // 4. Build System Prompt
    const toolsList = allowedTools.length > 0
      ? allowedTools.map((t: any) => `- ${t.function.name}: ${t.function.description}`).join('\n')
      : '- Nenhuma ferramenta ativa.';

    const systemInstruction = `Você é STARK — a Inteligência Artificial central do SGC (Sistema de Gestão de Corretores). Você é o maior especialista neste sistema, com conhecimento de cada funcionalidade, banco de dados, regras de negócio e integrações. Sua postura é profissional, analítica e totalmente subordinada ao administrador principal (admin@sgc.com).

USUÁRIO ATUAL:
- Nome: ${profile?.nome_completo || 'Usuário'}
- Cargo: ${(profile as any)?.cargo || profile?.role || 'Não identificado'}
- Email: ${user?.email}

FERRAMENTAS DISPONÍVEIS:
${toolsList}

${allowedTools.length > 0
  ? `ATENÇÃO: Você TEM ferramentas ativas. Quando o pedido do usuário corresponder a uma ferramenta, CHAME-A IMEDIATAMENTE sem hesitar. Nunca diga "não tenho capacidade técnica" se a ferramenta existe.`
  : `Nenhuma ferramenta ativa para esta conta. Oriente o usuário a usar o menu do sistema.`}

DIRETIVAS OPERACIONAIS:
1. ESPECIALIDADE: Forneça explicações claras e técnicas sobre qualquer funcionalidade do SGC.
2. MANUTENCAO: Ao receber relato de bug, diagnostique a causa e use enviar_correcao_aprovacao_admin. NUNCA aplique correções direto em produção — sempre envie para aprovação do admin.
3. APRENDIZADO: Se não souber responder algo sobre o SGC, use solicitar_ensino_admin. Jamais invente ou alucine informações.
4. BUSINESS INTELLIGENCE: Use obter_metricas_consultor e obter_perfil_leads_convertidos para análises de performance. Apresente dados em tabelas quando possível. Emita pareceres diretos (Ex: "Desempenho abaixo da média").

COMUNICAÇÃO:
- Responda sempre em Português brasileiro
- Seja direto e conciso
- Use tabelas para dados comparativos
- Destaque ações que requerem aprovação do admin em CAIXA ALTA
- Sem asteriscos ou markdown excessivo

BASE DE CONHECIMENTO INTERNA:
${contextText || '(Nenhum contexto específico encontrado para esta consulta)'}`;

    let messages = [
      { role: 'system', content: systemInstruction },
      ...historyContext,
    ];
    if (message) messages.push({ role: 'user', content: message });

    // 5. AI Processing with Tool Loop
    async function processAITurn(messagesHistory: any[]): Promise<any> {
      const payload: any = {
        model: 'gpt-4o-mini',
        messages: messagesHistory,
        temperature: 0.2,
      };
      if (allowedTools.length > 0) {
        payload.tools = allowedTools;
        payload.tool_choice = "required";
      }

      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await chatResponse.json();
      const responseMessage = data.choices[0].message;

      if (!responseMessage.tool_calls) return responseMessage;

      messagesHistory.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result = "";

        try {
          // ---- Existing Tools ----
          if (functionName === "aprovar_solicitacao_acesso") {
            const { data: sol, error } = await supabaseAdmin.from('access_requests')
              .update({ status: 'approved' }).eq('id', args.solicitacao_id).select();
            result = error ? `Erro: ${error.message}` : (sol?.length ? "Solicitação aprovada com sucesso." : "Solicitação não encontrada.");

          } else if (functionName === "criar_produto") {
            let compId = args.companhia_id;
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRe.test(compId)) {
              const { data: comp } = await supabaseAdmin.from('companhias').select('id').ilike('nome', `%${compId}%`).limit(1);
              if (comp?.length) compId = comp[0].id;
              else { result = `Companhia "${args.companhia_id}" não encontrada.`; }
            }
            if (!result) {
              const { data: prod, error } = await supabaseAdmin.from('produtos').insert({ nome: args.nome, companhia_id: compId }).select();
              result = error ? `Erro: ${error.message}` : `Produto "${args.nome}" criado com sucesso. ID: ${prod?.[0]?.id}`;
            }

          // ---- Diretiva 2: Manutenção ----
          } else if (functionName === "ler_logs_sistema") {
            const limite = args.limite || 20;
            const periodo = args.periodo || 'ultimos_7_dias';
            let dataInicio = new Date();
            if (periodo === 'hoje') dataInicio.setHours(0,0,0,0);
            else if (periodo === 'ultimos_7_dias') dataInicio.setDate(dataInicio.getDate() - 7);
            else if (periodo === 'ultimos_30_dias') dataInicio.setDate(dataInicio.getDate() - 30);

            let query = supabaseAdmin.from('audit_logs')
              .select('created_at, action, resource_type, user_id, details')
              .gte('created_at', dataInicio.toISOString())
              .order('created_at', { ascending: false })
              .limit(limite);
            if (args.modulo) query = query.ilike('resource_type', `%${args.modulo}%`);

            const { data: logs, error } = await query;
            if (error) result = `Erro ao ler logs: ${error.message}`;
            else if (!logs?.length) result = "Nenhum log encontrado para o período/módulo especificado.";
            else result = `logs encontrados (${logs.length}):\n` + logs.map((l: any) =>
              `[${new Date(l.created_at).toLocaleString('pt-BR')}] ${l.action} | ${l.resource_type} | ${JSON.stringify(l.details || {})}`
            ).join('\n');

          } else if (functionName === "enviar_correcao_aprovacao_admin") {
            // Save correction request
            const { data: corr, error: corrErr } = await supabaseAdmin.from('correction_requests').insert({
              descricao: args.descricao_bug,
              solucao_proposta: args.codigo_correcao,
              impacto: args.impacto_estimado,
              status: 'pendente',
              criado_por: user.id,
            }).select();
            if (corrErr) { result = `Erro ao registrar correção: ${corrErr.message}`; }
            else {
              // Notify admin
              const { data: adminProfile } = await supabaseAdmin.from('profiles')
                .select('id').eq('role', 'Administrador').limit(1).single();
              if (adminProfile) {
                await supabaseAdmin.from('notifications').insert({
                  user_id: adminProfile.id,
                  titulo: `STARK — Correção Pendente: ${args.impacto_estimado.toUpperCase()}`,
                  mensagem: `Bug reportado: ${args.descricao_bug.substring(0, 200)}... Aguardando aprovação para aplicar correção.`,
                  tipo: 'alerta',
                  lida: false,
                });
              }
              result = `Correção enviada para aprovação do administrador com sucesso. ID: ${corr?.[0]?.id}. O admin receberá uma notificação para aprovar ou rejeitar.`;
            }

          // ---- Diretiva 3: Aprendizado ----
          } else if (functionName === "consultar_base_conhecimento") {
            const embRes = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ input: args.termo, model: 'text-embedding-3-small' }),
            });
            const embData = await embRes.json();
            const { data: docs } = await supabaseAdmin.rpc('match_knowledge_base', {
              query_embedding: embData.data[0].embedding,
              match_threshold: 0.3,
              match_count: 5
            });
            if (!docs?.length) result = `Nenhum resultado encontrado na base de conhecimento para "${args.termo}".`;
            else result = docs.map((d: any) => `[${d.categoria}] ${d.content}`).join('\n\n');

          } else if (functionName === "solicitar_ensino_admin") {
            const { data: adminProfile } = await supabaseAdmin.from('profiles')
              .select('id').eq('role', 'Administrador').limit(1).single();
            if (adminProfile) {
              await supabaseAdmin.from('notifications').insert({
                user_id: adminProfile.id,
                titulo: 'STARK — Lacuna de Conhecimento Detectada',
                mensagem: `Stark encontrou uma dúvida que não possui na base: "${args.duvida_especifica}". Contexto: ${args.contexto || 'Não fornecido'}. Por favor, forneça a resposta para que o Stark possa aprender.`,
                tipo: 'alerta',
                lida: false,
              });
            }
            result = `Notificação enviada ao administrador sobre a lacuna de conhecimento: "${args.duvida_especifica}". Aguardo as instruções do admin para registrar o aprendizado.`;

          } else if (functionName === "salvar_novo_aprendizado") {
            const embRes = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ input: args.regra, model: 'text-embedding-3-small' }),
            });
            const embData = await embRes.json();
            const { error: saveErr } = await supabaseAdmin.from('knowledge_base').insert({
              content: args.regra,
              categoria: args.categoria,
              embedding: embData.data[0].embedding,
              created_by: user.id,
            });
            result = saveErr ? `Erro ao salvar: ${saveErr.message}` : `Aprendizado salvo com sucesso na categoria "${args.categoria}". Este conhecimento será usado em respostas futuras.`;

          // ---- Diretiva 4: Business Intelligence ----
          } else if (functionName === "obter_metricas_consultor") {
            const dataFim = args.data_fim || new Date().toISOString().split('T')[0];
            const dataInicioDate = new Date();
            dataInicioDate.setDate(dataInicioDate.getDate() - 30);
            const dataInicio = args.data_inicio || dataInicioDate.toISOString().split('T')[0];

            let leadsQuery = supabaseAdmin.from('leads')
              .select('id, nome, stage_id, created_by, created_at, valor')
              .gte('created_at', dataInicio).lte('created_at', dataFim + 'T23:59:59');
            if (args.id_consultor) {
              const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidRe.test(args.id_consultor)) leadsQuery = leadsQuery.eq('created_by', args.id_consultor);
              else {
                const { data: pr } = await supabaseAdmin.from('profiles').select('id').ilike('nome_completo', `%${args.id_consultor}%`).limit(1);
                if (pr?.length) leadsQuery = leadsQuery.eq('created_by', pr[0].id);
              }
            }
            const { data: leads } = await leadsQuery;
            const { data: atividades } = await supabaseAdmin.from('audit_logs')
              .select('user_id, action').gte('created_at', dataInicio).lte('created_at', dataFim + 'T23:59:59');

            const leadsPorConsultor: Record<string, any> = {};
            leads?.forEach((l: any) => {
              if (!leadsPorConsultor[l.created_by]) leadsPorConsultor[l.created_by] = { leads: 0, valor_total: 0 };
              leadsPorConsultor[l.created_by].leads++;
              leadsPorConsultor[l.created_by].valor_total += l.valor || 0;
            });
            const { data: profiles } = await supabaseAdmin.from('profiles').select('id, nome_completo, apelido');
            const getName = (id: string) => profiles?.find((p: any) => p.id === id)?.apelido || profiles?.find((p: any) => p.id === id)?.nome_completo || id.substring(0, 8);

            const rows = Object.entries(leadsPorConsultor).map(([id, m]: any) => ({
              consultor: getName(id),
              leads: m.leads,
              valor_total: m.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              atividades: atividades?.filter((a: any) => a.user_id === id).length || 0,
            }));
            result = rows.length ? JSON.stringify(rows, null, 2) : "Nenhum dado encontrado para o período especificado.";

          } else if (functionName === "obter_perfil_leads_convertidos") {
            const qtd = args.quantidade || 20;
            const { data: leads } = await supabaseAdmin.from('leads')
              .select('nome, tipo, companhia_nome, produto, valor, quantidade_vidas, origem, created_at')
              .not('valor', 'is', null)
              .gt('valor', 0)
              .order('created_at', { ascending: false })
              .limit(qtd);
            if (!leads?.length) result = "Nenhum lead com valor registrado encontrado.";
            else {
              const summary = {
                total: leads.length,
                valor_medio: (leads.reduce((s: number, l: any) => s + (l.valor || 0), 0) / leads.length).toFixed(2),
                tipos: [...new Set(leads.map((l: any) => l.tipo))],
                companhias: [...new Set(leads.map((l: any) => l.companhia_nome).filter(Boolean))],
                produtos_top: [...new Set(leads.map((l: any) => l.produto).filter(Boolean))].slice(0, 5),
              };
              result = `Perfil de ${leads.length} leads convertidos:\n${JSON.stringify(summary, null, 2)}`;
            }

          } else if (functionName === "gerar_draft_campanha_ads") {
            const { data: draft, error: draftErr } = await supabaseAdmin.from('campaign_drafts').insert({
              segmentacao: args.segmentacao_sugerida,
              copy: args.copy,
              criado_por: user.id,
              status: 'pendente',
            }).select();
            result = draftErr ? `Erro ao salvar rascunho: ${draftErr.message}` : `Rascunho de campanha salvo com sucesso! ID: ${draft?.[0]?.id}. O draft está disponível no módulo de marketing para revisão do admin.`;

          } else {
            result = "Ferramenta não implementada internamente.";
          }
        } catch (e: any) {
          result = `Erro interno ao executar ${functionName}: ${e.message}`;
        }

        messagesHistory.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: result,
        });
      }

      return await processAITurn(messagesHistory);
    }

    const finalAiMessage = await processAITurn(messages);

    return new Response(JSON.stringify({ text: finalAiMessage.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
