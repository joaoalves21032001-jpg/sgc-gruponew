import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Explicitly pass the token to getUser
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error(`Não autorizado: Token inválido ou expirado. Detalhes: ${authError?.message || 'user is null'}`);
    }

    const { request_id, action, admin_resposta } = await req.json();

    if (!request_id || !action) {
      throw new Error('Parâmetros inválidos.');
    }

    // Check if the request exists and is pending or devolvido
    const { data: request, error: reqErr } = await supabaseAdmin
      .from('mfa_reset_requests')
      .select('user_id, status')
      .eq('id', request_id)
      .single();

    if (reqErr || !request || (request.status !== 'pendente' && request.status !== 'devolvido')) {
      throw new Error('Solicitação inválida ou já resolvida.');
    }

    if (action === 'rejeitado' || action === 'recusado') {
      const { error: rejectErr } = await supabaseAdmin
        .from('mfa_reset_requests')
        .update({ status: 'rejeitado', admin_resposta: admin_resposta || null, resolved_at: new Date().toISOString(), admin_id: user.id })
        .eq('id', request_id);
      if (rejectErr) throw rejectErr;
    } else if (action === 'devolvido') {
      const { error: devolveErr } = await supabaseAdmin
        .from('mfa_reset_requests')
        .update({ status: 'devolvido', admin_resposta: admin_resposta || null, resolved_at: null, admin_id: user.id })
        .eq('id', request_id);
      if (devolveErr) throw devolveErr;
    } else if (action === 'aprovado') {
      // 1. Force update the user's MFA factors using admin API directly, or call the existing stored procedure via RPC using service role
      // Since it's easier to use the RPC:
      const { error: rpcErr } = await supabaseAdmin.rpc('reset_user_mfa', { target_user_id: request.user_id });
      if (rpcErr) throw rpcErr;

      // 2. Mark the request as approved
      const { error: approveErr } = await supabaseAdmin
        .from('mfa_reset_requests')
        .update({ status: 'aprovado', resolved_at: new Date().toISOString(), admin_id: user.id })
        .eq('id', request_id);
      if (approveErr) throw approveErr;
    } else {
      throw new Error('Ação inválida. Use "aprovado", "rejeitado" ou "devolvido".');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Important: Always return 200 to parse JSON easily, throw on actual 500
    });
  }
});
