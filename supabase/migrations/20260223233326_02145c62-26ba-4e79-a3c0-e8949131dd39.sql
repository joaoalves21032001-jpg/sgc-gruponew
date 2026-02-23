
-- 1. Drop peso and altura columns from leads
ALTER TABLE public.leads DROP COLUMN IF EXISTS peso;
ALTER TABLE public.leads DROP COLUMN IF EXISTS altura;

-- 2. Create premiações table for Equipe
CREATE TABLE public.premiacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.premiacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view premiacoes"
ON public.premiacoes FOR SELECT
USING (true);

CREATE POLICY "Admins can manage premiacoes"
ON public.premiacoes FOR ALL
USING (is_admin());
