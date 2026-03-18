-- Update reset_user_mfa to check new security_profile_permissions for 'aprovacoes.mfa'

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
  -- Security check: check if caller has 'aprovacoes.mfa' edit permission via security profiles
  -- or if they have the legacy admin/gerente/supervisor role
  SELECT EXISTS (
    SELECT 1 FROM public.security_profile_permissions spp
    JOIN public.profiles p ON p.security_profile_id = spp.profile_id
    WHERE p.id = auth.uid()
      AND spp.resource = 'aprovacoes.mfa'
      AND spp.action = 'edit'
      AND spp.allowed = true
  ) INTO has_perm;

  IF NOT (has_perm OR is_admin() OR is_supervisor() OR is_gerente()) THEN
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

-- Add DELETE RLS Policies for Aprovações resources

CREATE POLICY "Profile managers can delete atividades"
  ON public.atividades FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.atividades', 'delete'));

CREATE POLICY "Profile managers can delete vendas"
  ON public.vendas FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.vendas', 'delete'));

CREATE POLICY "Profile managers can delete cotacoes"
  ON public.cotacoes FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.cotacoes', 'delete'));

CREATE POLICY "Profile managers can delete access_requests"
  ON public.access_requests FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.acesso', 'delete'));

CREATE POLICY "Profile managers can delete correction_requests"
  ON public.correction_requests FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.alteracoes', 'delete'));

CREATE POLICY "Profile managers can delete mfa_reset_requests"
  ON public.mfa_reset_requests FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.mfa', 'delete'));
