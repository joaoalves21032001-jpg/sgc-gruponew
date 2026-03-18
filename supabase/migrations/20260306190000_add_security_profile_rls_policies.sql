-- 1. Helper function
CREATE OR REPLACE FUNCTION public.has_security_profile_permission(res text, act text)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.security_profile_permissions spp
    JOIN public.profiles p ON p.security_profile_id = spp.profile_id
    WHERE p.id = auth.uid()
      AND spp.resource = res
      AND spp.action = act
      AND spp.allowed = true
  )
$$;

-- 2. Add RLS Policies so granular Permissions can update records

-- Atividades
CREATE POLICY "Profile managers can manage atividades"
  ON public.atividades FOR ALL TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.atividades', 'edit'));

-- Vendas
CREATE POLICY "Profile managers can manage vendas"
  ON public.vendas FOR ALL TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.vendas', 'edit'));

-- Cotacoes
CREATE POLICY "Profile managers can manage cotacoes"
  ON public.cotacoes FOR ALL TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.cotacoes', 'edit'));

-- Access Requests
CREATE POLICY "Profile managers can manage access_requests"
  ON public.access_requests FOR ALL TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.acesso', 'edit'));

-- Correction Requests
CREATE POLICY "Profile managers can manage correction_requests"
  ON public.correction_requests FOR ALL TO authenticated
  USING (public.has_security_profile_permission('aprovacoes.alteracoes', 'edit'));
