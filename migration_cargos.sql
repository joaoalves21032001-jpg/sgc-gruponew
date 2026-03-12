-- Criação da tabela de Cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cargos_pkey PRIMARY KEY (id)
);

-- Ativar RLS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para cargos
CREATE POLICY "Enable read access for all users" ON public.cargos FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins" ON public.cargos FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('administrador', 'diretor'))
);
CREATE POLICY "Enable update for admins" ON public.cargos FOR UPDATE USING (
  EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('administrador', 'diretor'))
);
CREATE POLICY "Enable delete for admins" ON public.cargos FOR DELETE USING (
  EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('administrador', 'diretor'))
);

-- Criação da tabela de permissões de cargos
CREATE TABLE IF NOT EXISTS public.cargo_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean DEFAULT false,
  CONSTRAINT cargo_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT cargo_permissions_cargo_id_resource_action_key UNIQUE (cargo_id, resource, action)
);

-- Ativar RLS
ALTER TABLE public.cargo_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para cargo_permissions
CREATE POLICY "Enable read access for all users" ON public.cargo_permissions FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins" ON public.cargo_permissions FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('administrador', 'diretor'))
);
CREATE POLICY "Enable update for admins" ON public.cargo_permissions FOR UPDATE USING (
  EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('administrador', 'diretor'))
);
CREATE POLICY "Enable delete for admins" ON public.cargo_permissions FOR DELETE USING (
  EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('administrador', 'diretor'))
);

-- Adicionar campo cargo_id em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL;

-- Inserir cargos padrão (is_system = true para não poderem ser excluídos de imediato)
INSERT INTO public.cargos (name, description, is_system) VALUES 
('Administrador', 'Acesso total e configurações do sistema', true),
('Diretor', 'Acesso nível diretoria e aprovações globais', true),
('Gerente', 'Acesso nível gerencial da filial', true),
('Supervisor', 'Acesso de supervisão de equipe', true),
('Consultor', 'Acesso padrão de vendas', true)
ON CONFLICT DO NOTHING;

-- Opcional: Migrar a string atual profiles.cargo para o novo table cargos (caso queira vincular os usuários existentes)
DO $$
DECLARE
  v_profile RECORD;
  v_cargo_id UUID;
BEGIN
  FOR v_profile IN SELECT id, cargo FROM public.profiles WHERE cargo IS NOT NULL AND cargo_id IS NULL
  LOOP
    -- Busca o cargo matching pelo nome, independente de case
    SELECT id INTO v_cargo_id FROM public.cargos WHERE lower(name) = lower(v_profile.cargo) LIMIT 1;
    
    IF v_cargo_id IS NOT NULL THEN
      UPDATE public.profiles SET cargo_id = v_cargo_id WHERE id = v_profile.id;
    END IF;
  END LOOP;
END $$;
