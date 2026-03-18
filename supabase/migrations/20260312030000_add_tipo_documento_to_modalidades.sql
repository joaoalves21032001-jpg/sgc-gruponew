-- Add tipo_documento column to modalidades table
-- Values: 'CPF' for Pessoa Física, 'CNPJ' for Pessoa Jurídica
ALTER TABLE public.modalidades
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT CHECK (tipo_documento IN ('CPF', 'CNPJ')) DEFAULT 'CPF';
