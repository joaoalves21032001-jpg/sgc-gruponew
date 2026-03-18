-- Fix RLS: allow supervisors and gerentes to manage correction_requests
-- Currently only is_admin() can update/manage them, but users with security 
-- profile permissions (supervisors/gerentes) also need to approve/reject.

-- Allow supervisors and gerentes to SELECT all correction_requests (not just their own)
CREATE POLICY "Supervisors can view all correction requests"
  ON public.correction_requests FOR SELECT
  USING (is_supervisor() OR is_gerente());

-- Allow supervisors and gerentes to UPDATE correction_requests (approve/reject)
CREATE POLICY "Supervisors can update correction requests"
  ON public.correction_requests FOR UPDATE
  USING (is_supervisor() OR is_gerente() OR is_admin());

-- Also fix atividades: allow supervisors/gerentes to update atividades of users under them
-- (needed for correction request approval which resets the atividade status)
CREATE POLICY "Supervisors can update team atividades"
  ON public.atividades FOR UPDATE
  USING (is_consultor_under_me(user_id) OR is_admin());

-- Also fix vendas: allow supervisors/gerentes to update vendas of users under them
CREATE POLICY "Supervisors can update team vendas"
  ON public.vendas FOR UPDATE
  USING (is_consultor_under_me(user_id) OR is_admin());
