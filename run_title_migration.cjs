const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sqls = [
  `ALTER TABLE public.companhias ADD COLUMN IF NOT EXISTS nome_titulo TEXT DEFAULT 'Título';`
];

async function run() {
  for (const sql of sqls) {
    try {
      const { error } = await supabase.rpc('exec_sql_void', { sql }).catch(() => ({ error: 'no_rpc' }));
      if (error && error !== 'no_rpc') console.log('Error:', sql.substring(0,50), error);
      else console.log('Done or already exists:', sql.substring(0, 60));
    } catch(e) { console.log('Exception:', e.message); }
  }
}
run();
