
-- Change default for atividades_desabilitadas to false (visible by default)
ALTER TABLE public.profiles ALTER COLUMN atividades_desabilitadas SET DEFAULT false;

-- Also fix progresso_desabilitado and acoes_desabilitadas defaults to false
ALTER TABLE public.profiles ALTER COLUMN progresso_desabilitado SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN acoes_desabilitadas SET DEFAULT false;
