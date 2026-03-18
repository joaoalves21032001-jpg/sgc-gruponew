import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read the .env file
const envPath = path.resolve(process.cwd(), '.env');
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
  const { data: users, error: uErr } = await supabase.from('profiles').select('*').eq('email', 'admin@sgc.com');
  const admin = users[0];
  console.log("Admin Profile Cargo ID:", admin?.cargo_id);

  if (admin && admin.cargo_id) {
    const { data: cargo } = await supabase.from('cargos').select('*').eq('id', admin.cargo_id);
    console.log("Admin Cargo Security Profile ID:", cargo[0]?.security_profile_id);
    
    if (cargo[0] && cargo[0].security_profile_id) {
         const { data: profile } = await supabase.from('security_profiles').select('*').eq('id', cargo[0].security_profile_id);
         console.log("Admin Security Profile Name:", profile[0]?.name);
    }
  }
}

checkAdmin();
