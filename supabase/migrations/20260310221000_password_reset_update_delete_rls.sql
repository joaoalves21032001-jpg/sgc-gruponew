-- Add UPDATE policy for password_reset_requests
-- Allows admins/gerentes to update status (approve/reject/devolver)
DROP POLICY IF EXISTS "Atualizar solicitacoes de reset de senha" ON public.password_reset_requests;

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
            WHERE p.id = auth.uid() AND spp.resource = 'solicitacoes_acesso' AND spp.action = 'edit' AND spp.allowed = true
        )
    );

-- Also add DELETE policy
DROP POLICY IF EXISTS "Excluir solicitacoes de reset de senha" ON public.password_reset_requests;

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
            WHERE p.id = auth.uid() AND spp.resource = 'solicitacoes_acesso' AND spp.action = 'edit' AND spp.allowed = true
        )
    );
