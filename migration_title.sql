-- Adicionar campo para o título personalizado da Companhia
ALTER TABLE public.companhias ADD COLUMN IF NOT EXISTS nome_titulo TEXT DEFAULT 'Título';
