import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      nome,
      contato,
      email,
      companhia_nome,
      produto_nome,
      modalidade,
      quantidade_vidas,
      com_dental,
      co_participacao,
    } = await req.json();

    if (!nome || !contato) {
      return new Response(JSON.stringify({ error: "Nome e contato são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine tipo based on modalidade
    const tipoPF = ["PF", "Familiar"];
    const tipo = tipoPF.includes(modalidade) ? "Pessoa Física" : "Empresa";

    // Get first stage
    const { data: firstStage } = await supabaseAdmin
      .from("lead_stages")
      .select("id")
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle();

    const observacoes = [
      companhia_nome ? `Companhia: ${companhia_nome}` : null,
      produto_nome ? `Produto: ${produto_nome}` : null,
      modalidade ? `Modalidade: ${modalidade}` : null,
      quantidade_vidas ? `Vidas: ${quantidade_vidas}` : null,
      com_dental !== undefined ? `Dental: ${com_dental ? "Sim" : "Não"}` : null,
      co_participacao ? `Co-participação: ${co_participacao}` : null,
    ].filter(Boolean).join(" | ");

    const { error: insertError } = await supabaseAdmin.from("leads").insert({
      nome,
      contato,
      email: email || null,
      tipo,
      origem: "Landing Page",
      livre: true,
      stage_id: firstStage?.id || null,
      created_by: null,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("landing-lead error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
