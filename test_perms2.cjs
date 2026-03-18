const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("Logging in as Admin to check user permissions...");
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: 'admin@sgc.com',
    password: '19212527121973aA@'
  });

  if (error || !session) {
    console.error("Login failed", error);
    return;
  }

  // List first 10 users from profiles to find the right one
  console.log("Listing users from profiles...");
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, nome_completo, email, role, security_profile_id')
    .limit(20);

  const fs = require('fs');
  let output = "ALL PROFILES:\n";
  allProfiles?.forEach(p => {
    output += `  [${p.role}] ${p.nome_completo} | ${p.email} | sec_profile: ${p.security_profile_id}\n`;
  });
  fs.writeFileSync('perms_result.txt', output, 'utf-8');
  console.log('Done! See perms_result.txt');
}
check();
