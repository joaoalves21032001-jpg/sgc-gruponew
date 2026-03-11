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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    // Create Supabase Client with User Auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Attempt to get user profile details for personalized answers
    const { data: profile } = await supabase.from('profiles').select('nome_completo, role, perfil_id').eq('id', user.id).single();

    // -- ADMIN ROUTE: Create new knowledge embedding --
    if (action === 'embed_knowledge') {
       if (profile?.role !== 'administrador' && profile?.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Apenas administradores podem treinar a IA' }), { status: 403, headers: corsHeaders });
       }
       
       if (!content || !categoria) {
          return new Response(JSON.stringify({ error: 'Conteúdo e categoria são obrigatórios' }), { status: 400, headers: corsHeaders });
       }

       // 1. Generate text embedding
       const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: content, model: 'text-embedding-3-small' }),
       });
       const embeddingData = await embeddingResponse.json();
       const embeddingVector = embeddingData.data[0].embedding;

       // 2. Insert into knowledge_base
       const { data: inserted, error: insertError } = await supabase.from('knowledge_base').insert({
          content,
          categoria,
          embedding: embeddingVector,
          created_by: user.id
       }).select();

       if (insertError) throw insertError;
       return new Response(JSON.stringify({ success: true, data: inserted }), { headers: corsHeaders });
    }

    // -- CHAT ROUTE: Standard RAG Copilot --

    // 2. Fetch User Permissions to dynamically build AI Tools
    let allowedTools: any[] = [];
    if (profile?.perfil_id) {
       const { data: perms } = await supabase.from('permissoes').select('recurso, acoes').eq('perfil_id', profile.perfil_id);
       if (perms) {
         // Example Tool Definition based on permissions
         // If user is allowed to "edit" solicitacoes, the AI can approve accesses
         const canApproveAccess = perms.some(p => p.recurso === 'admin.solicitacoes' && p.acoes.includes('edit'));
         
         if (canApproveAccess) {
             allowedTools.push({
                type: "function",
                function: {
                   name: "aprovar_solicitacao_acesso",
                   description: "Aprova uma solicitação de acesso pendente para um usuário entrar na plataforma SGC. Use esta ferramenta quando o usuário pedir expressamente para aprovar o acesso de alguém.",
                   parameters: {
                      type: "object",
                      properties: {
                         solicitacao_id: { type: "string", description: "O ID da solicitação a ser aprovada. Se o usuário informar apenas o nome, você deve extrair o ID." }
                      },
                      required: ["solicitacao_id"],
                   }
                }
             });
         }
       }
    }

    // 3. Generate Embedding from user question to perform RAG search
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: message,
        model: 'text-embedding-3-small',
      }),
    });

    const embeddingData = await embeddingResponse.json();
    let contextText = "";

    if (embeddingData.data && embeddingData.data[0]) {
      const embedding = embeddingData.data[0].embedding;
      
      // We perform standard similarity search using match_knowledge_base
      // Assuming threshold 0.2 and limit 5 texts
      const { data: documents } = await supabase.rpc('match_knowledge_base', {
        query_embedding: embedding,
        match_threshold: 0.2, // allows matches even if slightly varied words
        match_count: 5
      });

      if (documents && documents.length > 0) {
        contextText = documents.map((doc: any) => `-- Categoria: ${doc.categoria} --\n${doc.content}`).join('\n\n');
      }
    }

    // 4. Assemble Prompt & Call Chat Completions
    const systemInstruction = `
Você é a inteligência artificial "Stark" do SGC (Sistema de Gestão de Corretores), especialista e onisciente nesta plataforma.
Seu papel é responder dúvidas de negócios e EXECUTAR AÇÕES solicitadas, utilizando as ferramentas disponíveis.

Informação do Usuário atual:
- Nome: ${profile?.nome_completo || 'Usuário'}
- Nível de Acesso (Cargo): ${profile?.role || 'Não identificado'}

Instruções críticas:
1. Responda perguntas relacionadas ao uso da plataforma SGC.
2. Seja proativo: se o usuário pedir para aprovar uma solicitação, NÃO explique como ele pode fazer: USE A FERRAMENTA 'aprovar_solicitacao_acesso' fornecida para você para realizar a ação a favor dele. 
3. Se você não tem as ferramentas ativas, informe educadamente que o usuário atual (${profile?.nome_completo}) não possui o nível de permissão adequado no sistema para que você execute esta ação.
4. Responda em Português (BR) com um tom elegante, natural e colaborativo e use markdown. 

=== CONTEXTO DE CONHECIMENTO CADASTRADO ===
${contextText || "(Nenhum contexto RAG encontrado. Converse naturalmente)."}
===========================================
`;

    let messages = [
      { role: 'system', content: systemInstruction },
      ...historyContext
    ];
    if (message) messages.push({ role: 'user', content: message });

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
      const responseMessage = data.choices[0].message;

      // Se a IA decidiu usar uma ferramenta
      if (responseMessage.tool_calls) {
         messagesHistory.push(responseMessage); // anexar a resposta de "preciso chamar tool"
         
         for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            let toolResultContent = "";

            if (functionName === "aprovar_solicitacao_acesso") {
               try {
                  // Executa no Deno: Aprovar a solicitação usando as mesmas credenciais RLS!
                  const { data: sol, error: solError } = await supabase.from('access_requests').update({ status: 'approved' }).eq('id', functionArgs.solicitacao_id).select();
                  if (solError) toolResultContent = "Erro do banco de dados ao aprovar: " + solError.message;
                  else if (sol && sol.length > 0) toolResultContent = "Sucesso! Solicitação aprovada.";
                  else toolResultContent = "Solicitação não encontrada ou erro de permissão RLS do usuário logado.";
               } catch (e: any) {
                  toolResultContent = "Erro fatal na func: " + e.message;
               }
            } else {
               toolResultContent = "Função não encontrada ou não implementada internamente.";
            }

            // Anexa a resposta da Tool de volta para o Chat History
            messagesHistory.push({
               tool_call_id: toolCall.id,
               role: "tool",
               name: functionName,
               content: toolResultContent,
            });
         }
         
         // Chama recursivamente com os Tool Results para a IA gerar a mensagem final (ex: "Acabei de aprovar o carlos pra vc!")
         return await processAITurn(messagesHistory);
      } 
      
      // Resposta normal em texto
      return responseMessage;
    }

    // Start Chat Cycle
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
