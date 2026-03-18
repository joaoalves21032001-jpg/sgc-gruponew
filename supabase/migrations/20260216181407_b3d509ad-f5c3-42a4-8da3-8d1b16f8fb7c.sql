
-- Allow supervisors and gerentes to update atividades of consultors under them
CREATE POLICY "Supervisors can update atividades of their team"
ON public.atividades FOR UPDATE
USING (
  is_supervisor() AND is_consultor_under_me(user_id)
  OR is_gerente()
  OR is_admin()
);

-- Allow supervisors and gerentes to update vendas of consultors under them
CREATE POLICY "Supervisors can update vendas of their team"
ON public.vendas FOR UPDATE
USING (
  is_supervisor() AND is_consultor_under_me(user_id)
  OR is_gerente()
  OR is_admin()
);
