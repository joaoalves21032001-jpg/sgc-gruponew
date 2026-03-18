import { Client } from 'pg';

const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function fixCargosAndInspect() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    // 1. Ver valores válidos do enum app_role
    console.log('[1] Valores do enum app_role:');
    const roles = await client.query(`SELECT unnest(enum_range(NULL::app_role)) AS role;`);
    roles.rows.forEach((r: any) => console.log(`   - ${r.role}`));

    // 2. Verificar grants na tabela cargos
    console.log('\n[2] Grants da tabela cargos:');
    const grants = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'cargos' AND table_schema = 'public';
    `);
    grants.rows.forEach((r: any) => console.log(`   ${r.grantee}: ${r.privilege_type}`));
    
    // 3. Conceder permissão ao papel anon e authenticated
    console.log('\n[3] Concedendo grants para anon e authenticated...');
    await client.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO anon;
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;
    `);
    console.log('Grants aplicados com sucesso!');

    // 4. Schema das notification_rules
    console.log('\n[4] Schema de notification_rules:');
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notification_rules' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    cols.rows.forEach((r: any) => console.log(`   - ${r.column_name} (${r.data_type})`));

    // 5. Amostra de dados
    const sample = await client.query(`SELECT * FROM public.notification_rules LIMIT 1;`);
    if (sample.rows.length > 0) {
      console.log('\n[5] Exemplo de registro:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }
    
  } catch(err: any) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

fixCargosAndInspect();
