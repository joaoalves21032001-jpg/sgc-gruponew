-- 1. Atualizar registros antigos para o padrão em português
UPDATE public.password_reset_requests SET status = 'pendente' WHERE status = 'pending';
UPDATE public.password_reset_requests SET status = 'aprovado' WHERE status = 'approved';
UPDATE public.password_reset_requests SET status = 'recusado' WHERE status = 'rejected';

-- 2. Remover a regra antiga que só aceitava inglês
ALTER TABLE public.password_reset_requests DROP CONSTRAINT IF EXISTS password_reset_requests_status_check;

-- 3. Mudar o valor padrão da coluna para 'pendente'
ALTER TABLE public.password_reset_requests ALTER COLUMN status SET DEFAULT 'pendente';

-- 4. Criar a nova regra aceitando os termos em português
ALTER TABLE public.password_reset_requests ADD CONSTRAINT password_reset_requests_status_check CHECK (status IN ('pendente', 'aprovado', 'recusado'));

-- 5. Atualizar a trigger de notificação para observar o status 'pendente'
CREATE OR REPLACE FUNCTION handle_password_reset_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'pendente' THEN
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
