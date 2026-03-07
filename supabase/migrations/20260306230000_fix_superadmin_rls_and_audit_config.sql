-- =============================================================================
-- MIGRATION: Fix Superadmin RLS + Audit Log Event Config Table
-- =============================================================================

-- 1. Atualiza has_permission para retornar TRUE para perfis Superadmin.
--    Superadmins devem sempre ter acesso total, independentemente de terem
--    as permissões explícitas adicionadas na tabela security_profile_permissions.
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_resource text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id uuid;
    v_profile_name text;
    v_allowed boolean;
BEGIN
    -- Busca o perfil de segurança do usuário
    SELECT p.security_profile_id, sp.name
    INTO v_profile_id, v_profile_name
    FROM public.profiles p
    LEFT JOIN public.security_profiles sp ON sp.id = p.security_profile_id
    WHERE p.id = p_user_id;

    -- Superadmin sempre tem acesso total
    IF v_profile_name ILIKE '%superadmin%' THEN
        RETURN true;
    END IF;

    IF v_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verifica permissão específica na tabela
    SELECT allowed INTO v_allowed
    FROM public.security_profile_permissions
    WHERE profile_id = v_profile_id
      AND resource = p_resource
      AND action = p_action
    LIMIT 1;

    RETURN COALESCE(v_allowed, false);
END;
$$;

-- 2. Recria políticas RLS de audit_logs com a nova função (que já inclui o bypass de Superadmin)
-- As políticas existentes já usam has_permission(), então bastou atualizar a função acima.
-- Mas por segurança, vamos recriar as políticas para garantir consistência.

DROP POLICY IF EXISTS "Users with View permission can see logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users with Edit permission can modify logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users with Edit permission can delete logs" ON public.audit_logs;

CREATE POLICY "Users with View permission can see logs"
ON public.audit_logs FOR SELECT
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'view'));

CREATE POLICY "Users can insert logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR public.has_permission(auth.uid(), 'logs_auditoria', 'edit')
);

CREATE POLICY "Users with Edit permission can modify logs"
ON public.audit_logs FOR UPDATE
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));

CREATE POLICY "Users with Edit permission can delete logs"
ON public.audit_logs FOR DELETE
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));

-- 3. Cria tabela audit_log_config para configurar quais eventos o sistema gera automaticamente
CREATE TABLE IF NOT EXISTS public.audit_log_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_key text NOT NULL UNIQUE,          -- Chave interna do evento (ex: 'login', 'criar_venda')
    event_label text NOT NULL,               -- Nome amigável exibido na UI
    category text NOT NULL DEFAULT 'geral',  -- Categoria: 'autenticacao', 'vendas', 'atividades', etc.
    enabled boolean NOT NULL DEFAULT true,   -- Se o sistema deve registrar esse evento
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS para audit_log_config
ALTER TABLE public.audit_log_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view perm can read log config"
ON public.audit_log_config FOR SELECT
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'view'));

CREATE POLICY "Users with edit perm can manage log config"
ON public.audit_log_config FOR ALL
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));

-- 4. Popula com os eventos padrão do sistema
INSERT INTO public.audit_log_config (event_key, event_label, category, enabled) VALUES
  ('login',                     'Login no sistema',                   'autenticacao',  true),
  ('logout',                    'Logout do sistema',                  'autenticacao',  true),
  ('criar_atividade',           'Registrar Atividade',                'atividades',    true),
  ('editar_atividade',          'Editar Atividade',                   'atividades',    true),
  ('excluir_atividade',         'Excluir Atividade',                  'atividades',    true),
  ('aprovar_atividade',         'Aprovar Atividade',                  'aprovacoes',    true),
  ('devolver_atividade',        'Devolver Atividade',                 'aprovacoes',    true),
  ('criar_venda',               'Registrar Venda',                    'vendas',        true),
  ('editar_venda',              'Editar Venda',                       'vendas',        true),
  ('excluir_venda',             'Excluir Venda',                      'vendas',        true),
  ('aprovar_venda',             'Aprovar Venda',                      'aprovacoes',    true),
  ('devolver_venda',            'Devolver Venda',                     'aprovacoes',    true),
  ('criar_lead',                'Criar Lead (CRM)',                   'crm',           true),
  ('editar_lead',               'Editar Lead (CRM)',                  'crm',           true),
  ('excluir_lead',              'Excluir Lead (CRM)',                 'crm',           true),
  ('mover_lead',                'Mover Lead Entre Etapas',            'crm',           true),
  ('solicitar_edicao_lead',     'Solicitar Edição de Lead',           'crm',           true),
  ('solicitar_exclusao_lead',   'Solicitar Exclusão de Lead',         'crm',           true),
  ('aprovar_acesso',            'Aprovar Solicitação de Acesso',      'aprovacoes',    true),
  ('rejeitar_acesso',           'Rejeitar Solicitação de Acesso',    'aprovacoes',    true),
  ('criar_usuario',             'Criar Usuário',                      'usuarios',      true),
  ('editar_usuario',            'Editar Usuário',                     'usuarios',      true),
  ('excluir_usuario',           'Excluir Usuário',                    'usuarios',      true),
  ('desabilitar_usuario',       'Desabilitar Usuário',                'usuarios',      true),
  ('reativar_usuario',          'Reativar Usuário',                   'usuarios',      true),
  ('criar_companhia',           'Criar Companhia',                    'inventario',    true),
  ('editar_companhia',          'Editar Companhia',                   'inventario',    true),
  ('excluir_companhia',         'Excluir Companhia',                  'inventario',    true),
  ('criar_produto',             'Criar Produto',                      'inventario',    true),
  ('editar_produto',            'Editar Produto',                     'inventario',    true),
  ('excluir_produto',           'Excluir Produto',                    'inventario',    true),
  ('criar_modalidade',          'Criar Modalidade',                   'inventario',    true),
  ('editar_modalidade',         'Editar Modalidade',                  'inventario',    true),
  ('excluir_modalidade',        'Excluir Modalidade',                 'inventario',    true),
  ('solicitar_alteracao',       'Solicitar Alteração de Registro',    'aprovacoes',    true),
  ('alterar_avatar',            'Alterar Foto de Perfil',             'perfil',        true),
  ('alterar_configuracoes',     'Alterar Configurações do Sistema',   'sistema',       true),
  ('criar_perfil_seguranca',    'Criar Perfil de Segurança',         'sistema',       true),
  ('editar_perfil_seguranca',   'Editar Perfil de Segurança',        'sistema',       true),
  ('excluir_perfil_seguranca',  'Excluir Perfil de Segurança',       'sistema',       true),
  ('vincular_perfil_seguranca', 'Vincular Usuário a Perfil',          'sistema',       true),
  ('reset_mfa',                 'Reset de MFA',                       'autenticacao',  true),
  ('criar_regra_notificacao',   'Criar Regra de Notificação',         'sistema',       true),
  ('excluir_regra_notificacao', 'Excluir Regra de Notificação',      'sistema',       true)
ON CONFLICT (event_key) DO NOTHING;
