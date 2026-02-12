
-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('consultor', 'supervisor', 'gerente', 'administrador');
CREATE TYPE public.venda_status AS ENUM ('analise', 'pendente', 'aprovado', 'recusado');
CREATE TYPE public.venda_modalidade AS ENUM ('PF', 'Familiar', 'PME Multi', 'Empresarial', 'Adesão');

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT UNIQUE,
  nome_completo TEXT NOT NULL,
  apelido TEXT,
  email TEXT NOT NULL,
  celular TEXT,
  cpf TEXT,
  rg TEXT,
  endereco TEXT,
  numero_emergencia_1 TEXT,
  numero_emergencia_2 TEXT,
  cargo TEXT NOT NULL DEFAULT 'Consultor de Vendas',
  supervisor_id UUID REFERENCES public.profiles(id),
  gerente_id UUID REFERENCES public.profiles(id),
  avatar_url TEXT,
  meta_faturamento NUMERIC DEFAULT 75000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. ATIVIDADES TABLE
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  ligacoes INT NOT NULL DEFAULT 0,
  mensagens INT NOT NULL DEFAULT 0,
  cotacoes_enviadas INT NOT NULL DEFAULT 0,
  cotacoes_fechadas INT NOT NULL DEFAULT 0,
  follow_up INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, data)
);
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- 5. VENDAS TABLE
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_titular TEXT NOT NULL,
  modalidade venda_modalidade NOT NULL,
  status venda_status NOT NULL DEFAULT 'analise',
  vidas INT NOT NULL DEFAULT 1,
  valor NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- 6. VENDA DOCUMENTOS TABLE
CREATE TABLE public.venda_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venda_documentos ENABLE ROW LEVEL SECURITY;

-- 7. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('venda-documentos', 'venda-documentos', false);

-- 8. HELPER FUNCTIONS (security definer to avoid RLS recursion)

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'administrador')
$$;

CREATE OR REPLACE FUNCTION public.is_gerente()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'gerente')
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'supervisor')
$$;

CREATE OR REPLACE FUNCTION public.is_consultor_under_me(_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _target_user_id
      AND (supervisor_id = auth.uid() OR gerente_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_user_data(_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.is_gerente()
    OR auth.uid() = _target_user_id
    OR (public.is_supervisor() AND public.is_consultor_under_me(_target_user_id))
$$;

-- 9. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_atividades_updated_at BEFORE UPDATE ON public.atividades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, apelido)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  -- Default role: consultor
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consultor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. RLS POLICIES

-- profiles
CREATE POLICY "Users can view accessible profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.can_access_user_data(id));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Auto-insert on signup" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- atividades
CREATE POLICY "Users can view accessible atividades" ON public.atividades
  FOR SELECT TO authenticated USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own atividades" ON public.atividades
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own atividades" ON public.atividades
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all atividades" ON public.atividades
  FOR ALL TO authenticated USING (public.is_admin());

-- vendas
CREATE POLICY "Users can view accessible vendas" ON public.vendas
  FOR SELECT TO authenticated USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own vendas" ON public.vendas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vendas" ON public.vendas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all vendas" ON public.vendas
  FOR ALL TO authenticated USING (public.is_admin());

-- venda_documentos (access via venda ownership)
CREATE POLICY "Users can view docs of accessible vendas" ON public.venda_documentos
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND public.can_access_user_data(v.user_id))
  );
CREATE POLICY "Users can insert docs to own vendas" ON public.venda_documentos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND v.user_id = auth.uid())
  );
CREATE POLICY "Users can delete docs from own vendas" ON public.venda_documentos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND v.user_id = auth.uid())
  );

-- storage policies for venda-documentos bucket
CREATE POLICY "Authenticated users can upload docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'venda-documentos');
CREATE POLICY "Users can view own docs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'venda-documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own docs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'venda-documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
