const fs = require('fs');
const https = require('https');

function loadEnv() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    }
  });
  return env;
}

const env = loadEnv();
const host = env.VITE_SUPABASE_URL.replace('https://', '');
// THE KEY IN .ENV IS PUBLISHABLE_KEY, NOT ANON_KEY
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const path = '/rest/v1/profiles?email=eq.joaocalves.21032001@gmail.com&select=id,email';

console.log('Fetching', host, path);
const options = {
  hostname: host,
  port: 443,
  path: path,
  method: 'GET',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
