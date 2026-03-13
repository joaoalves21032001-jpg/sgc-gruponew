-- =====================================================================
-- Migration: Adicionar colunas ausentes em cargos + sistema de proteção
-- =====================================================================

-- 1. Colunas faltantes em cargos
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS requires_leader boolean DEFAULT true;
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS security_profile_id uuid REFERENCES public.security_profiles(id) ON DELETE SET NULL;

-- 2. Campo de proteção em cargos, perfis de segurança e usuários
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false;
ALTER TABLE public.security_profiles ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false;

-- 3. Recarregar schema cache
NOTIFY pgrst, 'reload schema';
