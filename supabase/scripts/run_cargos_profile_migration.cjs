const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try both .env and .env.local
let envContent = '';
try { envContent = fs.readFileSync('.env.local', 'utf-8'); } catch(e) {}
if (!envContent) {
    try { envContent = fs.readFileSync('.env', 'utf-8'); } catch(e) {}
}

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        env[match[1]] = val;
    }
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing URL or SERVICE_KEY.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sqls = [
  // 1. Add security_profile_id to cargos table
  `ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS security_profile_id uuid REFERENCES public.security_profiles(id) ON DELETE SET NULL;`,
  
  // 2. Fix RLS on cargos table
  `ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;`,
  `DROP POLICY IF EXISTS "cargos_select_policy" ON public.cargos;`,
  `DROP POLICY IF EXISTS "cargos_insert_policy" ON public.cargos;`,
  `DROP POLICY IF EXISTS "cargos_update_policy" ON public.cargos;`,
  `DROP POLICY IF EXISTS "cargos_delete_policy" ON public.cargos;`,
  
  // Allow everyone to read cargos
  `CREATE POLICY "cargos_select_policy" ON public.cargos FOR SELECT USING (true);`,
  
  // Allow admins to manage cargos (using auth.uid() and profiles.role check or simple function)
  `CREATE POLICY "cargos_insert_policy" ON public.cargos FOR INSERT WITH CHECK (
    (select role from profiles where id = auth.uid()) = 'administrador'
  );`,
  `CREATE POLICY "cargos_update_policy" ON public.cargos FOR UPDATE USING (
    (select role from profiles where id = auth.uid()) = 'administrador'
  );`,
  `CREATE POLICY "cargos_delete_policy" ON public.cargos FOR DELETE USING (
    (select role from profiles where id = auth.uid()) = 'administrador'
  );`,
  
  // 3. Fix RLS on cargo_permissions table
  `ALTER TABLE public.cargo_permissions ENABLE ROW LEVEL SECURITY;`,
  `DROP POLICY IF EXISTS "cargo_permissions_select_policy" ON public.cargo_permissions;`,
  `DROP POLICY IF EXISTS "cargo_permissions_insert_policy" ON public.cargo_permissions;`,
  `DROP POLICY IF EXISTS "cargo_permissions_update_policy" ON public.cargo_permissions;`,
  `DROP POLICY IF EXISTS "cargo_permissions_delete_policy" ON public.cargo_permissions;`,
  
  // Allow everyone to read permissions
  `CREATE POLICY "cargo_permissions_select_policy" ON public.cargo_permissions FOR SELECT USING (true);`,
  
  // Allow admins to manage permissions
  `CREATE POLICY "cargo_permissions_insert_policy" ON public.cargo_permissions FOR INSERT WITH CHECK (
    (select role from profiles where id = auth.uid()) = 'administrador'
  );`,
  `CREATE POLICY "cargo_permissions_update_policy" ON public.cargo_permissions FOR UPDATE USING (
    (select role from profiles where id = auth.uid()) = 'administrador'
  );`,
  `CREATE POLICY "cargo_permissions_delete_policy" ON public.cargo_permissions FOR DELETE USING (
    (select role from profiles where id = auth.uid()) = 'administrador'
  );`,
  
  // 4. Update the permissions on security_profiles and security_profile_permissions
  `DROP POLICY IF EXISTS "security_profiles_select_policy" ON public.security_profiles;`,
  `DROP POLICY IF EXISTS "security_profiles_insert_policy" ON public.security_profiles;`,
  `DROP POLICY IF EXISTS "security_profiles_update_policy" ON public.security_profiles;`,
  `DROP POLICY IF EXISTS "security_profiles_delete_policy" ON public.security_profiles;`,
  `CREATE POLICY "security_profiles_select_policy" ON public.security_profiles FOR SELECT USING (true);`,
  `CREATE POLICY "security_profiles_insert_policy" ON public.security_profiles FOR INSERT WITH CHECK ((select role from profiles where id = auth.uid()) = 'administrador');`,
  `CREATE POLICY "security_profiles_update_policy" ON public.security_profiles FOR UPDATE USING ((select role from profiles where id = auth.uid()) = 'administrador');`,
  `CREATE POLICY "security_profiles_delete_policy" ON public.security_profiles FOR DELETE USING ((select role from profiles where id = auth.uid()) = 'administrador');`,
  
  `DROP POLICY IF EXISTS "security_profile_permissions_select_policy" ON public.security_profile_permissions;`,
  `DROP POLICY IF EXISTS "security_profile_permissions_insert_policy" ON public.security_profile_permissions;`,
  `DROP POLICY IF EXISTS "security_profile_permissions_update_policy" ON public.security_profile_permissions;`,
  `DROP POLICY IF EXISTS "security_profile_permissions_delete_policy" ON public.security_profile_permissions;`,
  `CREATE POLICY "security_profile_permissions_select_policy" ON public.security_profile_permissions FOR SELECT USING (true);`,
  `CREATE POLICY "security_profile_permissions_insert_policy" ON public.security_profile_permissions FOR INSERT WITH CHECK ((select role from profiles where id = auth.uid()) = 'administrador');`,
  `CREATE POLICY "security_profile_permissions_update_policy" ON public.security_profile_permissions FOR UPDATE USING ((select role from profiles where id = auth.uid()) = 'administrador');`,
  `CREATE POLICY "security_profile_permissions_delete_policy" ON public.security_profile_permissions FOR DELETE USING ((select role from profiles where id = auth.uid()) = 'administrador');`,
];

async function run() {
  for (const sql of sqls) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
      });
      const { data, error } = await supabase.rpc('exec_sql_void', { sql });
      if (error && error.message !== 'no_rpc') console.log('Error:', sql.substring(0,50), error);
      else console.log('Done or already exists:', sql.substring(0, 60));
    } catch(e) { console.log('Exception:', e.message); }
  }
}
run();
