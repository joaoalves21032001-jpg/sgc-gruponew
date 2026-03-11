import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

// ─── Types ───────────────────────────────────────────────────────
export interface SecurityProfile {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    created_at: string;
    updated_at: string;
}

export interface SecurityProfilePermission {
    id: string;
    profile_id: string;
    resource: string;
    action: string;
    allowed: boolean;
}

// ─── Resource hierarchy: pages → sub-tabs ──────────────────────
export interface ResourceDef {
    key: string;
    label: string;
    children?: { key: string; label: string }[];
}

export interface ActionDef {
    key: string;
    label: string;
}

export interface ResourceGroupDef {
    groupLabel: string;
    resources: {
        key: string;
        label: string;
        actions: ActionDef[];
    }[];
}

const COMMON_ACTIONS: ActionDef[] = [
    { key: 'view', label: 'Visualizador' },
    { key: 'edit', label: 'Editor' }
];

const CRM_ACTIONS: ActionDef[] = [
    { key: 'view', label: 'Visualizador' },
    { key: 'view_own', label: 'Ver somente meus Leads' },
    { key: 'view_all', label: 'Ver todos os Leads' },
    { key: 'edit', label: 'Editor' },
    { key: 'create', label: 'Criador' },
    { key: 'edit_leads', label: 'Editor de Leads' }
];

