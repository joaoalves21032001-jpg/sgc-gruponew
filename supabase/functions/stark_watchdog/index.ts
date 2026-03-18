import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../copilot/cors.ts';

const openAiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
// We use the Service Role key here because this is a background admin job
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Fetch up to 5 unresolved errors from the system_errors table
    const { data: errors, error: fetchError } = await supabase
      .from('system_errors')
      .select('*')
      .eq('status', 'unresolved')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) throw fetchError;

    if (!errors || errors.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum erro pendente para análise' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openAiKey) throw new Error("OPENAI_API_KEY environment variable is not configured.");

    let processedCount = 0;

    // 2. Loop through errors and analyze them with GPT-4o
    for (const sysError of errors) {
      
      const systemPrompt = `
Você é Stark, a IA Gestora Autônoma de Infraestrutura do SGC (Sistema de Gestão de Corretores).
Sua missão final é garantir a resiliência e a estabilidade da plataforma.

Um novo erro / exceção foi capturado na plataforma.
Seu objetivo é analisar o log de erro fornecido abaixo, descobrir a (provável) causa raiz do problema e criar um plano de ação CLARO E DIRETO (em Português) de como o desenvolvedor ou você mesmo no futuro pode consertá-lo.
Não divague. Retorne um JSON estrito no seguinte formato:
{
  "diagnosis": "Explicação técnica de porque ocorreu o erro (em 1-2 frases max)",
  "recommendation": "O passo a passo para corrigir o problema",
  "severity_level": "LOW", "MEDIUM", ou "CRITICAL"
}

O ERRO OBSERVADO (ID: ${sysError.id}):
ORIGEM: ${sysError.source}
MENSAGEM: ${sysError.error_message}
STACK TRACE: ${sysError.stack_trace || 'Não fornecida'}
METADADOS: ${sysError.context_data ? JSON.stringify(sysError.context_data) : 'Nenhum'}
      `;

      try {
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // using mini for speed/cost on error looping, can be 'gpt-4o' if complex
            response_format: { type: "json_object" },
            messages: [{ role: 'system', content: systemPrompt }],
            temperature: 0.1,
          }),
        });

        const data = await chatResponse.json();
        const replyString = data.choices[0].message.content;
        const analysis = JSON.parse(replyString);

        // 3. Update the error record with Stark's diagnosis
        await supabase
          .from('system_errors')
          .update({
            status: 'analyzing', // we move to analyzing so it doesn't get picked up again next minute
            ai_analysis: analysis.diagnosis,
            ai_recommendation: analysis.recommendation
          })
          .eq('id', sysError.id);

        // 4. Create a system notification to alert developers / admins
        // In this SGC architecture, we can insert into 'notifications' targeting system admins
        const alertMsg = `⚠️ Stark identificou um erro em produção [${sysError.source}]: ${sysError.error_message}. Diagnóstico: ${analysis.diagnosis}`;
        await supabase.from('notifications').insert({
          type: 'system_alert',
          title: 'Erro Detectado por Stark',
          message: alertMsg,
          // If we had a direct generic broadcast, we'd send to an admin audience rule.
          // For now, simple insert. The dispatcher handles it if we map it to 'system_alert'.
          metadata: {
             error_id: sysError.id,
             severity: analysis.severity_level
          }
        });

        processedCount++;

      } catch (aiErr) {
        console.error(`Falha ao analisar o erro ${sysError.id} via OpenAI:`, aiErr);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
