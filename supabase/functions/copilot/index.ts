import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';

const openAiKey = Deno.env.get('OPENAI_API_KEY');

// =================== TOOL DEFINITIONS (Ultra Minified payload) ===================
const toolApproveAccess = { type: "function", function: { name: "aprovar_solicitacao_acesso", description: "Aprova acesso.", parameters: { type: "object", properties: { solicitacao_id: { type: "string" } }, required: ["solicitacao_id"] } } };
const toolCriarProduto = { type: "function", function: { name: "criar_produto", description: "Cria produto no Inventário.", parameters: { type: "object", properties: { nome: { type: "string" }, companhia_id: { type: "string" } }, required: ["nome", "companhia_id"] } } };
const toolLerLogs = { type: "function", function: { name: "ler_logs_sistema", description: "Lê audit logs.", parameters: { type: "object", properties: { periodo: { type: "string" }, modulo: { type: "string" }, limite: { type: "number" } } } } };
const toolConsultarBase = { type: "function", function: { name: "consultar_base_conhecimento", description: "Busca na base de conhecimento.", parameters: { type: "object", properties: { termo: { type: "string" } }, required: ["termo"] } } };
const toolMetricasConsultor = { type: "function", function: { name: "obter_metricas_consultor", description: "Métricas de consultor.", parameters: { type: "object", properties: { id_consultor: { type: "string" }, data_inicio: { type: "string" }, data_fim: { type: "string" } } } } };

const allSuperAdminTools = [
   toolApproveAccess, toolCriarProduto, toolLerLogs, toolConsultarBase, toolMetricasConsultor
];

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

    // =================== PERMISSION MAPPING ===================

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
         allowedTools.push(toolConsultarBase);
       }
       if (can('inventario.leads', 'view_all')) {
         allowedTools.push(toolMetricasConsultor);
       }
    }

    console.log("=== STARK PERMISSIONS ===");
    console.log("User:", user?.email, "| superAdmin:", isSuperAdmin);
    console.log("Tools:", allowedTools.map((t: any) => t.function.name).join(', '));

    // 3. RAG Search (Temp disabled to fix 546 Timeout/Memory error)
    /*
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
    */
    let contextText = "";

    // 4. Build System Prompt
    const hasTools = allowedTools.length > 0;
    const toolsList = hasTools
      ? allowedTools.map((t: any) => `- ${t.function.name}: ${t.function.description}`).join('\n')
      : '- Nenhum utilitario.';

    const systemInstruction = `Vç é STARK. Especialista SGC.
Usuário: ${profile?.nome_completo||'User'} (${user?.email})
Acesso: ${(profile as any)?.cargo||'N/A'}

Ferramentas:
${toolsList}

REGRAS:
1. Responda em Português.
2. CHAME a ferramenta imediatamente se pedido, NUNCA diga que não consegue/pode. Use a ferramenta!
3. Seja conciso. Sem markdown inútil.
4. Manutenção: envie pra aprovação do admin.
5. Base de conhecimento: use para aprender e buscar respostas.

Contexto RAG:
${contextText || 'Nenhum'}`;

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
        payload.tool_choice = "auto";
      }

      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await chatResponse.json();
      if (!data.choices || !data.choices[0]) throw new Error("A IA não retornou uma resposta válida");
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
            // Simplified UUID check
            if (!compId.includes('-')) {
              const { data: comp } = await supabaseAdmin.from('companhias').select('id').ilike('nome', `%${compId}%`).limit(1);
              if (comp?.length) compId = comp[0].id;
              else result = `Companhia não encontrada.`;
            }
            if (!result) {
              const { data: prod, error } = await supabaseAdmin.from('produtos').insert({ nome: args.nome, companhia_id: compId }).select();
              result = error ? `Erro: ${error.message}` : `PRD criado: ${prod?.[0]?.id}`;
            }

          } else if (functionName === "ler_logs_sistema") {
            const dataInicio = new Date();
            dataInicio.setDate(dataInicio.getDate() - (args.periodo === 'ultimos_30_dias' ? 30 : 7));
            let query = supabaseAdmin.from('audit_logs').select('created_at, action, resource_type, user_id').gte('created_at', dataInicio.toISOString()).order('created_at', { ascending: false }).limit(args.limite || 10);
            if (args.modulo) query = query.ilike('resource_type', `%${args.modulo}%`);
            const { data: logs, error } = await query;
            result = error ? `Erro: ${error.message}` : (logs?.length ? JSON.stringify(logs) : "Nenhum log.");

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
            const embRes = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: args.termo, model: 'text-embedding-3-small' }) });
            const { data: docs } = await supabaseAdmin.rpc('match_knowledge_base', { query_embedding: (await embRes.json()).data[0].embedding, match_threshold: 0.3, match_count: 3 });
            result = !docs?.length ? `Nenhum resultado.` : docs.map((d: any) => `[${d.categoria}] ${d.content}`).join('\n');
          } else if (functionName === "solicitar_ensino_admin") {
            const { data: admin } = await supabaseAdmin.from('profiles').select('id').eq('role', 'Administrador').limit(1).single();
            if (admin) await supabaseAdmin.from('notifications').insert({ user_id: admin.id, titulo: 'STARK — Ensino Pendente', mensagem: args.duvida_especifica, tipo: 'alerta' });
            result = `Notificado o admin para ensinar: ${args.duvida_especifica}`;
          } else if (functionName === "salvar_novo_aprendizado") {
            const embRes = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: args.regra, model: 'text-embedding-3-small' }) });
            await supabaseAdmin.from('knowledge_base').insert({ content: args.regra, categoria: args.categoria, embedding: (await embRes.json()).data[0].embedding, created_by: user.id });
            result = `Aprendizado salvo: ${args.categoria}`;

          // ---- Diretiva 4: Business Intelligence ----
          } else if (functionName === "obter_metricas_consultor") {
            const df = args.data_fim || new Date().toISOString().split('T')[0];
            const diDate = new Date(); diDate.setDate(diDate.getDate() - 30);
            const di = args.data_inicio || diDate.toISOString().split('T')[0];
            let q = supabaseAdmin.from('leads').select('created_by, valor').gte('created_at', di).lte('created_at', df + 'T23:59:59');
            if (args.id_consultor && args.id_consultor.includes('-')) q = q.eq('created_by', args.id_consultor);
            const { data: leads } = await q;
            result = leads?.length ? `Total de leads no perido: ${leads.length}. (Simplificado por limites de memoria)` : "Sem leads.";
          } else if (functionName === "obter_perfil_leads_convertidos") {
            const { data: leads } = await supabaseAdmin.from('leads').select('tipo, valor').not('valor', 'is', null).gt('valor', 0).order('created_at', { ascending: false }).limit(args.quantidade || 10);
            result = leads?.length ? `Convertidos: ${JSON.stringify(leads)}` : "Sem conversões.";

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
    console.error("FATAL ERROR IN COPILOT:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
