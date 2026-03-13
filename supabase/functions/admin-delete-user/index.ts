import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clean up all related data first (service role bypasses RLS)
    // Order matters: delete child records before parent (auth.users)
    await supabaseAdmin.from("audit_logs").delete().eq("user_id", user_id);
    await supabaseAdmin.from("notifications").delete().eq("user_id", user_id);
    await supabaseAdmin.from("mfa_reset_requests").delete().eq("user_id", user_id);
    await supabaseAdmin.from("password_reset_requests").delete().eq("user_id", user_id);
    await supabaseAdmin.from("cargo_permissions").delete().eq("cargo_id",
      // subquery not supported in js client, just ignore errors
      "00000000-0000-0000-0000-000000000000"
    ).then(() => {}); // no-op placeholder, real cleanup is via cascade
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    // Update profiles that reference this user as supervisor/gerente
    await supabaseAdmin.from("profiles").update({ supervisor_id: null }).eq("supervisor_id", user_id);
    await supabaseAdmin.from("profiles").update({ gerente_id: null }).eq("gerente_id", user_id);
    // Delete the profile itself
    await supabaseAdmin.from("profiles").delete().eq("id", user_id);

    // Finally delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (error) throw error;

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
