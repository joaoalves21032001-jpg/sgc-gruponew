-- ================================================
-- Migration: Cargos & Permissions System Fix
-- ================================================

-- 1. Create cargos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1b. Add description column if table already exists without it
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS nome TEXT;

-- 2. Enable RLS on cargos
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for cargos (open for authenticated users, matching security_profiles pattern)
DROP POLICY IF EXISTS "cargos_select" ON public.cargos;
DROP POLICY IF EXISTS "cargos_insert" ON public.cargos;
DROP POLICY IF EXISTS "cargos_update" ON public.cargos;
DROP POLICY IF EXISTS "cargos_delete" ON public.cargos;

CREATE POLICY "cargos_select" ON public.cargos FOR SELECT USING (true);
CREATE POLICY "cargos_insert" ON public.cargos FOR INSERT WITH CHECK (true);
CREATE POLICY "cargos_update" ON public.cargos FOR UPDATE USING (true);
CREATE POLICY "cargos_delete" ON public.cargos FOR DELETE USING (true);

-- 4. Create cargo_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cargo_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'view',
  allowed BOOLEAN DEFAULT true,
  UNIQUE(cargo_id, resource, action)
);

-- 5. Enable RLS on cargo_permissions
ALTER TABLE public.cargo_permissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for cargo_permissions
DROP POLICY IF EXISTS "cargo_permissions_select" ON public.cargo_permissions;
DROP POLICY IF EXISTS "cargo_permissions_insert" ON public.cargo_permissions;
DROP POLICY IF EXISTS "cargo_permissions_update" ON public.cargo_permissions;
DROP POLICY IF EXISTS "cargo_permissions_delete" ON public.cargo_permissions;

CREATE POLICY "cargo_permissions_select" ON public.cargo_permissions FOR SELECT USING (true);
CREATE POLICY "cargo_permissions_insert" ON public.cargo_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "cargo_permissions_update" ON public.cargo_permissions FOR UPDATE USING (true);
CREATE POLICY "cargo_permissions_delete" ON public.cargo_permissions FOR DELETE USING (true);

-- 7. Add cargo_id to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL;

-- 8. Fix security_profile_permissions upsert: ensure the unique constraint has the right name
-- The upsert uses onConflict: 'profile_id,resource,action' which relies on a named unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'security_profile_permissions_profile_id_resource_action_key'
  ) THEN
    ALTER TABLE public.security_profile_permissions
      ADD CONSTRAINT security_profile_permissions_profile_id_resource_action_key
      UNIQUE (profile_id, resource, action);
  END IF;
END $$;
