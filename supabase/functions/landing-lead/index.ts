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
      nome, contato, email,
      companhia_nome, produto_nome, modalidade,
      quantidade_vidas, com_dental, co_participacao,
      consultor_recomendado_id,
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

    // Insert into cotacoes table
    const { error: insertError } = await supabaseAdmin.from("cotacoes").insert({
      nome,
      contato,
      email: email || null,
      companhia_nome: companhia_nome || null,
      produto_nome: produto_nome || null,
      modalidade: modalidade || null,
      quantidade_vidas: parseInt(quantidade_vidas) || 1,
      com_dental: com_dental || false,
      co_participacao: co_participacao || null,
      consultor_recomendado_id: consultor_recomendado_id || null,
      status: "pendente",
    });

    if (insertError) throw insertError;

    // Notify all supervisors, gerentes, diretores
    const { data: leaders } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("cargo", ["Supervisor", "Gerente", "Diretor"])
      .eq("disabled", false);

    if (leaders && leaders.length > 0) {
      const notifications = leaders.map((l: any) => ({
        user_id: l.id,
        titulo: "Nova cotação recebida",
        descricao: `${nome} solicitou cotação via Landing Page${companhia_nome ? ` — ${companhia_nome}` : ""}.`,
        tipo: "cotacao",
        link: "/aprovacoes",
      }));
      await supabaseAdmin.from("notifications").insert(notifications);
    }

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
