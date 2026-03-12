import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// O host real do projeto cfqtbvkiegwmzkzmpojt é db.cfqtbvkiegwmzkzmpojt.supabase.co
const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function applyMigrations() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // Pega as migrations relacionadas a password_reset em ordem
    const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.includes('password_reset'))
        .sort(); // garante a ordem cronologica

    console.log(`Found ${files.length} migrations to apply:`);

    for (const file of files) {
      console.log(`\n--- Applying: ${file} ---`);
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`Successfully applied ${file}`);
      } catch (err) {
        console.error(`Error applying ${file}:`, err);
        // Não lançaremos exception pra continuar se a tabela ja existir
      }
    }

    console.log('\nAll done.');

  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await client.end();
  }
}

applyMigrations();
