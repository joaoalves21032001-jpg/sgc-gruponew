-- Fix the RLS policies for password_reset_requests
-- The previous policy used 'solicitacoes_acesso' as resource key incorrectly.
-- The correct resource key for password resets in security profiles is 'aprovacoes.senha'

DROP POLICY IF EXISTS "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Atualizar solicitacoes de reset de senha" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Excluir solicitacoes de reset de senha" ON public.password_reset_requests;

CREATE POLICY "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('administrador', 'gerente', 'supervisor')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'aprovacoes.senha' AND spp.action = 'view' AND spp.allowed = true
        )
        OR
        user_id = auth.uid()
    );

CREATE POLICY "Atualizar solicitacoes de reset de senha" ON public.password_reset_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('administrador', 'gerente', 'supervisor')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'aprovacoes.senha' AND spp.action = 'edit' AND spp.allowed = true
        )
    );

CREATE POLICY "Excluir solicitacoes de reset de senha" ON public.password_reset_requests
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('administrador', 'gerente', 'supervisor')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'aprovacoes.senha' AND spp.action = 'edit' AND spp.allowed = true
        )
    );
