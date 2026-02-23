
-- Add new fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS idade integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS peso text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS altura text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS livre boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS origem text DEFAULT 'manual';

-- Add new fields to access_requests table
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS data_admissao date;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS data_nascimento date;

-- Add data_admissao and data_nascimento to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_admissao date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_nascimento date;

-- Seed the 7 fixed pipeline stages (delete existing ones first to ensure clean state)
DELETE FROM public.lead_stages;
INSERT INTO public.lead_stages (nome, cor, ordem) VALUES
  ('Primeiro contato', '#3b82f6', 0),
  ('Sem contato', '#64748b', 1),
  ('Envio de cotação', '#f59e0b', 2),
  ('Negociação em andamento', '#8b5cf6', 3),
  ('Aguardando retorno', '#06b6d4', 4),
  ('Venda realizada', '#22c55e', 5),
  ('Declinado', '#ef4444', 6);

-- Update leads RLS to support hierarchy visibility
-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;

-- Create hierarchy-based read policy
CREATE POLICY "Users can view own or team leads" ON public.leads
FOR SELECT USING (
  is_admin()
  OR (created_by = auth.uid())
  OR (is_supervisor() AND is_consultor_under_me(created_by))
  OR (is_gerente() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = leads.created_by
    AND (p.gerente_id = auth.uid() OR p.supervisor_id IN (
      SELECT id FROM public.profiles WHERE gerente_id = auth.uid()
    ))
  ))
);
