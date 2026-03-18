-- 1. Cria a coluna para vincular Cargos a Perfis de Segurança
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS security_profile_id uuid REFERENCES public.security_profiles(id) ON DELETE SET NULL;

-- 2. Conserta as políticas da tabela CARGOS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cargos_select_policy" ON public.cargos;
DROP POLICY IF EXISTS "cargos_insert_policy" ON public.cargos;
DROP POLICY IF EXISTS "cargos_update_policy" ON public.cargos;
DROP POLICY IF EXISTS "cargos_delete_policy" ON public.cargos;

CREATE POLICY "cargos_select_policy" ON public.cargos FOR SELECT USING (true);
CREATE POLICY "cargos_insert_policy" ON public.cargos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "cargos_update_policy" ON public.cargos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "cargos_delete_policy" ON public.cargos FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);

-- 3. Conserta as políticas da tabela CARGO_PERMISSIONS
ALTER TABLE public.cargo_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cargo_permissions_select_policy" ON public.cargo_permissions;
DROP POLICY IF EXISTS "cargo_permissions_insert_policy" ON public.cargo_permissions;
DROP POLICY IF EXISTS "cargo_permissions_update_policy" ON public.cargo_permissions;
DROP POLICY IF EXISTS "cargo_permissions_delete_policy" ON public.cargo_permissions;

CREATE POLICY "cargo_permissions_select_policy" ON public.cargo_permissions FOR SELECT USING (true);
CREATE POLICY "cargo_permissions_insert_policy" ON public.cargo_permissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "cargo_permissions_update_policy" ON public.cargo_permissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "cargo_permissions_delete_policy" ON public.cargo_permissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);

-- 4. Conserta as políticas da tabela SECURITY_PROFILES e PERMISSIONS
ALTER TABLE public.security_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_profiles_select_policy" ON public.security_profiles;
DROP POLICY IF EXISTS "security_profiles_insert_policy" ON public.security_profiles;
DROP POLICY IF EXISTS "security_profiles_update_policy" ON public.security_profiles;
DROP POLICY IF EXISTS "security_profiles_delete_policy" ON public.security_profiles;

CREATE POLICY "security_profiles_select_policy" ON public.security_profiles FOR SELECT USING (true);
CREATE POLICY "security_profiles_insert_policy" ON public.security_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "security_profiles_update_policy" ON public.security_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "security_profiles_delete_policy" ON public.security_profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);

ALTER TABLE public.security_profile_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_profile_permissions_select_policy" ON public.security_profile_permissions;
DROP POLICY IF EXISTS "security_profile_permissions_insert_policy" ON public.security_profile_permissions;
DROP POLICY IF EXISTS "security_profile_permissions_update_policy" ON public.security_profile_permissions;
DROP POLICY IF EXISTS "security_profile_permissions_delete_policy" ON public.security_profile_permissions;

CREATE POLICY "security_profile_permissions_select_policy" ON public.security_profile_permissions FOR SELECT USING (true);
CREATE POLICY "security_profile_permissions_insert_policy" ON public.security_profile_permissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "security_profile_permissions_update_policy" ON public.security_profile_permissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
CREATE POLICY "security_profile_permissions_delete_policy" ON public.security_profile_permissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo ILIKE '%administrador%')
);
