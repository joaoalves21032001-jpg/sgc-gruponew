
-- Companhias (Insurance Companies)
CREATE TABLE public.companhias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.companhias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view companhias" ON public.companhias FOR SELECT USING (true);
CREATE POLICY "Admins can manage companhias" ON public.companhias FOR ALL USING (is_admin());

-- Produtos (Products linked to Companies)
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  companhia_id UUID NOT NULL REFERENCES public.companhias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nome, companhia_id)
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Admins can manage produtos" ON public.produtos FOR ALL USING (is_admin());

-- Modalidades (with required/optional docs and lives config)
CREATE TABLE public.modalidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  documentos_obrigatorios TEXT[] NOT NULL DEFAULT '{}',
  documentos_opcionais TEXT[] NOT NULL DEFAULT '{}',
  quantidade_vidas TEXT NOT NULL DEFAULT 'indefinido',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view modalidades" ON public.modalidades FOR SELECT USING (true);
CREATE POLICY "Admins can manage modalidades" ON public.modalidades FOR ALL USING (is_admin());

-- Leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('pessoa_fisica', 'empresa')),
  nome TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  cpf TEXT,
  cnpj TEXT,
  endereco TEXT,
  doc_foto_path TEXT,
  cartao_cnpj_path TEXT,
  comprovante_endereco_path TEXT,
  boletos_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL USING (is_admin());

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (is_admin());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Add data_lancamento to vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_lancamento DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS justificativa_retroativo TEXT;

-- Triggers for updated_at
CREATE TRIGGER update_companhias_updated_at BEFORE UPDATE ON public.companhias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modalidades_updated_at BEFORE UPDATE ON public.modalidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documentos', 'lead-documentos', false) ON CONFLICT DO NOTHING;
CREATE POLICY "Admins can manage lead docs" ON storage.objects FOR ALL USING (bucket_id = 'lead-documentos' AND public.is_admin());
CREATE POLICY "Authenticated can view lead docs" ON storage.objects FOR SELECT USING (bucket_id = 'lead-documentos');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
