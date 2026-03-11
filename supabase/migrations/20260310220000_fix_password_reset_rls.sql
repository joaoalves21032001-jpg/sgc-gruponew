-- Fix: Add broader admin/gerente access to password reset requests
-- and ensure the table can be read by anyone the RLS permits

-- Drop existing policy and recreate with a broader check
DROP POLICY IF EXISTS "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests;

-- Admins, gerentes, and those with solicitacoes_acesso.view CAN read
CREATE POLICY "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests
    FOR SELECT TO authenticated
    USING (
        -- Admin role
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('administrador', 'gerente', 'supervisor', 'diretor')
        )
        OR
        -- Security profile has solicitacoes_acesso view
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'solicitacoes_acesso' AND spp.action = 'view' AND spp.allowed = true
        )
        OR
        -- Own requests
        user_id = auth.uid()
    );

-- Also ensure service role (edge functions) can always insert
-- (service role bypasses RLS, so this is just for anon/authenticated inserts if needed)
DROP POLICY IF EXISTS "Inserir solicitacoes de reset de senha" ON public.password_reset_requests;
CREATE POLICY "Inserir solicitacoes de reset de senha" ON public.password_reset_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
