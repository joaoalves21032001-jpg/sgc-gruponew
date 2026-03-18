import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnon) { console.error('Missing vars'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseAnon);

async function run() {
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'admin@sgc.com',
    password: 'sgc@user2024'
  });
  if (signInErr) {
    console.log('Login falhou:', signInErr.message);
    return;
  }
  
  const user = signInData.user;
  console.log('Logado como:', user.email);

  const { data: profile } = await supabase.from('profiles').select('cargo_id').eq('id', user.id).single();
  const cargoId = profile?.cargo_id;
  console.log('Meu cargo_id no DB:', cargoId);

  // Read cargos
  const { data: rotulo, error: rotuloErr } = await supabase.from('cargos').select('nome, security_profile_id').eq('id', cargoId).single();
  console.log('Minha leitura em cargos:', rotulo, rotuloErr ? rotuloErr.message : 'OK');

  // Read cargo_permissions
  const { data: cp, error: cpErr } = await supabase.from('cargo_permissions').select('*').eq('cargo_id', cargoId);
  console.log('Permissões do Cargo lidas:', cp?.length, cpErr ? cpErr.message : 'OK');

  // Read security_profile_permissions
  const secProfileId = rotulo?.security_profile_id;
  if (secProfileId) {
    const { data: sp, error: spErr } = await supabase.from('security_profile_permissions').select('*').eq('profile_id', secProfileId);
    console.log('Permissões do Sec Profile lidas:', sp?.length, spErr ? spErr.message : 'OK');
  }
}

run();
