-- =============================================================================
-- MIGRATION: Aplicação da Hierarquia Restritiva Perfil de Segurança (Mestre) > Cargo (Fechadura)
-- Problema: A versão anterior usava OR. Um cargo poderia ter permissão para algo
--           que o perfil principal vetava, vazando estado.
-- Solução: Módulo (SP) deve obrigatoriamente validar a regra macro ANTES
--          da granular. Lógica "Porta Principal (AND) Fechadura".
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_resource text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id uuid;
    v_profile_name text;
    v_cargo_id uuid;
    v_sp_allowed boolean;
    v_cargo_allowed boolean;
    v_macro_resource text;
    v_macro_action text;
BEGIN
    -- Busca o perfil de segurança e cargo do usuário logado
    SELECT p.security_profile_id, sp.name, p.cargo_id
    INTO v_profile_id, v_profile_name, v_cargo_id
    FROM public.profiles p
    LEFT JOIN public.security_profiles sp ON sp.id = p.security_profile_id
    WHERE p.id = p_user_id;

    -- 1. Superadmin (Nível Master absoluto)
    IF v_profile_name ILIKE '%superadmin%' OR v_profile_name ILIKE '%super admin%' THEN
        RETURN true;
    END IF;

    -- 2. Mapeia a ação micro para macro
    v_macro_action := p_action;
    IF p_action IN ('create', 'aprovar', 'devolver', 'rejeitar', 'excluir', 'delete', 'reset_password', 'reset_mfa', 'auto_aprovar_vendas', 'auto_aprovar_atividades', 'edit_leads') THEN
        v_macro_action := 'edit';
    ELSIF p_action IN ('view_own', 'view_all', 'analisar') THEN
        v_macro_action := 'view';
    END IF;

    -- 3. Mapeia o recurso micro para macro resource de Nível 1
    v_macro_resource := p_resource;
    IF p_resource LIKE 'aprovacao_%' THEN
        v_macro_resource := 'aprovacoes';
    ELSIF p_resource = 'automacao' THEN
        v_macro_resource := 'configuracoes';
    ELSIF p_resource = 'config.permissoes' OR p_resource = 'config.cargos' THEN
        v_macro_resource := 'configuracoes';
    ELSIF p_resource = 'config.usuarios' THEN
        v_macro_resource := 'usuarios';
    ELSE
        IF p_resource LIKE 'comercial.%' THEN
            v_macro_resource := 'crm';
        ELSE
            IF position('.' in p_resource) > 0 THEN
                v_macro_resource := split_part(p_resource, '.', 1);
            END IF;
        END IF;
    END IF;

    -- 4. VALIDAÇÃO DE NÍVEL 1 (PORTA MESTRA / MASTER SWITCH)
    IF v_profile_id IS NOT NULL THEN
        SELECT allowed INTO v_sp_allowed
        FROM public.security_profile_permissions
        WHERE profile_id = v_profile_id
          AND resource = v_macro_resource
          AND action = v_macro_action
        LIMIT 1;

        -- SE NÃO TEM PERMISSÃO MASTER, JÁ FALHA AQUI (PORTA TRANCADA) - BLOCK ABSOLUTE
        IF v_sp_allowed IS NULL OR v_sp_allowed = false THEN
            RETURN false;
        END IF;
    ELSE
        -- Se o usuário não tiver Perfil de Segurança assinado, default bloqueado
        RETURN false;
    END IF;

    -- Se a validação era apenas do macro, aprova por herança direta
    IF p_resource = v_macro_resource AND p_action = v_macro_action THEN
        RETURN true;
    END IF;

    -- 5. VALIDAÇÃO DE NÍVEL 2 (FECHADURA MICRO CAIXA - CARGOS)
    -- Checado apenas se a Porta Mestra estava ABERTA.
    IF v_cargo_id IS NOT NULL THEN
        SELECT allowed INTO v_cargo_allowed
        FROM public.cargo_permissions
        WHERE cargo_id = v_cargo_id
          AND resource = p_resource
          AND action = p_action
        LIMIT 1;

        -- Se o cargo estipula regra explícita para o sub-item, obedece rigorosamente
        IF v_cargo_allowed IS NOT NULL THEN
            RETURN v_cargo_allowed;
        END IF;
    END IF;

    -- 6. HERANÇA (Fallback): Se a porta Master tá aberta e o cargo não tem proibição explícita (é nulo), permite.
    RETURN true;
END;
$$;
