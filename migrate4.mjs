import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA@@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE public.password_reset_requests 
      ADD COLUMN IF NOT EXISTS admin_resposta TEXT;
    `);
    console.log("Column 'admin_resposta' ensured on 'password_reset_requests'.");

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
