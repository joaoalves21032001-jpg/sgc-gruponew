const { Client } = require('pg');

const dbClient = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA%40@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    await dbClient.connect();
    const res = await dbClient.query("SELECT id, email, encrypted_password FROM auth.users WHERE email = 'admin@sgc.com'");
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbClient.end();
  }
}

run();
