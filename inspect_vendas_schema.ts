import { Client } from 'pg';

const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function inspectDB() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // 1. Type da coluna modalidade em vendas
    console.log('[1] Tipo da coluna modalidade em vendas:');
    const colType = await client.query(`
      SELECT column_name, udt_name, data_type
      FROM information_schema.columns 
      WHERE table_name='vendas' AND column_name='modalidade';
    `);
    colType.rows.forEach((r: any) => console.log(`  modalidade: ${r.udt_name} (${r.data_type})`));

    // 2. Se for enum, listar valores
    const udtName = colType.rows[0]?.udt_name;
    if (udtName && udtName !== 'text' && udtName !== 'varchar') {
      const enumVals = await client.query(`
        SELECT enumlabel FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE typname = $1
        ORDER BY enumsortorder;
      `, [udtName]);
      console.log(`  Valores válidos do enum "${udtName}":`);
      enumVals.rows.forEach((r: any) => console.log(`    - "${r.enumlabel}"`));
    }

    // 3. ID real do admin
    console.log('\n[2] Perfil do admin no banco:');
    const admin = await client.query(`
      SELECT id, email, nome_completo FROM public.profiles LIMIT 5;
    `);
    admin.rows.forEach((r: any) => console.log(`  ${r.id} | ${r.email}`));

    // 4. Exemplo de venda existente para ver valores corretos  
    console.log('\n[3] Exemplo de venda no banco:');
    const vEx = await client.query(`SELECT * FROM vendas LIMIT 1;`);
    if (vEx.rows.length > 0) {
      console.log(JSON.stringify(vEx.rows[0], null, 2));
    } else {
      console.log('  Nenhuma venda no banco ainda.');
    }

  } catch(err: any) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

inspectDB();
