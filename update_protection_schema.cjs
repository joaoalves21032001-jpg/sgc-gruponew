const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('--- ATUALIZANDO SCHEMA PARA PROTEÇÃO PERSONALIZADA ---');

  const tables = ['security_profiles', 'cargos'];

  for (const table of tables) {
    console.log(`Checking table: public.${table}`);
    
    // Add protection_password
    await client.query(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS protection_password TEXT;`);
    // Add protection_mfa_secret
    await client.query(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS protection_mfa_secret TEXT;`);
    
    console.log(`- Columns added/verified to ${table}.`);
  }

  console.log('\n--- SCHEMA ATUALIZADO COM SUCESSO ---');
  await client.end();
}

run().catch(console.error);
