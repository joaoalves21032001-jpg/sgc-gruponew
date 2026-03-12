-- ================================================
-- Migration: Security Profiles (RBAC) System
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================

-- 1. Create security_profiles table
CREATE TABLE IF NOT EXISTS security_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create security_profile_permissions table
CREATE TABLE IF NOT EXISTS security_profile_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES security_profiles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'view',
  allowed BOOLEAN DEFAULT true,
  UNIQUE(profile_id, resource, action)
);

-- 3. Add security_profile_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS security_profile_id UUID REFERENCES security_profiles(id);

-- 4. Enable RLS
ALTER TABLE security_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_profile_permissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: everyone can read, only admins/super admins can modify
CREATE POLICY "security_profiles_select" ON security_profiles FOR SELECT USING (true);
CREATE POLICY "security_profiles_insert" ON security_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "security_profiles_update" ON security_profiles FOR UPDATE USING (true);
CREATE POLICY "security_profiles_delete" ON security_profiles FOR DELETE USING (true);

CREATE POLICY "security_profile_permissions_select" ON security_profile_permissions FOR SELECT USING (true);
CREATE POLICY "security_profile_permissions_insert" ON security_profile_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "security_profile_permissions_update" ON security_profile_permissions FOR UPDATE USING (true);
CREATE POLICY "security_profile_permissions_delete" ON security_profile_permissions FOR DELETE USING (true);

-- 6. Seed default profiles
INSERT INTO security_profiles (name, description, is_system) VALUES
  ('Super Admin', 'Acesso total ao sistema. Pode gerenciar perfis, usuários e todas as configurações.', true),
  ('Gerente', 'Gestão de equipe. Acesso a aprovações, dashboard, inventário e todas guias operacionais.', true),
  ('Supervisor', 'Supervisão de equipe. Acesso a aprovações, dashboard, inventário e guias básicas.', true),
  ('Consultor', 'Acesso básico para consultores. Registro de atividades, CRM e acompanhamento pessoal.', true),
  ('Visualizador', 'Acesso somente leitura. Pode visualizar o progresso mas não editar.', true)
ON CONFLICT (name) DO NOTHING;

-- 7. Seed permissions for Super Admin (all resources, all actions)
DO $$
DECLARE
  v_profile_id UUID;
  v_resources TEXT[] := ARRAY['progresso','comercial','minhas_acoes','crm','notificacoes','aprovacoes','dashboard','inventario','equipe','usuarios','logs_auditoria','configuracoes'];
  v_actions TEXT[] := ARRAY['view','edit','approve','delete'];
  v_res TEXT;
  v_act TEXT;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Super Admin';
  FOREACH v_res IN ARRAY v_resources LOOP
    FOREACH v_act IN ARRAY v_actions LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
      VALUES (v_profile_id, v_res, v_act, true)
      ON CONFLICT (profile_id, resource, action) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 8. Seed permissions for Gerente
DO $$
DECLARE
  v_profile_id UUID;
  v_resources TEXT[] := ARRAY['progresso','comercial','minhas_acoes','crm','notificacoes','aprovacoes','dashboard','inventario','equipe','logs_auditoria'];
  v_actions TEXT[] := ARRAY['view','edit','approve'];
  v_res TEXT;
  v_act TEXT;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Gerente';
  FOREACH v_res IN ARRAY v_resources LOOP
    FOREACH v_act IN ARRAY v_actions LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
      VALUES (v_profile_id, v_res, v_act, true)
      ON CONFLICT (profile_id, resource, action) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 9. Seed permissions for Supervisor
DO $$
DECLARE
  v_profile_id UUID;
  v_view_resources TEXT[] := ARRAY['progresso','comercial','minhas_acoes','crm','notificacoes','aprovacoes','dashboard','inventario','equipe','logs_auditoria'];
  v_edit_resources TEXT[] := ARRAY['comercial','minhas_acoes','crm','inventario'];
  v_res TEXT;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Supervisor';
  -- View all
  FOREACH v_res IN ARRAY v_view_resources LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
    VALUES (v_profile_id, v_res, 'view', true)
    ON CONFLICT (profile_id, resource, action) DO NOTHING;
  END LOOP;
  -- Edit some
  FOREACH v_res IN ARRAY v_edit_resources LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
    VALUES (v_profile_id, v_res, 'edit', true)
    ON CONFLICT (profile_id, resource, action) DO NOTHING;
  END LOOP;
  -- Approve
  INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
  VALUES (v_profile_id, 'aprovacoes', 'approve', true)
  ON CONFLICT (profile_id, resource, action) DO NOTHING;
END $$;

-- 10. Seed permissions for Consultor
DO $$
DECLARE
  v_profile_id UUID;
  v_resources TEXT[] := ARRAY['progresso','comercial','minhas_acoes','crm','notificacoes','equipe'];
  v_res TEXT;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Consultor';
  FOREACH v_res IN ARRAY v_resources LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
    VALUES (v_profile_id, v_res, 'view', true)
    ON CONFLICT (profile_id, resource, action) DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
    VALUES (v_profile_id, v_res, 'edit', true)
    ON CONFLICT (profile_id, resource, action) DO NOTHING;
  END LOOP;
END $$;

-- 11. Seed permissions for Visualizador
DO $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Visualizador';
  INSERT INTO security_profile_permissions (profile_id, resource, action, allowed)
  VALUES (v_profile_id, 'progresso', 'view', true)
  ON CONFLICT (profile_id, resource, action) DO NOTHING;
END $$;

-- Also add the pending columns from earlier
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS cotacoes_nao_respondidas INTEGER DEFAULT 0;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS nome_emergencia_1 TEXT;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS nome_emergencia_2 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome_emergencia_1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome_emergencia_2 TEXT;
