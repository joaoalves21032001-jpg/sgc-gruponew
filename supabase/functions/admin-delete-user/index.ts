import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const reqBody = await req.json();
    const { user_id } = reqBody;

    if (!user_id) {
       return new Response(JSON.stringify({ error: "O ID do usuário é obrigatório" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log("Tentando excluir usuário:", user_id);

    // Order matters: Delete dependencies before auth.users
    await supabaseClient.from("audit_logs").delete().eq("user_id", user_id);
    await supabaseClient.from("notifications").delete().eq("user_id", user_id);
    await supabaseClient.from("mfa_reset_requests").delete().eq("user_id", user_id);
    await supabaseClient.from("password_reset_requests").delete().eq("user_id", user_id);
    await supabaseClient.from("user_roles").delete().eq("user_id", user_id);
    await supabaseClient.from("profiles").update({ supervisor_id: null }).eq("supervisor_id", user_id);
    await supabaseClient.from("profiles").update({ gerente_id: null }).eq("gerente_id", user_id);
    
    // Delete profile (custom table)
    await supabaseClient.from("profiles").delete().eq("id", user_id);

    // Delete Auth user
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user_id);
    
    if (deleteError) {
      console.error('Erro Auth ao deletar usuário:', deleteError);
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Catch error:', error);
    
    let message = error?.message || 'Erro desconhecido ao tentar excluir o usuário';
    
    // Check if error is due to referential integrity constraint (PostgreSQL code 23503)
    // Supabase auth.users sometimes hides the exact constraint but we can match string or code
    if (error?.code === '23503' || message.includes('foreign key constraint')) {
        message = "Não é possível excluir o usuário pois ele possui histórico no sistema (vendas, atividades, etc). Apenas desabilite-o na tela de edição.";
    }

    // Always return 200 so the frontend parse the JSON and display the error cleanly
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
