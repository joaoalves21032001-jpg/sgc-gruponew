-- Update reset_user_mfa to check new security_profile_permissions instead of just legacy roles.

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
  -- Security check: check if caller has 'aprovacoes.acesso' edit permission via security profiles
  -- or if they have the legacy admin/gerente/supervisor role
  SELECT EXISTS (
    SELECT 1 FROM public.security_profile_permissions spp
    JOIN public.profiles p ON p.security_profile_id = spp.profile_id
    WHERE p.id = auth.uid()
      AND spp.resource = 'aprovacoes.acesso'
      AND spp.action = 'edit'
      AND spp.allowed = true
  ) INTO has_perm;

  IF NOT (has_perm OR is_admin() OR is_supervisor() OR is_gerente()) THEN
    RAISE EXCEPTION 'Unauthorized: you do not have permission to reset MFA';
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
