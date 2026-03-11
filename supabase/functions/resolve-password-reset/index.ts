import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

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

    // Verify caller identity using their JWT
    const authHeader = req.headers.get('Authorization');
    console.log('Auth Header present:', !!authHeader);
    
    // Extract the JWT token from the Bearer string
    const token = authHeader?.replace('Bearer ', '') || '';
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Explicitly pass the token to getUser instead of relying solely on global client headers
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth Error from getUser:', authError);
    }

    if (!user) {
      throw new Error(`Não autorizado: Token inválido ou expirado. Detalhes: ${authError?.message || 'user is null'}`);
    }

    const { request_id, action, target_user_id, force_new_password } = await req.json();

    // Direct admin action from AdminUsuarios page (force password reset)
    if (force_new_password && target_user_id && action === 'force_reset') {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, { password: force_new_password });
      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Action from Aprovacoes page (approve or reject a pending request)
    if (!request_id || !action) {
      throw new Error('Parâmetros inválidos.');
    }

    // Check if the request exists and is pending
    const { data: request, error: reqErr } = await supabaseAdmin
      .from('password_reset_requests')
      .select('user_id, status, encrypted_password') // Added encrypted_password back
      .eq('id', request_id)
      .single();

    if (reqErr || !request || request.status !== 'pendente') {
      throw new Error('Solicitação inválida ou já resolvida.');
    }

    if (action === 'recusado') {
      const { error: rejectErr } = await supabaseAdmin
        .from('password_reset_requests')
        .update({ status: 'recusado', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', request_id);
      if (rejectErr) throw rejectErr;
    } else if (action === 'aprovado') {
      const bytes = decode(request.encrypted_password);
      const decryptedPassword = new TextDecoder().decode(bytes);

      if (!decryptedPassword) {
        throw new Error('Falha ao descriptografar a senha armazenada.');
      }

      // 1. Force update the user's password using admin API
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
        request.user_id,
        { password: decryptedPassword }
      );
      if (updateAuthErr) throw updateAuthErr;

      // 2. Mark the request as approved
      const { error: approveErr } = await supabaseAdmin
        .from('password_reset_requests')
        .update({ status: 'aprovado', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', request_id);
      if (approveErr) throw approveErr;
    } else {
      throw new Error('Ação inválida. Use "aprovado" ou "recusado".');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
