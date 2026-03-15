const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read the .env file
const envPath = path.resolve(__dirname, '.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
  });
}

if (!supabaseUrl || !supabaseKey) {
  console.log("Could not find Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
  const { data: users, error: uErr } = await supabase.from('profiles').select('*').eq('email', 'admin@sgc.com');
  if (uErr) {
    console.error("Error fetching admin:", uErr);
    return;
  }
  const admin = users[0];
  console.log("Admin Profile:", admin);

  if (admin && admin.cargo_id) {
    const { data: cargo, error: cErr } = await supabase.from('cargos').select('*').eq('id', admin.cargo_id);
    console.log("Admin Cargo:", cargo[0]);
    
    if (cargo[0] && cargo[0].security_profile_id) {
         const { data: profile, error: pErr } = await supabase.from('security_profiles').select('*').eq('id', cargo[0].security_profile_id);
         console.log("Admin Security Profile:", profile[0]);
    } else {
         console.log("Admin Cargo DOES NOT HAVE a security_profile_id!");
    }
  } else {
    console.log("Admin DOES NOT HAVE a cargo_id!");
  }
}

checkAdmin();
