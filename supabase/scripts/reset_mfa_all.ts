import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function resetAllMfa() {
  console.log('Fetching all users...');
  
  // Need to iterate through users and remove their factors
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  const users = usersData.users;
  console.log(`Found ${users.length} users. Resetting MFA...`);
  
  let successCount = 0;
  let noFactorsCount = 0;

  for (const user of users) {
    // To list factors, we fetch the user's factors using admin API
    const { data: factors, error: factorsError } = await supabase.auth.admin.mfa.listFactors({ userId: user.id });
    
    if (factorsError) {
      console.error(`Error fetching factors for user ${user.id}:`, factorsError);
      continue;
    }

    if (!factors || factors.factors.length === 0) {
      noFactorsCount++;
      continue;
    }

    console.log(`User ${user.id} has ${factors.factors.length} factors. Deleting...`);
    
    // Delete all factors for this user
    for (const factor of factors.factors) {
      const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
        userId: user.id,
        id: factor.id
      });
      
      if (deleteError) {
        console.error(`Failed to delete factor ${factor.id} for user ${user.id}:`, deleteError);
      } else {
        successCount++;
      }
    }
  }

  console.log('--- MFA Reset Complete ---');
  console.log(`Successfully deleted ${successCount} MFA factors.`);
  console.log(`${noFactorsCount} users had no MFA configured.`);
}

resetAllMfa();
