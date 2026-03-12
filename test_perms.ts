import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("Checking joao...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const joao = users.find(u => u.email === 'joao.alves@sgccorretora.com.br' || String(u.email).includes('joao'));
  
  if (!joao) return console.log("Joao not found");
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', joao.id).single();
  console.log("Profile ID:", profile.id);
  console.log("Security Profile ID:", profile.security_profile_id);

  if (profile.security_profile_id) {
    const { data: perms, error: permErr } = await supabase
      .from('security_profile_permissions')
      .select('*')
      .eq('profile_id', profile.security_profile_id);
    
    if (permErr) console.error("Perm Error", permErr);
    
    console.log("User Permissions:");
    perms?.forEach(p => {
      if (p.resource === 'inventario.produtos' || p.resource.includes('inventario')) {
         console.log(`- ${p.resource} | ${p.action} | allowed: ${p.allowed}`);
      }
    });

    const canCreateProducts = perms?.some(p => p.resource === 'inventario.produtos' && p.action === 'edit' && p.allowed);
    console.log("CAN CREATE PRODUCTS (inventario.produtos = edit)?", canCreateProducts);
  }
}
check();
