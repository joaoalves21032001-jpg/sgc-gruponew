import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testEdgeFunction() {
  console.log('Invoking request-password-reset...');
  const { data, error } = await supabase.functions.invoke('request-password-reset', {
    body: {
      email: 'joaocalves.21032001@gmail.com',
      nova_senha: 'testPassword123',
      motivo: 'test script bypass'
    }
  });

  if (error) {
    console.error('Network/Auth Error:', error.message);
  } else {
    console.log('Response details:', JSON.stringify(data, null, 2));
  }
}

testEdgeFunction();
