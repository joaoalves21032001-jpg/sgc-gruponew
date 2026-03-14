import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('Starting migration v4 (Rename & Retrocessos)...');

  // 1. Rename stage "Sem contato" to "Sem retorno"
  const { data: stages, error: fetchError } = await supabase
    .from('lead_stages')
    .select('id, nome')
    .eq('nome', 'Sem contato');

  if (fetchError) {
    console.error('Error fetching stage:', fetchError);
  } else if (stages && stages.length > 0) {
    for (const s of stages) {
      const { error: updError } = await supabase
        .from('lead_stages')
        .update({ nome: 'Sem retorno' })
        .eq('id', s.id);
      if (updError) console.error(`Error updating stage ${s.id}:`, updError);
      else console.log(`Stage "${s.nome}" renamed to "Sem retorno".`);
    }
  } else {
    console.log('Stage "Sem contato" not found or already renamed.');
  }

  // 2. Create lead_retrocessos table (via RPC exec_sql if available)
  const sql = `
    CREATE TABLE IF NOT EXISTS lead_retrocessos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
      user_id UUID REFERENCES profiles(id),
      coluna_origem TEXT,
      coluna_destino TEXT,
      justificativa TEXT NOT NULL,
      data_acao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE lead_retrocessos ENABLE ROW LEVEL SECURITY;

    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_retrocessos' AND policyname = 'Consultores podem ver seus retrocessos') THEN
        CREATE POLICY "Consultores podem ver seus retrocessos" ON lead_retrocessos FOR SELECT USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_retrocessos' AND policyname = 'Supervisores/Admins podem ver tudo') THEN
        CREATE POLICY "Supervisores/Admins podem ver tudo" ON lead_retrocessos FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_retrocessos' AND policyname = 'Qualquer um logado pode inserir log') THEN
        CREATE POLICY "Qualquer um logado pode inserir log" ON lead_retrocessos FOR INSERT WITH CHECK (auth.uid() = user_id);
      END IF;
    END $$;
  `;

  // We attempt to use the RPC. If it fails, the user will have to run it manually.
  try {
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (rpcError) {
      console.warn('RPC exec_sql failed. You might need to run the SQL manually in Supabase Dashboard:', rpcError.message);
      console.log('SQL to run:\n', sql);
    } else {
      console.log('lead_retrocessos table created and secured.');
    }
  } catch (e) {
    console.error('Failed to execute RPC:', e);
  }
}

run();
