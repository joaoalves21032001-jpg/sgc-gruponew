import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// Substituída dependencia por um encode base64 simples por confiabilidade em Deno
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    if (!authHeader) {
      throw new Error('Não autorizado: Cabeçalho Authorization ausente.');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      throw new Error('Não autorizado: Token inválido ou expirado.');
    }

    const { request_id, action, target_user_id, force_new_password } = await req.json();

    // Ação direta do ADMIN na página AdminUsuarios (force_new_password e target_user_id)
    if (force_new_password && target_user_id && action === 'force_reset') {
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, { password: force_new_password });
        if (updateErr) throw updateErr;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // Ação a partir da página Aprovacoes (aprovar ou rejeitar uma solicitacao pendente)
    if (!request_id || !action) {
      throw new Error('Parâmetros inválidos.');
    }

    // Pega os dados da solicitação
    const { data: request, error: reqErr } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqErr || !request || request.status !== 'pending') {
      throw new Error('Solicitação inválida ou já resolvida.');
    }

    if (action === 'reject') {
      const { error: rejectErr } = await supabaseAdmin
        .from('password_reset_requests')
        .update({ status: 'rejected', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', request_id);
      if (rejectErr) throw rejectErr;
    } else if (action === 'approve') {
      // Descriptografa a senha usando Base64Decode
      const bytes = decode(request.encrypted_password);
      const decryptedPassword = new TextDecoder().decode(bytes);

      if (!decryptedPassword) {
        throw new Error('Falha ao descriptografar a senha armazenada.');
      }

      // Atualiza o usuário
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(request.user_id, {
        password: decryptedPassword,
      });

      if (updateErr) throw updateErr;

      // Status
      const { error: approveErr } = await supabaseAdmin
        .from('password_reset_requests')
        .update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', request_id);
      if (approveErr) throw approveErr;
    } else {
      throw new Error('Ação inválida.');
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
