-- ================================================
-- Migration: Seed New Granular RBAC Matrix
-- ================================================

-- 1. Clear old permissions as the structure has fundamentally changed from global actions to module-specific actions
DELETE FROM security_profile_permissions;

-- 2. Seed permissions for Super Admin (all resources, all actions)
DO $$
DECLARE
  v_profile_id UUID;
  v_res TEXT;
  v_act TEXT;
  v_resources_gestao TEXT[] := ARRAY['progresso', 'dashboard', 'notificacoes', 'usuarios', 'equipe', 'logs_auditoria', 'configuracoes'];
  v_actions_gestao TEXT[] := ARRAY['view', 'edit'];
  
  v_resources_operacao TEXT[] := ARRAY['comercial.atividades', 'comercial.vendas', 'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 'minhas_acoes.alteracoes'];
  v_actions_operacao TEXT[] := ARRAY['view', 'edit'];
  
  v_resources_crm TEXT[] := ARRAY['crm', 'inventario.leads'];
  v_actions_crm TEXT[] := ARRAY['view', 'edit', 'create', 'edit_leads'];
  
  v_resources_inv TEXT[] := ARRAY['inventario.companhias', 'inventario.produtos', 'inventario.modalidades'];
  v_actions_inv TEXT[] := ARRAY['view', 'edit'];
  
  v_resources_aprov_std TEXT[] := ARRAY['aprovacoes.atividades', 'aprovacoes.vendas'];
  v_actions_aprov_std TEXT[] := ARRAY['analyze', 'approve', 'return', 'edit', 'delete'];
  
  v_resources_aprov_rej TEXT[] := ARRAY['aprovacoes.cotacoes', 'aprovacoes.alteracoes'];
  v_actions_aprov_rej TEXT[] := ARRAY['analyze', 'approve', 'reject', 'edit', 'delete'];
  
  v_resources_aprov_mfa TEXT[] := ARRAY['aprovacoes.mfa'];
  v_actions_aprov_mfa TEXT[] := ARRAY['approve', 'reject', 'return', 'edit', 'delete'];

BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Super Admin';
  
  -- Gestão
  FOREACH v_res IN ARRAY v_resources_gestao LOOP
    FOREACH v_act IN ARRAY v_actions_gestao LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
  -- Operação
  FOREACH v_res IN ARRAY v_resources_operacao LOOP
    FOREACH v_act IN ARRAY v_actions_operacao LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
  -- CRM
  FOREACH v_res IN ARRAY v_resources_crm LOOP
    FOREACH v_act IN ARRAY v_actions_crm LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
  -- INVENTARIO
  FOREACH v_res IN ARRAY v_resources_inv LOOP
    FOREACH v_act IN ARRAY v_actions_inv LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
  -- APROVACOES STD
  FOREACH v_res IN ARRAY v_resources_aprov_std LOOP
    FOREACH v_act IN ARRAY v_actions_aprov_std LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
  -- APROVACOES REJ
  FOREACH v_res IN ARRAY v_resources_aprov_rej LOOP
    FOREACH v_act IN ARRAY v_actions_aprov_rej LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
  -- APROVACOES MFA
  FOREACH v_res IN ARRAY v_resources_aprov_mfa LOOP
    FOREACH v_act IN ARRAY v_actions_aprov_mfa LOOP
      INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, v_act, true);
    END LOOP;
  END LOOP;
END $$;

-- 3. Seed for Gerente
DO $$
DECLARE
  v_profile_id UUID;
  v_res TEXT; v_act TEXT;
  -- Subsets of above
  v_resources_aprov_all TEXT[] := ARRAY['aprovacoes.atividades', 'aprovacoes.vendas', 'aprovacoes.cotacoes', 'aprovacoes.alteracoes', 'aprovacoes.mfa'];
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Gerente';
  
  -- Let's give Gerente same as Super Admin for most except delete
  FOREACH v_res IN ARRAY ARRAY['progresso', 'dashboard', 'notificacoes', 'equipe', 'logs_auditoria', 'comercial.atividades', 'comercial.vendas', 'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 'minhas_acoes.alteracoes', 'inventario.companhias', 'inventario.produtos', 'inventario.modalidades'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['crm', 'inventario.leads'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'create', true);
    -- no edit_leads (super admin exclusive maybe?)
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['aprovacoes.atividades', 'aprovacoes.vendas'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'analyze', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'return', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['aprovacoes.cotacoes', 'aprovacoes.alteracoes'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'analyze', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'reject', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true);
  END LOOP;

  INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, 'aprovacoes.mfa', 'approve', true);
  INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, 'aprovacoes.mfa', 'reject', true);

END $$;

-- 4. Seed for Supervisor
DO $$
DECLARE
  v_profile_id UUID;
  v_res TEXT;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Supervisor';
  
  FOREACH v_res IN ARRAY ARRAY['progresso', 'dashboard', 'notificacoes', 'equipe', 'comercial.atividades', 'comercial.vendas', 'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 'minhas_acoes.alteracoes', 'crm', 'inventario.leads', 'inventario.companhias', 'inventario.produtos', 'inventario.modalidades'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['comercial.atividades', 'comercial.vendas', 'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 'minhas_acoes.alteracoes', 'crm', 'inventario.leads', 'inventario.companhias'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['crm', 'inventario.leads'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'create', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['aprovacoes.atividades', 'aprovacoes.vendas'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'analyze', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'return', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['aprovacoes.cotacoes', 'aprovacoes.alteracoes'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'analyze', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'approve', true);
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'reject', true);
  END LOOP;
END $$;

-- 5. Seed for Consultor
DO $$
DECLARE
  v_profile_id UUID;
  v_res TEXT;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Consultor';
  
  FOREACH v_res IN ARRAY ARRAY['progresso', 'notificacoes', 'equipe', 'comercial.atividades', 'comercial.vendas', 'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 'minhas_acoes.alteracoes', 'crm', 'inventario.leads'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'view', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['comercial.atividades', 'comercial.vendas', 'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 'minhas_acoes.alteracoes', 'crm', 'inventario.leads'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'edit', true);
  END LOOP;

  FOREACH v_res IN ARRAY ARRAY['crm', 'inventario.leads'] LOOP
    INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, v_res, 'create', true);
  END LOOP;
END $$;

-- 6. Seed for Visualizador
DO $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM security_profiles WHERE name = 'Visualizador';
  INSERT INTO security_profile_permissions (profile_id, resource, action, allowed) VALUES (v_profile_id, 'progresso', 'view', true);
END $$;
