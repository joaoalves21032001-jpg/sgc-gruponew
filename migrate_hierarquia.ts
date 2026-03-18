import { Pool } from 'pg';

const connectionString = "postgresql://postgres.cfqtbvkiegwmzkzmpojt:19212527121973aA%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";

async function migrate() {
    console.log('Connecting to database via direct connection...');
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            console.log('Starting migration...');
            await client.query('BEGIN');

            console.log('Adding nivel_supervisao column...');
            await client.query(`
                ALTER TABLE public.cargos
                ADD COLUMN IF NOT EXISTS nivel_supervisao TEXT DEFAULT 'supervisor';
            `);

            console.log('Updating hierarchies...');
            await client.query(`
                UPDATE public.cargos
                SET nivel_supervisao = 'ninguem'
                WHERE nome = 'Administrador Mestre';
            `);

            await client.query(`
                UPDATE public.cargos
                SET nivel_supervisao = 'diretor'
                WHERE nome ILIKE '%Diretor%';
            `);

            await client.query(`
                UPDATE public.cargos
                SET nivel_supervisao = 'gerente'
                WHERE nome ILIKE '%Gerente%';
            `);

            await client.query('COMMIT');
            console.log('Migration completed successfully.');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Migration failed:', err);
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await pool.end();
    }
}

migrate();
