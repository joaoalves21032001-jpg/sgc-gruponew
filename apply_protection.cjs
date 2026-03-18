const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    const query1 = `
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_profiles' AND column_name = 'is_protected') THEN
              ALTER TABLE security_profiles ADD COLUMN is_protected BOOLEAN DEFAULT false;
              RAISE NOTICE 'Added is_protected to security_profiles';
          END IF;
      END $$;
    `;
    
    const query2 = `
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cargos' AND column_name = 'is_protected') THEN
              ALTER TABLE cargos ADD COLUMN is_protected BOOLEAN DEFAULT false;
              RAISE NOTICE 'Added is_protected to cargos';
          END IF;
      END $$;
    `;

    await client.query(query1);
    console.log('Processed security_profiles table.');
    
    await client.query(query2);
    console.log('Processed cargos table.');

    console.log('Migration successful.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

run();
