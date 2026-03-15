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

    const { request_id, action, motivo_recusa } = await req.json();

    if (!request_id || !action) {
      throw new Error('Parâmetros inválidos.');
    }

    // Check if the request exists
    const { data: request, error: reqErr } = await supabaseAdmin
      .from('access_requests')
      .select('status')
      .eq('id', request_id)
      .single();

    if (reqErr || !request) {
      throw new Error('Solicitação inválida.');
    }

    if (action === 'rejeitado' || action === 'recusado') {
      const { error: rejectErr } = await supabaseAdmin
        .from('access_requests')
        .update({ status: 'rejeitado', motivo_recusa: motivo_recusa || null })
        .eq('id', request_id);
      if (rejectErr) throw rejectErr;
    } else if (action === 'devolvido') {
      const { error: devolveErr } = await supabaseAdmin
        .from('access_requests')
        .update({ status: 'devolvido', motivo_recusa: motivo_recusa || null })
        .eq('id', request_id);
      if (devolveErr) throw devolveErr;
    } else {
      throw new Error('Ação inválida. Use "rejeitado" ou "devolvido" por esta function (aprovar usar admin-create-user).');
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
