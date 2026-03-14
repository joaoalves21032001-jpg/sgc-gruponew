DO $$
DECLARE
    v_admin_id UUID;
    v_cargo_id UUID;
    v_sec_profile_id UUID;
    v_res TEXT;
    v_resources TEXT[] := ARRAY[
        'meu_progresso', 'notificacoes', 'dashboard', 'logs_auditoria', 
        'atividades', 'comercial.atividades', 'comercial.vendas', 
        'minhas_acoes.pendentes', 'minhas_acoes.aprovados', 'minhas_acoes.devolvidos', 
        'crm.leads', 
        'aprovacoes.atividades', 'aprovacoes.vendas', 'aprovacoes.cotacoes', 'aprovacoes.alteracoes', 
        'aprovacoes.admin.acesso', 'aprovacoes.admin.mfa', 'aprovacoes.admin.senha', 
        'inventario.companhias', 'inventario.produtos', 'inventario.modalidades', 'inventario.leads', 
        'equipe', 'usuarios', 'configuracoes', 'configuracoes.cargos', 'configuracoes.perfis_seguranca',
        'configuracoes.mfa', 'configuracoes.senhas'
    ];
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@sgc.com';

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin user not found';
    END IF;

    -- Create or get 'Super Admin' Security Profile
    SELECT id INTO v_sec_profile_id FROM public.security_profiles WHERE nome = 'Super Admin';
    IF v_sec_profile_id IS NULL THEN
        INSERT INTO public.security_profiles (nome, descricao, role_level)
        VALUES ('Super Admin', 'Acesso irrestrito ao sistema', 100)
        RETURNING id INTO v_sec_profile_id;
    END IF;

    -- Grant all permissions to this Security Profile
    FOREACH v_res IN ARRAY v_resources
    LOOP
        INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed)
        VALUES (v_sec_profile_id, v_res, 'view', true)
        ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true;

        INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed)
        VALUES (v_sec_profile_id, v_res, 'edit', true)
        ON CONFLICT (profile_id, resource, action) DO UPDATE SET allowed = true;
    END LOOP;

    -- Create or get 'Administrador Mestre' Cargo
    SELECT id INTO v_cargo_id FROM public.cargos WHERE nome = 'Administrador Mestre';
    IF v_cargo_id IS NULL THEN
        INSERT INTO public.cargos (nome, description, requires_leader, is_protected, security_profile_id)
        VALUES ('Administrador Mestre', 'Cargo Mestre com acesso total', false, true, v_sec_profile_id)
        RETURNING id INTO v_cargo_id;
    ELSE
        UPDATE public.cargos SET security_profile_id = v_sec_profile_id WHERE id = v_cargo_id;
    END IF;

    -- Grant all permissions to this Cargo (for redundancy if RLS uses cargo_permissions)
    FOREACH v_res IN ARRAY v_resources
    LOOP
        INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed)
        VALUES (v_cargo_id, v_res, 'view', true)
        ON CONFLICT ON CONSTRAINT cargo_permissions_cargo_id_resource_action_key DO UPDATE SET allowed = true;

        INSERT INTO public.cargo_permissions (cargo_id, resource, action, allowed)
        VALUES (v_cargo_id, v_res, 'edit', true)
        ON CONFLICT ON CONSTRAINT cargo_permissions_cargo_id_resource_action_key DO UPDATE SET allowed = true;
    END LOOP;

    -- Update User's Profile
    UPDATE public.profiles 
    SET cargo_id = v_cargo_id, 
        cargo = 'Administrador Mestre',
        perfil = 'Super Admin'
    WHERE id = v_admin_id;

END $$;
