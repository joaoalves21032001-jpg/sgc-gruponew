-- Fix the RLS policies for password_reset_requests correctly this time
-- It appears managers don't always have a `user_roles` entry but rely on `profiles.cargo` and `security_profile_permissions`.
-- We will widen the Select policy to ensure anyone with the 'aprovacoes.senha' permission can read the table.

DROP POLICY IF EXISTS "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Atualizar solicitacoes de reset de senha" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Excluir solicitacoes de reset de senha" ON public.password_reset_requests;

CREATE POLICY "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests
    FOR SELECT TO authenticated
    USING (
        -- Admin via profiles
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.cargo = 'Administrador'
        )
        OR
        -- Superadmin via security_profiles
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profiles sp ON p.security_profile_id = sp.id
            WHERE p.id = auth.uid() AND sp.name ILIKE '%Superadmin%'
        )
        OR
        -- Direct Security Profile Permission
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'aprovacoes.senha' AND spp.action = 'view' AND spp.allowed = true
        )
        OR
        -- Own requests
        user_id = auth.uid()
    );

CREATE POLICY "Atualizar solicitacoes de reset de senha" ON public.password_reset_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.cargo = 'Administrador'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profiles sp ON p.security_profile_id = sp.id
            WHERE p.id = auth.uid() AND sp.name ILIKE '%Superadmin%'
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
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.cargo = 'Administrador'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profiles sp ON p.security_profile_id = sp.id
            WHERE p.id = auth.uid() AND sp.name ILIKE '%Superadmin%'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'aprovacoes.senha' AND spp.action = 'delete' AND spp.allowed = true
        )
    );
