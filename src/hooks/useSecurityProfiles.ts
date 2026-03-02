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

// All resources available in the system
export const RESOURCES = [
    { key: 'progresso', label: 'Meu Progresso' },
    { key: 'comercial', label: 'Registro de Atividades' },
    { key: 'minhas_acoes', label: 'Minhas Ações' },
    { key: 'crm', label: 'CRM' },
    { key: 'notificacoes', label: 'Notificações' },
    { key: 'aprovacoes', label: 'Aprovações' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'inventario', label: 'Inventário' },
    { key: 'equipe', label: 'Equipe' },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'logs_auditoria', label: 'Logs de Auditoria' },
    { key: 'configuracoes', label: 'Configurações' },
] as const;

export const ACTIONS = [
    { key: 'view', label: 'Visualizar' },
    { key: 'edit', label: 'Editar' },
    { key: 'approve', label: 'Aprovar' },
    { key: 'delete', label: 'Excluir' },
] as const;

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
    '/admin/logs': 'logs_auditoria',
    '/admin/configuracoes': 'configuracoes',
};

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
            if (error) throw error;
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
            if (error) throw error;
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
                // No profile assigned → fallback: all permissions granted (backward compat)
                return null;
            }
            const { data, error } = await supabase
                .from('security_profile_permissions' as any)
                .select('*')
                .eq('profile_id', profileId);
            if (error) throw error;
            return (data ?? []) as unknown as SecurityProfilePermission[];
        },
        enabled: !!user && !!profile,
    });
}

/**
 * Check if the current user has permission for a resource+action.
 * Returns true if:
 * - No security profile is assigned (backward compatibility)
 * - The permission is explicitly allowed
 */
export function hasPermission(
    permissions: SecurityProfilePermission[] | null | undefined,
    resource: string,
    action: string = 'view'
): boolean {
    // No profile assigned or permissions not loaded → allow everything (backward compat)
    if (!permissions) return true;
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
            if (result.error) throw result.error;
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
        onSuccess: (_, { profileId }) => {
            queryClient.invalidateQueries({ queryKey: ['security-profile-users'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
            queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
        },
    });
}
