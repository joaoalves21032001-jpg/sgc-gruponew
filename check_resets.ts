import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // Or anon to test RLS
);

async function main() {
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Recent password resets:', JSON.stringify(data, null, 2));
  }
}

main();
