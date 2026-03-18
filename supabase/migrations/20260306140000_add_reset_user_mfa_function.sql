-- Server-side function to reset a user's MFA factors.
-- Uses SECURITY DEFINER to access auth.mfa_factors directly.
-- Only callable by admins, supervisors, or gerentes.

CREATE OR REPLACE FUNCTION public.reset_user_mfa(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Security check: only admin/supervisor/gerente can call this
  IF NOT (is_admin() OR is_supervisor() OR is_gerente()) THEN
    RAISE EXCEPTION 'Unauthorized: only admins/supervisors/gerentes can reset MFA';
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

-- Grant execute to authenticated users (security check is inside the function)
GRANT EXECUTE ON FUNCTION public.reset_user_mfa(uuid) TO authenticated;
