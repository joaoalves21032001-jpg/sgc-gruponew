import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

let supabaseUrl = '';
let supabaseKey = '';

function loadEnv(pth) {
  if (fs.existsSync(pth)) {
    const envContent = fs.readFileSync(pth, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
      if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
    });
  }
}

loadEnv(envPath);
loadEnv(envLocalPath);

if (!supabaseKey) {
  // fallback if not in env files
  supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
}

async function fetchApi(table, method, body = null, query = '') {
    const url = query ? `${supabaseUrl}/rest/v1/${table}?${query}` : `${supabaseUrl}/rest/v1/${table}`;
    const opts = {
        method,
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" }
    };
    if (body) {
        opts.body = JSON.stringify(body);
        if (method !== 'GET') opts.headers['Prefer'] = 'return=representation';
    }
    const res = await fetch(url, opts);
    let text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
}

async function restoreAdmin() {
    try {
        console.log("Fetching Super Admin profile...");
        let profiles = await fetchApi('security_profiles', 'GET', null, 'select=id,name');
        if (Array.isArray(profiles)) {
            let sp = profiles.find(p => p.name === 'Super Admin');
            if (sp) {
                const spId = sp.id;
                console.log("Super Admin SP ID:", spId);
                
                console.log("Restaurando permissões do perfil...");
                let res = await fetchApi(`security_profile_permissions?profile_id=eq.${spId}`, 'PATCH', { allowed: true });
                console.log("Perfil atualizado.", res?.length ? `${res.length} rows` : res);
            } else {
                console.log("Não encontrou Super Admin no array", profiles);
            }
        } else {
            console.log("Não encontrou Super Admin");
        }

        console.log("Fetching Administrador Mestre cargo...");
        let cargos = await fetchApi('cargos', 'GET', null, 'select=id,nome');
        if (Array.isArray(cargos)) {
            let crg = cargos.find(c => c.nome === 'Administrador Mestre');
            if (crg) {
                const cargoId = crg.id;
                console.log("Administrador Mestre Cargo ID:", cargoId);
                
                console.log("Restaurando permissões do cargo...");
                let res2 = await fetchApi(`cargo_permissions?cargo_id=eq.${cargoId}`, 'PATCH', { allowed: true });
                console.log("Cargo atualizado.", res2?.length ? `${res2.length} rows` : res2);
            } else {
                console.log("Não encontrou Administrador Mestre no array");
            }
        } else {
            console.log("Não encontrou Administrador Mestre");
        }
        
    } catch (e) {
        console.error("Erro:", e);
    }
}

restoreAdmin();
