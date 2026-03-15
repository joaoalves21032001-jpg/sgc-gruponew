import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Iniciando restauração de permissões...');

  // 1. Perfil Super Admin
  const { data: profile, error: errProfile } = await supabase
    .from('security_profiles')
    .select('id')
    .eq('name', 'Super Admin')
    .single();

  if (errProfile) {
    console.log('Erro ao buscar perfil Super Admin:', errProfile.message);
  } else if (profile) {
    const { error: errUpdate } = await supabase
      .from('security_profile_permissions')
      .update({ allowed: true })
      .eq('profile_id', profile.id);
    
    if (errUpdate) console.log('Erro ao dar permissões de perfil:', errUpdate.message);
    else console.log('✅ Permissões de perfil [Super Admin] restauradas ("allowed": true).');
  }

  // 2. Cargo Administrador Mestre
  const { data: cargo, error: errCargo } = await supabase
    .from('cargos')
    .select('id')
    .eq('nome', 'Administrador Mestre')
    .single();

  if (errCargo) {
    console.log('Erro ao buscar cargo Administrador Mestre:', errCargo.message);
  } else if (cargo) {
    const { error: errUpdateCargo } = await supabase
      .from('cargo_permissions')
      .update({ allowed: true })
      .eq('cargo_id', cargo.id);
      
    if (errUpdateCargo) console.log('Erro ao dar permissões de cargo:', errUpdateCargo.message);
    else console.log('✅ Permissões de cargo [Administrador Mestre] restauradas ("allowed": true).');
  }

  console.log('Concluído.');
}

run();
