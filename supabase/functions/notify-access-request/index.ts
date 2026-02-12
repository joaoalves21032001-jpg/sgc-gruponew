import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, nome, telefone, mensagem } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Save request
    const { error: insertError } = await supabaseAdmin
      .from("access_requests")
      .insert({ email, nome, telefone, mensagem });

    if (insertError) throw insertError;

    // Get all supervisors, gerentes and admins to notify
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["supervisor", "gerente", "administrador"]);

    if (roles && roles.length > 0) {
      const userIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("email, nome_completo")
        .in("id", userIds);

      // Log notification (in production, integrate with email service)
      console.log(`Access request from ${nome} (${email}). Notifying:`, profiles?.map((p: any) => p.email));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
