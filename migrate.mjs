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
      ALTER TABLE public.cargos 
      ADD COLUMN IF NOT EXISTS nivel_supervisao VARCHAR DEFAULT 'supervisor';
    `);
    console.log("Column 'nivel_supervisao' ensured on 'cargos'.");

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
