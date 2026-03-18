-- Migration: create campaign_drafts table for Stark BI campaigns
CREATE TABLE IF NOT EXISTS public.campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segmentacao text NOT NULL,
  copy text NOT NULL,
  criado_por uuid REFERENCES public.profiles(id),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver todos os drafts"
  ON public.campaign_drafts FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'Administrador'));

CREATE POLICY "Qualquer autenticado pode inserir draft"
  ON public.campaign_drafts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
