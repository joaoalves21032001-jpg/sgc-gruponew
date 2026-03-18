-- Drop existing delete policies on atividades that might conflict
DROP POLICY IF EXISTS "Admins can delete atividades" ON public.atividades;
DROP POLICY IF EXISTS "Profile managers can delete atividades" ON public.atividades;

-- Create the definitive delete policy for atividades based on the new RBAC system
CREATE POLICY "Profile managers can delete atividades"
  ON public.atividades FOR DELETE TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.atividades', 'delete'));
