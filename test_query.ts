import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function testQuery() {
  console.log('Querying profile by email...');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, nome_completo')
    .eq('email', 'joaocalves.21032001@gmail.com');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Profiles found:', JSON.stringify(profile, null, 2));
  }
}

testQuery();
