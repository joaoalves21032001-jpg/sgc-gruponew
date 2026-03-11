const fs = require('fs');

function loadEnv() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL + '/rest/v1/profiles?email=eq.joaocalves.21032001@gmail.com&select=id,email';

async function checkProfile() {
  console.log('Checking profile at', url);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
      }
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch(e) { console.error(e); }
}

checkProfile();
