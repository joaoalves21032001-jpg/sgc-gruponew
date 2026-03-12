-- Update tipo_documento check constraint to include EMPRESA option
ALTER TABLE public.modalidades DROP CONSTRAINT IF EXISTS modalidades_tipo_documento_check;
ALTER TABLE public.modalidades ADD CONSTRAINT modalidades_tipo_documento_check CHECK (tipo_documento IN ('CPF', 'CNPJ', 'EMPRESA'));
