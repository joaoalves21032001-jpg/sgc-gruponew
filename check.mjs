import fs from 'fs';
import path from 'path';

// Read the .env file natively
const envPath = path.resolve(process.cwd(), '.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = line.split('=')[1].trim();
  });
}

async function run() {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.admin@sgc.com&select=*`, {
        headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
        }
    });
    const profiles = await res.json();
    console.log("Admin Profile:", profiles[0]);
    if (profiles[0] && profiles[0].cargo_id) {
        const res2 = await fetch(`${supabaseUrl}/rest/v1/cargos?id=eq.${profiles[0].cargo_id}&select=*`, {
            headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`
            }
        });
        const cargos = await res2.json();
        console.log("Admin Cargo:", cargos[0]);
    }
}
run();
