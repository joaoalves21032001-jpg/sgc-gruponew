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
    is_protected?: boolean;
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

const VIEW_ONLY_ACTIONS: ActionDef[] = [
    { key: 'view', label: 'Visualizador' }
];

/** Name constant used to enforce Super Admin immutability */
export const SUPER_ADMIN_PROFILE_NAME = 'superadmin';

/**
 * Full module permission matrix.
 * VIEW_ONLY_ACTIONS = Somente Visualizador
 * COMMON_ACTIONS    = Editor + Visualizador
 *
 * Macro layer: defines which tabs a user can open at all.
 * The Micro layer (Cargos) further filters what they can DO inside a tab.
 */
export const MODULES_DEF: ResourceGroupDef[] = [
    {
        groupLabel: 'Somente Visualizador',
        resources: [
            { key: 'progresso',      label: 'Meu Progresso',      actions: VIEW_ONLY_ACTIONS },
            { key: 'notificacoes',   label: 'Notificações',        actions: VIEW_ONLY_ACTIONS },
            { key: 'dashboard',      label: 'Dashboard',           actions: VIEW_ONLY_ACTIONS },
            { key: 'logs_auditoria', label: 'Logs de Auditoria',   actions: VIEW_ONLY_ACTIONS },
        ]
    },
    {
        groupLabel: 'Editor e Visualizador',
        resources: [
            { key: 'atividades',   label: 'Registro de Atividades', actions: COMMON_ACTIONS },
            { key: 'minhas_acoes', label: 'Minhas Ações',           actions: COMMON_ACTIONS },
            { key: 'crm',         label: 'CRM',                    actions: COMMON_ACTIONS },
            { key: 'aprovacoes',  label: 'Aprovações',             actions: COMMON_ACTIONS },
            { key: 'inventario',  label: 'Inventário',             actions: COMMON_ACTIONS },
            { key: 'equipe',      label: 'Equipe',                 actions: COMMON_ACTIONS },
            { key: 'configuracoes', label: 'Configurações',        actions: COMMON_ACTIONS },
        ]
    }
];

/** All resource keys that Super Admin must have ALL permissions on */
export const ALL_RESOURCE_KEYS_WITH_ACTIONS = MODULES_DEF.flatMap(g =>
    g.resources.flatMap(r => r.actions.map(a => ({ resource: r.key, action: a.key })))
);

// Map sidebar paths → resource keys (Macro level check)
export const PATH_TO_RESOURCE: Record<string, string> = {
    '/': 'progresso',
    '/minhas-acoes': 'minhas_acoes',
    '/crm': 'crm',
    '/notificacoes': 'notificacoes',
    '/aprovacoes': 'aprovacoes',
    '/gestao': 'dashboard',
    '/inventario': 'inventario',
    '/equipe': 'equipe',
    '/admin/usuarios': 'configuracoes',
    '/admin/solicitacoes': 'configuracoes',
    '/admin/logs': 'logs_auditoria',
    '/admin/configuracoes': 'configuracoes',
    // Atividades routes
    '/atividades': 'atividades',
    '/vendas': 'atividades',
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
                .select('id, name, description, is_system, is_protected, created_at, updated_at')
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
        queryKey: ['my-permissions', user?.id, profile?.cargo_id],
        queryFn: async () => {
            const cargoId = profile?.cargo_id;
            if (!cargoId) {
                return null;
            }
            
            // fetch cargo to find security_profile_id
            const result = await supabase
                .from('cargos' as any)
                .select('security_profile_id')
                .eq('id', cargoId)
                .maybeSingle();
            const cargoData = result.data as any;
            const cargoError = result.error;
                
            if (cargoError) throw cargoError;
            const profileId = cargoData?.security_profile_id;
            if (!profileId) return null;

            const { data: spData, error: spError } = await supabase
                .from('security_profile_permissions' as any)
                .select('*')
                .eq('profile_id', profileId);
            if (spError) {
                if (spError.message?.includes('schema cache') || spError.code === '42P01') return null;
                throw spError;
            }

            const { data: cpData, error: cpError } = await supabase
                .from('cargo_permissions' as any)
                .select('*')
                .eq('cargo_id', cargoId);

            if (cpError && cpError.code !== '42P01') {
                throw cpError;
            }

            const spPerms = (spData ?? []) as unknown as SecurityProfilePermission[];
            const cpPerms = (cpData ?? []) as any[];

            // Merge permissions: Cargo permissions further restrict Security Profile permissions.
            // If a cargo permission is defined, it overrides the SP allowed status (boolean AND).
            // If not defined, it defaults to true (no restriction).
            return spPerms.map(sp => {
                const cp = cpPerms.find(c => c.resource === sp.resource && c.action === sp.action);
                const cargoAllowed = cp ? cp.allowed : true;
                return {
                    ...sp,
                    allowed: sp.allowed && cargoAllowed
                };
            });
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
    // If permissions array is null/undefined it means we haven't loaded yet — default deny
    if (permissions === undefined || permissions === null) return false;

    // Empty array = no permissions configured = deny all
    if (permissions.length === 0) return false;

    // Direct match: exact resource + action
    const direct = permissions.find(p => p.resource === resource && p.action === action);
    if (direct) return direct.allowed;

    // Parent-level match: if resource is 'crm.leads', also check parent 'crm'
    const dot = resource.lastIndexOf('.');
    if (dot !== -1) {
        const parent = resource.substring(0, dot);
        const parentPerm = permissions.find(p => p.resource === parent && p.action === action);
        if (parentPerm) return parentPerm.allowed;
    }

    // No match found → deny
    return false;
}

/** Fetch cargos assigned to a specific security profile */
export function useProfileCargos(profileId: string | null) {
    return useQuery({
        queryKey: ['security-profile-cargos', profileId],
        queryFn: async () => {
            if (!profileId) return [];
            const result = await supabase
                .from('cargos' as any)
                .select('id, nome, description')
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

/** Assign a security profile to a cargo */
export function useAssignSecurityProfileToCargo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ cargoId, profileId }: { cargoId: string; profileId: string | null }) => {
            const { error } = await supabase
                .from('cargos')
                .update({ security_profile_id: profileId } as any)
                .eq('id', cargoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security-profile-cargos'] });
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
            queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
        },
    });
}
