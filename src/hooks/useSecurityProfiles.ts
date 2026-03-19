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
    protection_password?: string | null;
    protection_mfa_secret?: string | null;
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
            { key: 'dashboard',      label: 'Painel de Gestão',    actions: VIEW_ONLY_ACTIONS },
            { key: 'logs_auditoria', label: 'Logs de Auditoria',   actions: VIEW_ONLY_ACTIONS },
        ]
    },
    {
        groupLabel: 'Editor e Visualizador',
        resources: [
            { key: 'atividades',   label: 'Registro de Atividades', actions: COMMON_ACTIONS },
            { key: 'minhas_acoes', label: 'Minhas Ações',           actions: COMMON_ACTIONS },
            { 
                key: 'crm', 
                label: 'CRM', 
                actions: [
                    { key: 'view', label: 'Visualizador' },
                    { key: 'edit', label: 'Editor' }
                ] 
            },
            { key: 'aprovacoes',  label: 'Aprovações',             actions: COMMON_ACTIONS },
            { key: 'inventario',  label: 'Inventário',             actions: COMMON_ACTIONS },
            { key: 'equipe',      label: 'Equipe',                 actions: COMMON_ACTIONS },
            { key: 'usuarios',    label: 'Usuários',               actions: COMMON_ACTIONS },
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
    '/admin/usuarios': 'usuarios',
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
                .select('id, name, description, is_system, is_protected, protection_password, protection_mfa_secret, created_at, updated_at')
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

// ─── Cargo micro resource → SP macro resource rollup ─────────────────────────
// This maps CARGO_MODULES_DEF keys (granular) to MODULES_DEF keys (macro/sidebar)
const CARGO_TO_SP_MACRO: Record<string, string> = {
    'atividades.atividades':     'atividades',
    'atividades.vendas':         'atividades',
    'crm.leads':                 'crm',
    'crm.clientes':              'crm',
    'comercial.cotacoes':        'crm',
    'minhas_acoes.pendentes':    'minhas_acoes',
    'minhas_acoes.aprovados':    'minhas_acoes',
    'minhas_acoes.devolvidos':   'minhas_acoes',
    'inventario.companhias':     'inventario',
    'inventario.produtos':       'inventario',
    'inventario.modalidades':    'inventario',
    'config.permissoes':         'configuracoes',
    'config.cargos':             'configuracoes',
    'config.usuarios':           'usuarios',
    'aprovacao_atividades':      'aprovacoes',
    'aprovacao_vendas':          'aprovacoes',
    'aprovacao_cotacoes':        'aprovacoes',
    'aprovacao_alteracoes':      'aprovacoes',
    'aprovacao_admin_acesso':    'aprovacoes',
    'aprovacao_admin_mfa':       'aprovacoes',
    'aprovacao_admin_senha':     'aprovacoes',
    'automacao':                 'configuracoes',
};

// Cargo-specific actions that map to macro 'view' or 'edit' for sidebar checks
const CARGO_ACTION_TO_MACRO: Record<string, string> = {
    'view':       'view',
    'edit':       'edit',
    'view_own':   'view',
    'view_all':   'view',
    'create':     'edit',
    'edit_leads': 'edit',
    'analisar':   'view',
    'aprovar':    'edit',
    'devolver':   'edit',
    'rejeitar':   'edit',
    'excluir':    'edit',
    'delete':     'edit',
    'reset_password': 'edit',
    'reset_mfa':      'edit',
    'auto_aprovar_vendas':      'edit',
    'auto_aprovar_atividades':  'edit',
};

/** Fetch the current user's permissions based on their assigned security profile.
 *
 * PERMISSION AUTHORITY ORDER (from most to least authoritative):
 * 1. If the cargo has explicit cargo_permissions → those are the AUTHORITY.
 *    Macro-level (sidebar) permissions are derived by rolling up micro cargo resources.
 *    The SP linked to the cargo acts as a CEILING (AND).
 * 2. If the cargo has NO cargo_permissions → SP linked to cargo is used as fallback.
 *
 * This ensures that a "Gerente" cargo linked to "Editor e Visualizador" (SP with all perms)
 * does NOT automatically inherit everything — only what the Gerente's own cargo_permissions
 * explicitly grants.
 */
export function useMyPermissions() {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['my-permissions', user?.id, (profile as any)?.cargo_id, (profile as any)?.security_profile_id],
        queryFn: async () => {
            const cargoId = (profile as any)?.cargo_id as string | undefined;
            // Security profile can come from the profile directly OR the linked cargo
            const profileSpId = (profile as any)?.security_profile_id as string | undefined;

            if (!cargoId && !profileSpId) {
                return null;
            }

            let profileId: string | null = null;

            if (cargoId) {
                // Fetch cargo to find security_profile_id (used as ceiling)
                const result = await supabase
                    .from('cargos' as any)
                    .select('security_profile_id')
                    .eq('id', cargoId)
                    .maybeSingle();
                const cargoData = result.data as any;
                const cargoError = result.error;
                if (cargoError) throw cargoError;
                // Prefer cargo's SP; fall back to user's own SP
                profileId = cargoData?.security_profile_id ?? profileSpId ?? null;
            } else {
                profileId = profileSpId ?? null;
            }

            // Fetch linked SP permissions (ceiling)
            let spPerms: SecurityProfilePermission[] = [];
            if (profileId) {
                const { data: spData, error: spError } = await supabase
                    .from('security_profile_permissions' as any)
                    .select('*')
                    .eq('profile_id', profileId);
                if (spError && spError.code !== '42P01') throw spError;
                spPerms = (spData ?? []) as unknown as SecurityProfilePermission[];
            }

            // Fetch cargo direct permissions (authority)
            let cpPerms: any[] = [];
            if (cargoId) {
                const { data: cpData, error: cpError } = await supabase
                    .from('cargo_permissions' as any)
                    .select('*')
                    .eq('cargo_id', cargoId);
                if (cpError && cpError.code !== '42P01') throw cpError;
                cpPerms = (cpData ?? []) as any[];
            }

            // ── If cargo has NO direct permissions → use SP as fallback ─────────────────
            if (cpPerms.length === 0) {
                return spPerms;
            }

            // ── Cargo has direct permissions → derive macro-level permissions from cargo ──
            const macroMatrix: Record<string, Record<string, boolean>> = {};

            for (const cp of cpPerms) {
                const macro = CARGO_TO_SP_MACRO[cp.resource] ?? cp.resource;
                const macroAction = CARGO_ACTION_TO_MACRO[cp.action] ?? 'view';

                if (!macroMatrix[macro]) macroMatrix[macro] = {};
                if (cp.allowed) {
                    macroMatrix[macro][macroAction] = true;
                } else if (macroMatrix[macro][macroAction] === undefined) {
                    macroMatrix[macro][macroAction] = false;
                }
            }

            // ── Apply SP as CEILING: cargo can only RESTRICT, never expand beyond SP ──────
            const merged: SecurityProfilePermission[] = spPerms.map(sp => {
                const cargoAllowed = macroMatrix[sp.resource]?.[sp.action];
                return {
                    ...sp,
                    allowed: sp.allowed && (cargoAllowed !== false),
                };
            });

            // ── Append granular cargo permissions (micro layer) for in-module checks ──
            for (const cp of cpPerms) {
                const alreadyInMerged = merged.some(m => m.resource === cp.resource && m.action === cp.action);
                if (alreadyInMerged) continue;

                merged.push({
                    id: cp.id,
                    profile_id: profileId ?? cargoId,
                    resource: cp.resource,
                    action: cp.action,
                    allowed: cp.allowed,
                });
            }

            return merged;
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
    // Guard against undefined/null inputs
    if (!resource || !permissions || permissions.length === 0) return false;

    // Direct match: exact resource + action (useMyPermissions already pre-merged SP ceiling × cargo)
    const direct = permissions.find(p => p.resource === resource && p.action === action);
    if (direct) return direct.allowed;

    // Parent-level match fallback: if 'crm.leads', also check parent 'crm'
    const dot = resource.lastIndexOf('.');
    if (dot !== -1) {
        const parent = resource.substring(0, dot);
        const parentPerm = permissions.find(p => p.resource === parent && p.action === action);
        if (parentPerm) return parentPerm.allowed;
    }

    // Macro resource fallback (cargo sub-resources mapped to SP macros)
    const macro = CARGO_TO_SP_MACRO[resource];
    if (macro && macro !== resource) {
        const macroAction = CARGO_ACTION_TO_MACRO[action] ?? action;
        const macroPerm = permissions.find(p => p.resource === macro && p.action === macroAction);
        if (macroPerm) return macroPerm.allowed;
    }

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
        mutationFn: async ({ id, name, description, is_protected, protection_password, protection_mfa_secret }: { 
            id: string; 
            name: string; 
            description?: string;
            is_protected?: boolean;
            protection_password?: string | null;
            protection_mfa_secret?: string | null;
        }) => {
            const { error } = await supabase
                .from('security_profiles' as any)
                .update({ 
                    name, 
                    description, 
                    is_protected,
                    protection_password,
                    protection_mfa_secret,
                    updated_at: new Date().toISOString() 
                } as any)
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
