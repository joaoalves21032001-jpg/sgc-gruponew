-- Expand correction_requests tipo constraint to include 'lead'
ALTER TABLE public.correction_requests DROP CONSTRAINT IF EXISTS correction_requests_tipo_check;
ALTER TABLE public.correction_requests ADD CONSTRAINT correction_requests_tipo_check CHECK (tipo IN ('atividade', 'venda', 'lead'));
