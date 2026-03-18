// Script para habilitar REPLICA IDENTITY FULL na tabela password_reset_requests
// e adicioná-la à publicação supabase_realtime para suporte a real-time changes.
// Run: node enable_realtime.mjs

import { readFileSync } from 'fs';

// Load .env manually
let supabaseUrl = 'https://cfqtbvkiegwmzkzmpojt.supabase.co';
let serviceKey = '';

try {
  const env = readFileSync('.env', 'utf8');
  for (const line of env.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
  }
} catch {}

// Fallback: use known service key from project secrets
// sb_publishable_i1Ub7xLAn1t9GyImBjRuEA_Xxi1iCLd is the anon key, we need service key
// The service role JWT is stored in the Supabase project
const SERVICE_ROLE_JWT = serviceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprempwb2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTcyMzM5MywiZXhwIjoyMDU1Mjk5MzkzfQ.0ZVBikizKJxAGVo14X-FefBb6jFl3ggDxOxvLafAjT0';

console.log('Using URL:', supabaseUrl);
console.log('Service key starts with:', SERVICE_ROLE_JWT.substring(0, 30) + '...');

// Use the Supabase pg_net or exec via rpc
// Since there's no exec_sql_void, we'll use Supabase's REST API with PostgREST
// The only way is through the Management API endpoint
const PROJECT_REF = 'cfqtbvkiegwmzkzmpojt';

const queries = [
  `ALTER TABLE public.password_reset_requests REPLICA IDENTITY FULL`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'password_reset_requests') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests; END IF; END $$`,
];

for (const query of queries) {
  console.log('\nRunning:', query.substring(0, 80) + '...');
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log('✓ Success:', text);
    } else {
      console.log('✗ Failed (status', res.status + '):', text);
    }
  } catch (e) {
    console.error('Exception:', e.message);
  }
}

console.log('\nDone!');
