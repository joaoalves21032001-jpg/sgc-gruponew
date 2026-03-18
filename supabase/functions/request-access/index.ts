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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { password, ...requestData } = body;

    const { nome, email, telefone, cpf, endereco, cargo } = requestData;
    
    // Server-side validation
    if (!nome || !email || !telefone || !cpf || !endereco || !cargo || !password) {
      return new Response(JSON.stringify({ error: 'Todos os campos obrigatórios (nome, email, telefone, cpf, endereço, cargo e senha) devem ser preenchidos.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let encrypted_password = null;

    if (password) {
      encrypted_password = encode(password);
    }

    const { data: insertedData, error: insertError } = await supabaseAdmin.from('access_requests').insert({
      ...requestData,
      encrypted_password
    }).select('id').single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, id: insertedData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
