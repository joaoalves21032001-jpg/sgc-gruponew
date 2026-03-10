-- Create password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    motivo text NOT NULL,
    encrypted_password text NOT NULL,
    status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Turn on RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Allow read access to administrators, superadmins, and leaders
CREATE POLICY "Leitura de solicitacoes de reset de senha" ON public.password_reset_requests
    FOR SELECT TO authenticated
    USING (
        -- Admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.cargo = 'Administrador'
        )
        OR
        -- Superadmin
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profiles sp ON p.security_profile_id = sp.id
            WHERE p.id = auth.uid() AND sp.name ILIKE '%Superadmin%'
        )
        OR
        -- Permission to approve access requests
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid() AND spp.resource = 'solicitacoes_acesso' AND spp.action = 'edit' AND spp.allowed = true
        )
        OR
        -- Own requests
        user_id = auth.uid()
    );

-- Creating a trigger to notify about the password reset request
CREATE OR REPLACE FUNCTION handle_password_reset_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            content,
            trigger_event_id,
            action_url
        ) VALUES (
            NEW.user_id, -- Used just to link to the requester, rules handle delivery
            'password_reset_request',
            'Nova Solicitação de Reset de Senha',
            'Um usuário solicitou a alteração de sua senha de acesso e requer aprovação.',
            NEW.id,
            '/aprovacoes'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_password_reset_request_created ON public.password_reset_requests;
CREATE TRIGGER on_password_reset_request_created
    AFTER INSERT ON public.password_reset_requests
    FOR EACH ROW EXECUTE FUNCTION handle_password_reset_request_notification();
