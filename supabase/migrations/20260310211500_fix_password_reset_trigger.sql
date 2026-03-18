-- Fix notification trigger column names (type -> tipo, title -> titulo, content -> descricao, action_url -> link)
CREATE OR REPLACE FUNCTION handle_password_reset_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        INSERT INTO public.notifications (
            user_id,
            tipo,
            titulo,
            descricao,
            link
        ) VALUES (
            NEW.user_id,
            'password_reset_request',
            'Nova Solicitação de Reset de Senha',
            'Um usuário solicitou a alteração de sua senha de acesso e requer aprovação.',
            '/aprovacoes'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
