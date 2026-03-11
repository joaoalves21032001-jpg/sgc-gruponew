import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, motivo, nova_senha } = await req.json();

    if (!email || !nova_senha || !motivo) {
      throw new Error('E-mail, nova senha e motivo são obrigatórios.');
    }

    // Ache o user_id baseado no e-mail (buscando na tabela de profiles pública, ou auth admin)
    // Buscando pelo profiles, já que a Edge Function com service role ignora o RLS
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .single();

    if (profileErr || !profile) {
      throw new Error('Usuário não encontrado.');
    }

    const userId = profile.id;

    // Encoding senha em base64 (precisa converter string em bytes primeiro)
    const encryptedPassword = encode(new TextEncoder().encode(nova_senha));

    // Insere na tabela a solicitação
    const { error: insertErr } = await supabaseAdmin
      .from('password_reset_requests')
      .insert({
        user_id: userId,
        motivo: motivo,
        encrypted_password: encryptedPassword,
        status: 'pendente'
      });

    if (insertErr) {
      throw insertErr;
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
