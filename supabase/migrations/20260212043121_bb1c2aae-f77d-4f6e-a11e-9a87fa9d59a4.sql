
-- Table for users to report incorrect records to admin
CREATE TABLE public.correction_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('atividade', 'venda')),
  registro_id UUID NOT NULL,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido', 'rejeitado')),
  admin_resposta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own correction requests"
  ON public.correction_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create correction requests
CREATE POLICY "Users can create correction requests"
  ON public.correction_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all correction requests
CREATE POLICY "Admins can manage all correction requests"
  ON public.correction_requests FOR ALL
  USING (is_admin());

-- Admins can delete atividades
CREATE POLICY "Admins can delete atividades"
  ON public.atividades FOR DELETE
  USING (is_admin());

-- Admins can delete vendas
CREATE POLICY "Admins can delete vendas"
  ON public.vendas FOR DELETE
  USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_correction_requests_updated_at
  BEFORE UPDATE ON public.correction_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
