import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cfqtbvkiegwmzkzmpojt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXRidmtpZWd3bXprempwb2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTcyMzM5MywiZXhwIjoyMDU1Mjk5MzkzfQ.0ZVBikizKJxAGVo14X-FefBb6jFl3ggDxOxvLafAjT0';

async function run() {
  const query = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles';
  `;
  
  const res = await fetch(`https://api.supabase.com/v1/projects/cfqtbvkiegwmzkzmpojt/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  
  if (!res.ok) {
     const errorBody = await res.text();
     console.error('Request failed:', res.status, errorBody);
     return;
  }
  
  const body = await res.json();
  console.log('Columns for profiles table:', body);
}

run();
