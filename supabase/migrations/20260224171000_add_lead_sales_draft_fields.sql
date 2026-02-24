-- Add new sales draft fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS produto TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quantidade_vidas INTEGER DEFAULT 1;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS companhia_nome TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS plano_anterior BOOLEAN DEFAULT false;
