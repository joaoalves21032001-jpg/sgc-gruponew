-- Add cotacoes_nao_respondidas column to atividades table
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS cotacoes_nao_respondidas INTEGER DEFAULT 0;
