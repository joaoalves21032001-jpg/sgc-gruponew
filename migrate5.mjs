import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA@@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    // Drop existing constraint if any
    await client.query(`
      ALTER TABLE public.password_reset_requests 
      DROP CONSTRAINT IF EXISTS password_reset_requests_status_check;
    `);
    
    // Add new expanded constraint
    await client.query(`
      ALTER TABLE public.password_reset_requests 
      ADD CONSTRAINT password_reset_requests_status_check 
      CHECK (status IN ('pendente', 'aprovado', 'devolvido', 'rejeitado'));
    `);
    console.log("Check constraint 'password_reset_requests_status_check' expanded to support devolvido and rejeitado.");

    // Reload schema cache for PostgREST
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Schema cache reloaded.");

  } catch (err) {
    console.error("Connection or Query Error", err);
  } finally {
    await client.end();
  }
}
run();
