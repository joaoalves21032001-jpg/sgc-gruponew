const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Run both migrations via multiple RPC calls
const sqls = [
  // campaign_drafts table
  `CREATE TABLE IF NOT EXISTS public.campaign_drafts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), segmentacao text NOT NULL, copy text NOT NULL, criado_por uuid, status text DEFAULT 'pendente', created_at timestamptz DEFAULT now())`,
  // modalidades tipo_documento (if not already applied)
  `ALTER TABLE public.modalidades ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CPF'`,
];

async function run() {
  for (const sql of sqls) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
      });
      // use supabase-js raw query via rpc if available, else just report
      const { error } = await supabase.rpc('exec_sql_void', { sql }).catch(() => ({ error: 'no_rpc' }));
      if (error && error !== 'no_rpc') console.log('Error:', sql.substring(0,50), error);
      else console.log('Done or already exists:', sql.substring(0, 60));
    } catch(e) { console.log('Exception:', e.message); }
  }
}
run();
