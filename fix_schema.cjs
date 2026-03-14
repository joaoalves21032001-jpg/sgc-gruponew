const { Client } = require('pg');

const client = new Client({
  host: 'db.cfqtbvkiegwmzkzmpojt.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '19212527121973aA@',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function main() {
  console.log('📡 Reloading schema cache & adding tempo_follow_up_dias...');
  try {
    await client.connect();
    
    // Add column if not exists to leads
    await client.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS tempo_follow_up_dias integer;
    `);
    console.log('✅ Added tempo_follow_up_dias column');

    // Reload schema cache gracefully using postgREST reload function
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('✅ Sent schema reload notify');

  } catch (e) {
    console.error('❌ Falha:', e);
  } finally {
    await client.end();
  }
}

main();
