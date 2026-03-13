import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  const file = fileURLToPath(import.meta.url);
  const sqlPath = path.join(path.dirname(file), '../supabase/migrations/001_add_cargos_requires_leader.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Supabase JS doesn't have a built-in "run raw SQL" method easily accessible without RPC,
  // but we can try to use standard queries or fall back to an internal RPC if available.
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        // Fallback: we cannot reliably execute raw schema changes via PostgREST if no exec_sql rpc is defined.
        console.error('Fallback required. Creating RPC `exec_sql` manually or run SQL via dashboard.');
        console.error('Error:', error.message);
        process.exit(1);
    }
    
    console.log('Migration executed successfully:', data);
  } catch (err) {
      console.error(err);
  }
}

run();
