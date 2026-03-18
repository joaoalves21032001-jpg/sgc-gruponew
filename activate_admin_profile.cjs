const { Client } = require('pg');

const dbClient = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    console.log('Connecting to database...');
    await dbClient.connect();

    console.log('Activating Master Admin profile...');
    
    await dbClient.query(`
      UPDATE public.profiles
      SET disabled = false
      WHERE email = 'admin@sgc.com';
    `);

    console.log('Profile successfully activated.');
    
  } catch (err) {
    console.error('Execution Error:', err.message);
  } finally {
    await dbClient.end();
  }
}

run();
