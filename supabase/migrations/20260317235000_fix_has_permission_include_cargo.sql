-- =============================================================================
-- MIGRATION: Corrige has_permission() para incluir cargo_permissions
-- Problema: has_permission() só verificava security_profile_permissions,
--           ignorando o sistema de cargo_permissions (Cargos e Funções).
--           Isso fazia Pedro (mesmo cargo/perfil que admin) ver 0 logs de auditoria.
-- Solução: has_permission() agora verifica AMBOS os sistemas (OR).
-- =============================================================================

-- 1. Atualiza has_permission() para verificar cargo_permissions também
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
BEGIN
    -- Busca o perfil de segurança e cargo do usuário
    SELECT p.security_profile_id, sp.name, p.cargo_id
    INTO v_profile_id, v_profile_name, v_cargo_id
    FROM public.profiles p
    LEFT JOIN public.security_profiles sp ON sp.id = p.security_profile_id
    WHERE p.id = p_user_id;

    -- Superadmin sempre tem acesso total (qualquer perfil com "superadmin" no nome)
    IF v_profile_name ILIKE '%superadmin%' OR v_profile_name ILIKE '%super admin%' THEN
        RETURN true;
    END IF;

    -- Verifica permissão via Security Profile (macro RBAC)
    IF v_profile_id IS NOT NULL THEN
        SELECT allowed INTO v_sp_allowed
        FROM public.security_profile_permissions
        WHERE profile_id = v_profile_id
          AND resource = p_resource
          AND action = p_action
        LIMIT 1;
    END IF;

    -- Verifica permissão via Cargo (micro RBAC)
    IF v_cargo_id IS NOT NULL THEN
        SELECT allowed INTO v_cargo_allowed
        FROM public.cargo_permissions
        WHERE cargo_id = v_cargo_id
          AND resource = p_resource
          AND action = p_action
        LIMIT 1;
    END IF;

    -- Acesso concedido se QUALQUER um dos sistemas autorizar
    RETURN COALESCE(v_sp_allowed, false) OR COALESCE(v_cargo_allowed, false);
END;
$$;

-- 2. Atualiza RLS da tabela profiles para respeitar ambos os sistemas de permissão
-- Remove políticas antigas conflitantes
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Usa has_permission() atualizada: qualquer usuário autenticado pode ver seus próprios dados
-- Usuários com permissão 'usuarios view' (via cargo OU security_profile) veem todos
CREATE POLICY "Own profile always visible"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR public.has_permission(auth.uid(), 'usuarios', 'view')
);

-- Recria política de update (usuário edita próprio perfil, admin edita qualquer um)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "Users can update own profile or with permission"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id
    OR public.has_permission(auth.uid(), 'usuarios', 'edit')
);

-- 3. Garante que as policies de audit_logs continuam corretas
-- (já usa has_permission() que agora inclui cargo_permissions e superadmin check melhorado)
-- Recriar para garantir consistência:
DROP POLICY IF EXISTS "Users with View permission can see logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users with Edit permission can modify logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users with Edit permission can delete logs" ON public.audit_logs;

CREATE POLICY "Users with View permission can see logs"
ON public.audit_logs FOR SELECT
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'view'));

CREATE POLICY "Users can insert logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR public.has_permission(auth.uid(), 'logs_auditoria', 'edit')
);

CREATE POLICY "Users with Edit permission can modify logs"
ON public.audit_logs FOR UPDATE
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));

CREATE POLICY "Users with Edit permission can delete logs"
ON public.audit_logs FOR DELETE
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));
