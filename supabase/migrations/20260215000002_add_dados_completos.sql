-- Add dados_completos column to vendas table to store full form data as JSON
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS dados_completos text;
