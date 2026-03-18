-- Adiciona coluna motivo_recusa para Atividades e Vendas
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS motivo_recusa text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS motivo_recusa text;
ALTER TABLE public.mfa_reset_requests ADD COLUMN IF NOT EXISTS motivo_recusa text;
