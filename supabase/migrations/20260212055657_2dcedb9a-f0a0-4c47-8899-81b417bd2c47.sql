
-- Add new columns to access_requests for expanded form
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS cargo text DEFAULT 'Consultor de Vendas';
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS nivel_acesso text DEFAULT 'consultor';
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS numero_emergencia_1 text;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS numero_emergencia_2 text;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS motivo_recusa text;

-- Add status column to atividades table
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Add 'devolvido' to venda_status enum
ALTER TYPE public.venda_status ADD VALUE IF NOT EXISTS 'devolvido';
