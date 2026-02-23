
-- Create cotacoes table for landing page quote requests
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contato TEXT NOT NULL,
  email TEXT,
  companhia_nome TEXT,
  produto_nome TEXT,
  modalidade TEXT,
  quantidade_vidas INTEGER DEFAULT 1,
  com_dental BOOLEAN DEFAULT false,
  co_participacao TEXT,
  consultor_recomendado_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pendente',
  motivo_recusa TEXT,
  lead_id UUID REFERENCES public.leads(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can submit cotacao"
ON public.cotacoes
FOR INSERT
WITH CHECK (true);

-- Admins can manage all
CREATE POLICY "Admins can manage cotacoes"
ON public.cotacoes
FOR ALL
USING (is_admin());

-- Supervisors/Gerentes can view and update
CREATE POLICY "Leaders can view cotacoes"
ON public.cotacoes
FOR SELECT
USING (is_supervisor() OR is_gerente() OR is_admin());

CREATE POLICY "Leaders can update cotacoes"
ON public.cotacoes
FOR UPDATE
USING (is_supervisor() OR is_gerente() OR is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_cotacoes_updated_at
BEFORE UPDATE ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
