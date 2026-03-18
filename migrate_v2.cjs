const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('Starting migration v2...');

  // 1. Rename stage
  const { error: renameError } = await supabase.from('lead_stages').update({ nome: 'Sem retorno' }).eq('nome', 'Sem contato');
  if (renameError) console.error('Error renaming stage:', renameError);
  else console.log('Stage renamed successfuly.');

  // 2. Create table and policies
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

  const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (sqlError) {
    console.error('Error creating table:', sqlError);
  } else {
    console.log('lead_retrocessos table created and secured.');
  }
}

run();
