-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de Permissão

-- 1. Leitura: Todos os usuários autenticados podem ler configurações gerais
CREATE POLICY "Leitura de configurações" ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Modificação: Usuários com permissão de edição na guia 'configuracoes' ou Superadmin/Administrador
CREATE POLICY "Modificação de configurações" ON public.system_settings
    FOR ALL
    TO authenticated
    USING (
        -- Verifica se o usuário é Administrador
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.cargo = 'Administrador'
        )
        OR
        -- Verifica se o perfil de segurança tem a palavra 'Superadmin'
        EXISTS (
            SELECT 1 FROM public.profiles
            JOIN public.security_profiles ON profiles.security_profile_id = security_profiles.id
            WHERE profiles.id = auth.uid()
            AND security_profiles.name ILIKE '%Superadmin%'
        )
        OR
        -- Verifica se o perfil tem permissão de 'edit' em 'configuracoes'
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid()
            AND spp.resource = 'configuracoes'
            AND spp.action = 'edit'
            AND spp.allowed = true
        )
    )
    WITH CHECK (
        -- Mesmas regras para inserção/atualização
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.cargo = 'Administrador'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            JOIN public.security_profiles ON profiles.security_profile_id = security_profiles.id
            WHERE profiles.id = auth.uid()
            AND security_profiles.name ILIKE '%Superadmin%'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.security_profile_permissions spp ON p.security_profile_id = spp.profile_id
            WHERE p.id = auth.uid()
            AND spp.resource = 'configuracoes'
            AND spp.action = 'edit'
            AND spp.allowed = true
        )
    );

-- Trigger para atualizar timestamp (se a função não existir, criamos uma genérica)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_system_settings_modtime ON public.system_settings;
CREATE TRIGGER update_system_settings_modtime
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
