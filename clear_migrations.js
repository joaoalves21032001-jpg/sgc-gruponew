import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to remote database.');

    try { await client.query('DROP SCHEMA public CASCADE'); console.log('Dropped public schema.'); } catch(e) { console.log('Drop public failed:', e.message); }
    try { await client.query('CREATE SCHEMA public'); console.log('Recreated public schema.'); } catch(e) { }
    try { await client.query('GRANT ALL ON SCHEMA public TO postgres'); } catch(e){}
    try { await client.query('GRANT ALL ON SCHEMA public TO public'); } catch(e){}

    try {
      await client.query(`
        DO $$
        DECLARE pol record;
        BEGIN
            FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' LOOP
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON storage.objects';
            END LOOP;
        END $$;
      `);
      console.log('Dropped storage.objects policies.');
    } catch(e) { console.log('Policy drop failed:', e.message); }

    try { 
      const res = await client.query('TRUNCATE TABLE supabase_migrations.schema_migrations'); 
      console.log('schema_migrations truncated.');
    } catch(e) { console.log('Truncate failed:', e.message); }

  } catch (err) {
    console.error('Connection Error:', err);
  } finally {
    await client.end();
  }
}

run();
