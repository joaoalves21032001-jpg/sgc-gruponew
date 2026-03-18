-- Fix: update reset_user_mfa to use correct permission check
-- The function was checking security_profile_permissions with resource='aprovacoes.mfa'
-- but the actual resource name in security profiles is just checked via cargo_permissions
-- with the key 'aprovacao_admin_mfa'. 
-- Solution: check BOTH cargo_permissions (new system) AND security_profile_permissions (macro),
-- plus keep the legacy role fallback (is_admin/is_supervisor/is_gerente).

CREATE OR REPLACE FUNCTION public.reset_user_mfa(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
  has_perm boolean;
BEGIN
  -- Security check: verify via cargo_permissions (new granular system)
  SELECT EXISTS (
    SELECT 1
    FROM public.cargo_permissions cp
    JOIN public.profiles p ON p.cargo_id = cp.cargo_id
    WHERE p.id = auth.uid()
      AND cp.resource = 'aprovacao_admin_mfa'
      AND cp.action = 'aprovar'
      AND cp.allowed = true
  ) INTO has_perm;

  -- Also check security_profile_permissions (macro access control)
  IF NOT has_perm THEN
    SELECT EXISTS (
      SELECT 1 FROM public.security_profile_permissions spp
      JOIN public.profiles p ON p.security_profile_id = spp.profile_id
      WHERE p.id = auth.uid()
        AND spp.resource IN ('aprovacoes.mfa', 'mfa', 'aprovacao_admin_mfa', 'aprovacoes')
        AND spp.action IN ('approve', 'edit')
        AND spp.allowed = true
    ) INTO has_perm;
  END IF;

  -- Legacy role fallback
  IF NOT (has_perm OR is_admin() OR is_supervisor() OR is_gerente()) THEN
    RAISE EXCEPTION 'Unauthorized: only admins/supervisors/gerentes/approvers can reset MFA';
  END IF;

  -- Delete all MFA challenges for the target user's factors first (FK dependency)
  DELETE FROM auth.mfa_challenges
  WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = target_user_id);

  -- Delete all MFA factors for the target user
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete trusted devices for this user
  DELETE FROM public.mfa_trusted_devices WHERE user_id = target_user_id;

  RETURN jsonb_build_object('success', true, 'factors_removed', deleted_count);
END;
$$;