const APROVA_ACTIONS_STD: ActionDef[] = [
    { key: 'analyze', label: 'Analisar' },
    { key: 'approve', label: 'Aprovar' },
    { key: 'return', label: 'Devolver' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' }
];

const USER_ACTIONS: ActionDef[] = [
    { key: 'view', label: 'Visualizador' },
    { key: 'edit', label: 'Editor' },
    { key: 'reset_password', label: 'Resetar Senha' },
    { key: 'reset_mfa', label: 'Resetar MFA' },
    { key: 'disable', label: 'Desabilitar' },
    { key: 'delete', label: 'Excluir' }
];

const APROVA_ACTIONS_REJECT: ActionDef[] = [
    { key: 'analyze', label: 'Analisar' },
    { key: 'approve', label: 'Aprovar' },
    { key: 'reject', label: 'Rejeitar' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' }
];

const APROVA_ACTIONS_MFA: ActionDef[] = [
    { key: 'approve', label: 'Aprovar' },
    { key: 'reject', label: 'Rejeitar' },
    { key: 'return', label: 'Devolver' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' }
];

export const MODULES_DEF: ResourceGroupDef[] = [
    {
        groupLabel: 'Módulos de Gestão, Sistema e Dashboard',
        resources: [
            { key: 'progresso', label: 'Meu Progresso', actions: COMMON_ACTIONS },
            { key: 'dashboard', label: 'Dashboard', actions: COMMON_ACTIONS },
            { key: 'notificacoes', label: 'Notificações', actions: COMMON_ACTIONS },
            { key: 'usuarios', label: 'Usuários', actions: USER_ACTIONS },
            { key: 'solicitacoes_acesso', label: 'Solic. de Acesso e Senhas', actions: COMMON_ACTIONS },
            { key: 'equipe', label: 'Equipe', actions: COMMON_ACTIONS },
            { key: 'logs_auditoria', label: 'Logs de Auditoria', actions: COMMON_ACTIONS },
            { key: 'configuracoes', label: 'Configurações do Sistema', actions: COMMON_ACTIONS },
        ]
    },
    {
        groupLabel: 'Módulos de Operação e CRM',
        resources: [
            { key: 'comercial', label: 'Registro de Atividades (Geral)', actions: COMMON_ACTIONS },
            { key: 'comercial.atividades', label: 'Registro de Atividades > Subguia Atividades', actions: COMMON_ACTIONS },
            { key: 'comercial.vendas', label: 'Registro de Atividades > Subguia Vendas', actions: COMMON_ACTIONS },
            { key: 'minhas_acoes.pendentes', label: 'Minhas Ações > Subguia Pendentes', actions: COMMON_ACTIONS },
            { key: 'minhas_acoes.aprovados', label: 'Minhas Ações > Subguia Aprovados', actions: COMMON_ACTIONS },
            { key: 'minhas_acoes.devolvidos', label: 'Minhas Ações > Subguia Devolvidos', actions: COMMON_ACTIONS },
            { key: 'minhas_acoes.alteracoes', label: 'Minhas Ações > Subguia Alterações', actions: COMMON_ACTIONS },
            { key: 'crm', label: 'CRM (Geral)', actions: CRM_ACTIONS },
            { key: 'inventario.leads', label: 'Inventário > Subguia Leads', actions: CRM_ACTIONS },
        ]
    },
    {
        groupLabel: 'Módulos de Inventário (Outros)',
        resources: [
            { key: 'inventario', label: 'Inventário (Geral)', actions: COMMON_ACTIONS },
            { key: 'inventario.companhias', label: 'Inventário > Subguia Companhias', actions: COMMON_ACTIONS },
            { key: 'inventario.produtos', label: 'Inventário > Subguia Produtos', actions: COMMON_ACTIONS },
            { key: 'inventario.modalidades', label: 'Inventário > Subguia Modalidades', actions: COMMON_ACTIONS },
        ]
    },
    {
        groupLabel: 'Módulo de Aprovações (Colunas de Ação)',
        resources: [
            { key: 'aprovacoes', label: 'Aprovações (Geral)', actions: COMMON_ACTIONS },
            { key: 'aprovacoes.atividades', label: 'Aprovações > Subguia Atividades', actions: APROVA_ACTIONS_STD },
            { key: 'aprovacoes.vendas', label: 'Aprovações > Subguia Vendas', actions: APROVA_ACTIONS_STD },
            { key: 'aprovacoes.cotacoes', label: 'Aprovações > Subguia Cotações', actions: APROVA_ACTIONS_REJECT },
            { key: 'aprovacoes.alteracoes', label: 'Aprovações > Subguia Alterações', actions: APROVA_ACTIONS_REJECT },
            { key: 'aprovacoes.mfa', label: 'Aprovações > Subguia MFA', actions: APROVA_ACTIONS_MFA },
            { key: 'aprovacoes.senha', label: 'Aprovações > Subguia Senhas', actions: APROVA_ACTIONS_MFA },
        ]
    }
];

// Map sidebar paths → resource keys
export const PATH_TO_RESOURCE: Record<string, string> = {
    '/': 'progresso',
    '/comercial': 'comercial',
    '/minhas-acoes': 'minhas_acoes',
    '/crm': 'crm',
    '/notificacoes': 'notificacoes',
    '/aprovacoes': 'aprovacoes',
    '/gestao': 'dashboard',
    '/inventario': 'inventario',
    '/equipe': 'equipe',
    '/admin/usuarios': 'usuarios',
    '/admin/solicitacoes': 'solicitacoes_acesso',
    '/admin/logs': 'logs_auditoria',
    '/admin/configuracoes': 'configuracoes',
};

export function getAllResourceKeys(): string[] {
    const keys: string[] = [];
    for (const group of MODULES_DEF) {
        for (const res of group.resources) {
            keys.push(res.key);
        }
    }
    return keys;
}

// ─── Hooks ───────────────────────────────────────────────────────

/** Fetch all security profiles */
export function useSecurityProfiles() {
    return useQuery({
        queryKey: ['security-profiles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('security_profiles' as any)
                .select('*')
                .order('created_at');
            if (error) {
                // If table doesn't exist yet, return empty gracefully
                if (error.message?.includes('schema cache') || error.code === '42P01') return [];
                throw error;
            }
            return (data ?? []) as unknown as SecurityProfile[];
        },
    });
}

/** Fetch permissions for a specific profile */
export function useProfilePermissions(profileId: string | null) {
    return useQuery({
        queryKey: ['security-profile-permissions', profileId],
        queryFn: async () => {
            if (!profileId) return [];
            const { data, error } = await supabase
                .from('security_profile_permissions' as any)
                .select('*')
                .eq('profile_id', profileId);
            if (error) {
                if (error.message?.includes('schema cache') || error.code === '42P01') return [];
                throw error;
            }
            return (data ?? []) as unknown as SecurityProfilePermission[];
        },
        enabled: !!profileId,
    });
}

/** Fetch the current user's permissions based on their assigned security profile */
export function useMyPermissions() {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['my-permissions', user?.id, (profile as any)?.security_profile_id],
        queryFn: async () => {
            const profileId = (profile as any)?.security_profile_id as string | undefined;
            if (!profileId) {
                return null; // No profile → backward compat
            }
            const { data, error } = await supabase
                .from('security_profile_permissions' as any)
                .select('*')
                .eq('profile_id', profileId);
            if (error) {
                if (error.message?.includes('schema cache') || error.code === '42P01') return null;
                throw error;
            }
            return (data ?? []) as unknown as SecurityProfilePermission[];
        },
        enabled: !!user && !!profile,
    });
}

/**
 * Check if the current user has permission for a resource+action.
 * Supports hierarchical check: if 'comercial' is not allowed, 'comercial.atividades' is auto-denied.
 */
export function hasPermission(
    permissions: SecurityProfilePermission[] | null | undefined,
    resource: string,
    action: string = 'view'
): boolean {
    if (!permissions || permissions.length === 0) return false;
    // Check parent first (e.g. comercial for comercial.atividades)
    const parts = resource.split('.');
    if (parts.length > 1) {
        const parentPerm = permissions.find(p => p.resource === parts[0] && p.action === action);
        if (parentPerm && !parentPerm.allowed) return false; // parent denied → child denied
    }
    const perm = permissions.find(p => p.resource === resource && p.action === action);
    return perm?.allowed ?? false;
}

/** Fetch users assigned to a specific security profile */
export function useProfileUsers(profileId: string | null) {
    return useQuery({
        queryKey: ['security-profile-users', profileId],
        queryFn: async () => {
            if (!profileId) return [];
            const result = await (supabase
                .from('profiles')
                .select('id, nome_completo, email, cargo, disabled') as any)
                .eq('security_profile_id', profileId);
            if (result.error) {
                if (result.error.message?.includes('schema cache')) return [];
                throw result.error;
            }
            return result.data ?? [];
        },
        enabled: !!profileId,
    });
}

// ─── Mutations ───────────────────────────────────────────────────

/** Create a new security profile */
export function useCreateSecurityProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, description }: { name: string; description?: string }) => {
            const { data, error } = await supabase
                .from('security_profiles' as any)
                .insert({ name, description } as any)
                .select()
                .single();
            if (error) throw error;
            return data as unknown as SecurityProfile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security-profiles'] });
        },
    });
}

