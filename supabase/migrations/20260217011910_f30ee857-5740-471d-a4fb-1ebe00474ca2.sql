-- Add toggle columns for tab visibility (default disabled = true)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS progresso_desabilitado BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acoes_desabilitadas BOOLEAN NOT NULL DEFAULT true;

-- Update existing atividades_desabilitadas default to true (disabled by default)
ALTER TABLE public.profiles ALTER COLUMN atividades_desabilitadas SET DEFAULT true;