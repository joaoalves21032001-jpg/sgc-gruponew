import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Manual env loading for Node
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error('Missing env vars: URL or ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnon);

async function run() {
  console.log('--- DIAGNÓSTICO DE PERMISSÕES ---');
  
  // 1. Tentar login
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'admin@sgc.com',
    password: 'sgc@user2024'
  });
  
  if (signInErr) {
    console.error('Login falhou:', signInErr.message);
    return;
  }
  
  const user = signInData.user;
  console.log('Logado como:', user.email, 'ID:', user.id);

  // 2. Verificar Perfil
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, cargo, cargo_id, security_profile_id')
    .eq('id', user.id)
    .single();
    
  if (profileErr) {
    console.error('Erro ao ler perfil:', profileErr.message);
  } else {
    console.log('Perfil encontrado:', profile);
  }

  const cargoId = profile?.cargo_id;
  if (!cargoId) {
    console.error('ALERTA: cargo_id está NULO no perfil!');
  }

  // 3. Verificar Cargo e Security Profile vinculado
  if (cargoId) {
    const { data: cargo, error: cargoErr } = await supabase
      .from('cargos' as any)
      .select('id, nome, security_profile_id')
      .eq('id', cargoId)
      .single();
      
    if (cargoErr) {
      console.error('Erro ao ler cargo:', cargoErr.message);
    } else {
      console.log('Cargo encontrado:', cargo);
      
      const secProfileId = cargo.security_profile_id;
      if (!secProfileId) {
        console.error('ALERTA: Cargo não tem security_profile_id vinculado!');
      } else {
        // 4. Verificar Permissões do Perfil
        const { data: perms, error: permsErr } = await supabase
          .from('security_profile_permissions' as any)
          .select('*')
          .eq('profile_id', secProfileId);
          
        if (permsErr) {
          console.error('Erro ao ler permissões do perfil:', permsErr.message);
        } else {
          console.log('Quantidade de permissões do perfil:', perms?.length);
          const allowedCount = perms?.filter(p => p.allowed).length;
          console.log('Quantidade de permissões permitidas (allowed:true):', allowedCount);
          if (perms && perms.length > 0) {
              console.log('Exemplo de permissão:', perms[0]);
          }
        }
      }
    }
    
    // 5. Verificar Permissões do Cargo (Merga com Perfil)
    const { data: cPerms, error: cPermsErr } = await supabase
      .from('cargo_permissions' as any)
      .select('*')
      .eq('cargo_id', cargoId);
      
    if (cPermsErr) {
      console.error('Erro ao ler permissões do cargo:', cPermsErr.message);
    } else {
      console.log('Quantidade de permissões específicas do cargo:', cPerms?.length);
    }
  }

  console.log('--- FIM DO DIAGNÓSTICO ---');
}

run().catch(console.error);
