import { Client } from 'pg';

const pw = encodeURIComponent('19212527121973aA@');
const DB_URL = `postgresql://postgres:${pw}@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres`;

async function checkSchema() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Verifica se colunas 'cargo_id' existem na tabela profiles
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='profiles' AND column_name='cargo_id';
    `);
    
    if (res.rows.length === 0) {
        console.log("A coluna cargo_id NÃO existe em profiles. Vou criá-la e adicionar a tabela de cargos se faltar.");
        
        // Crio tabela cargos por precaução caso nao tenha ido
        await client.query(`
          CREATE TABLE IF NOT EXISTS public.cargos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
          );
        `);

        // Crio a coluna cargo_id em profiles
        await client.query(`
          ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id);
        `);
        console.log("Coluna cargo_id adicionada com sucesso no Supabase Remoto.");
    } else {
        console.log("A coluna cargo_id JÁ EXISTE. Pode ser falta de reload no schema cache da Edge Function.");
    }

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