/** Update a security profile */
export function useUpdateSecurityProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
            const { error } = await supabase
                .from('security_profiles' as any)
                .update({ name, description, updated_at: new Date().toISOString() } as any)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security-profiles'] });
        },
    });
}

/** Delete a security profile */
export function useDeleteSecurityProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('security_profiles' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security-profiles'] });
        },
    });
}

/** Toggle a single permission for a profile */
export function useTogglePermission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ profileId, resource, action, allowed }: {
            profileId: string;
            resource: string;
            action: string;
            allowed: boolean;
        }) => {
            const { error } = await supabase
                .from('security_profile_permissions' as any)
                .upsert(
                    { profile_id: profileId, resource, action, allowed } as any,
                    { onConflict: 'profile_id,resource,action' }
                );
            if (error) throw error;
        },
        onSuccess: (_, { profileId }) => {
            queryClient.invalidateQueries({ queryKey: ['security-profile-permissions', profileId] });
            queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
        },
    });
}

/** Bulk set permissions for a profile */
export function useBulkSetPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ profileId, permissions }: {
            profileId: string;
            permissions: { resource: string; action: string; allowed: boolean }[];
        }) => {
            const rows = permissions.map(p => ({
                profile_id: profileId,
                resource: p.resource,
                action: p.action,
                allowed: p.allowed,
            }));
            const { error } = await supabase
                .from('security_profile_permissions' as any)
                .upsert(rows as any, { onConflict: 'profile_id,resource,action' });
            if (error) throw error;
        },
        onSuccess: (_, { profileId }) => {
            queryClient.invalidateQueries({ queryKey: ['security-profile-permissions', profileId] });
            queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
        },
    });
}

/** Assign a security profile to a user */
export function useAssignSecurityProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, profileId }: { userId: string; profileId: string | null }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ security_profile_id: profileId } as any)
                .eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security-profile-users'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
            queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
        },
    });
}
