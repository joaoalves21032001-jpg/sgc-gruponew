-- Migration: Setup Administrador Mestre Cargo

DO $$
DECLARE
    v_admin_id UUID;
    v_cargo_id UUID;
    v_res TEXT;
    v_resources TEXT[] := ARRAY[
        'meu_progresso', 'notificacoes', 'dashboard', 'logs_auditoria', 
        'atividades', 'comercial.atividades', 'comercial.vendas', 
        'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 
        'crm.leads', 
        'aprovacoes.atividades', 'aprovacoes.vendas', 'aprovacoes.cotacoes', 'aprovacoes.alteracoes', 
        'aprovacoes.admin.acesso', 'aprovacoes.admin.mfa', 'aprovacoes.admin.senha', 
        'inventario.companhias', 'inventario.produtos', 'inventario.modalidades', 'inventario.leads', 
        'equipe', 'usuarios', 'configuracoes'
    ];
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@sgc.com';
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin not found';
    END IF;

    -- Create or get the Cargo
    INSERT INTO public.cargos (nome, description, requires_leader, is_protected)
    VALUES ('Administrador Mestre', 'Cargo Mestre com acesso total', false, true)
    ON CONFLICT (nome) DO UPDATE SET is_protected = true
    RETURNING id INTO v_cargo_id;

    -- Insert permissions
    FOREACH v_res IN ARRAY v_resources
    LOOP
        INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed)
        VALUES (v_cargo_id, v_res, 'view', true)
        ON CONFLICT ON CONSTRAINT cargo_permissions_cargo_id_resource_action_key DO UPDATE SET allowed = true;

        INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed)
        VALUES (v_cargo_id, v_res, 'edit', true)
        ON CONFLICT ON CONSTRAINT cargo_permissions_cargo_id_resource_action_key DO UPDATE SET allowed = true;
    END LOOP;

    -- Assign to user
    UPDATE public.profiles SET cargo_id = v_cargo_id WHERE id = v_admin_id;

END $$;
