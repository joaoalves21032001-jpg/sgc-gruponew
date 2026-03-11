const https = require('https');
const fs = require('fs');

function loadEnv() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
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
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY; // or publishable key

async function testEdgeFn(jwt) {
  const host = url.replace('https://', '');
  const path = '/functions/v1/resolve-password-reset';
  const data = JSON.stringify({
    action: 'force_reset',
    target_user_id: '123',
    force_new_password: '123'
  });

  const options = {
    hostname: host,
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    }
  };

  const req = https.request(options, res => {
    console.log(`Status EdgeFn: ${res.statusCode}`);
    res.on('data', d => process.stdout.write(d));
  });
  req.write(data);
  req.end();
}

async function loginAndTest() {
  const host = url.replace('https://', '');
  const path = `/auth/v1/token?grant_type=password`;
  
  const data = JSON.stringify({
    email: 'joaocalves.21032001@gmail.com',
    password: 'sgc.superuser' // guessing the password might fail, let's just log what happens
  });

  const options = {
    hostname: host,
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key
    }
  };

  const req = https.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      console.log('Login Status:', res.statusCode);
      const json = JSON.parse(body);
      if (json.access_token) {
        console.log('Login OK, got JWT');
        testEdgeFn(json.access_token);
      } else {
        console.error('Login failed:', body);
      }
    });
  });
  req.write(data);
  req.end();
}

loginAndTest();
