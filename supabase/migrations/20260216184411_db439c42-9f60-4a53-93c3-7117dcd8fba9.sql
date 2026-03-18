-- Add field for directors to disable activity registration
ALTER TABLE public.profiles 
ADD COLUMN atividades_desabilitadas boolean NOT NULL DEFAULT false;