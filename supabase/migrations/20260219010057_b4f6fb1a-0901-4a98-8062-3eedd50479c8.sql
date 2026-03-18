-- Tabela para controle de guias visíveis por usuário
-- O admin define quais guias cada usuário pode ver
-- Se não houver registro, todas as guias são visíveis (padrão)

CREATE TABLE IF NOT EXISTS public.user_tab_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tab_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab_key)
);

ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver suas próprias permissões
CREATE POLICY "Users can view own tab permissions"
  ON public.user_tab_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins gerenciam tudo
CREATE POLICY "Admins can manage tab permissions"
  ON public.user_tab_permissions FOR ALL
  USING (is_admin());

-- Trigger updated_at
CREATE TRIGGER update_user_tab_permissions_updated_at
  BEFORE UPDATE ON public.user_tab_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();