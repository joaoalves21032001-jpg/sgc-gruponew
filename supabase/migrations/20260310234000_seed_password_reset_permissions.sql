-- Adds the 'aprovacoes.senha' permissions to Super Admin, Gerente, and Supervisor security profiles.
-- Without this, the new RLS policy we just added blocks them from viewing and approving password resets.

DO $$
DECLARE
  v_res TEXT := 'aprovacoes.senha';
  v_profile_id UUID;
BEGIN
  -- 1. Super Admin
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Super Admin';
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'reject', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'return', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'delete', true) ON CONFLICT DO NOTHING;
  END IF;

  -- 2. Gerente
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Gerente';
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'reject', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'return', true) ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Supervisor
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Supervisor';
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true) ON CONFLICT DO NOTHING;
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true) ON CONFLICT DO NOTHING;
    -- Supervisors typically don't have reject/delete unless configured, but we give them the basic rights
  END IF;
  
END $$;
