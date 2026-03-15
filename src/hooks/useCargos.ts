import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

// ─── Types ───────────────────────────────────────────────────────
export interface Cargo {
    id: string;
    nome: string;
    description: string | null;
    is_system: boolean;
    requires_leader: boolean;
    security_profile_id: string | null;
    is_protected?: boolean;
    protection_password?: string | null;
    protection_mfa_secret?: string | null;
    nivel_supervisao?: 'ninguem' | 'supervisor' | 'gerente' | 'diretor';
    created_at: string;
    updated_at: string;
}

export interface CargoPermission {
    id: string;
    cargo_id: string;
    resource: string;
    action: string;
    allowed: boolean;
}

export interface CargoActionDef {
    key: string;
    label: string;
}

export interface CargoResourceDef {
    key: string;
    label: string;
    actions: CargoActionDef[];
}

export interface CargoResourceGroupDef {
    groupLabel: string;
    resources: CargoResourceDef[];
}

// ─── Definition of available Cargo permissions ─────────────────────

const BASIC_CRUD: CargoActionDef[] = [
    { key: 'view', label: 'Visualizar' },
    { key: 'edit', label: 'Editar' }
];

const EXTENDED_CRUD: CargoActionDef[] = [
    { key: 'view', label: 'Visualizar' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' }
];

const CRM_LEADS_ACTIONS: CargoActionDef[] = [
    { key: 'view', label: 'Visualizar' },
    { key: 'edit', label: 'Editar' },
    { key: 'view_own', label: 'Ver Somente Meus' },
    { key: 'view_all', label: 'Ver Todos' }
];

export const CARGO_MODULES_DEF: CargoResourceGroupDef[] = [
    {
        groupLabel: 'Subguias: Registro de Atividades',
        resources: [
            { key: 'atividades.atividades', label: 'Atividades', actions: BASIC_CRUD },
            { key: 'atividades.vendas', label: 'Vendas', actions: BASIC_CRUD },
        ]
    },
    {
        groupLabel: 'Subguias: CRM & Comercial',
        resources: [
            { 
                key: 'crm.leads', 
                label: 'CRM - Leads', 
                actions: [
                    { key: 'view', label: 'Visualizar' },
                    { key: 'edit', label: 'Editar' },
                    { key: 'view_own', label: 'Ver Somente Meus' },
                    { key: 'view_all', label: 'Ver Todos' },
                    { key: 'create', label: 'Criar' },
                    { key: 'edit_leads', label: 'Editor Avançado' }
                ] 
            },
            { key: 'crm.clientes', label: 'CRM - Clientes', actions: BASIC_CRUD },
            { key: 'comercial.cotacoes', label: 'Comercial - Cotações', actions: BASIC_CRUD },
        ]
    },
    {
        groupLabel: 'Subguias: Minhas Ações',
        resources: [
            { key: 'minhas_acoes.pendentes', label: 'Pendentes', actions: BASIC_CRUD },
            { key: 'minhas_acoes.aprovados', label: 'Aprovados', actions: BASIC_CRUD },
            { key: 'minhas_acoes.devolvidos', label: 'Devolvidos', actions: BASIC_CRUD },
        ]
    },
    {
        groupLabel: 'Subguias: Inventário',
        resources: [
            { key: 'inventario.companhias', label: 'Companhias', actions: BASIC_CRUD },
            { key: 'inventario.produtos', label: 'Produtos', actions: BASIC_CRUD },
            { key: 'inventario.modalidades', label: 'Modalidades', actions: BASIC_CRUD },
        ]
    },
    {
        groupLabel: 'Subguias: Configurações Extras',
        resources: [
            { key: 'config.permissoes', label: 'Perfis de Segurança', actions: EXTENDED_CRUD },
            { key: 'config.cargos', label: 'Cargos e Funções', actions: EXTENDED_CRUD },
            { key: 'config.usuarios', label: 'Gerenciar Usuários', actions: [
                ...EXTENDED_CRUD,
                { key: 'reset_password', label: 'Resetar Senha' },
                { key: 'reset_mfa', label: 'Resetar MFA' },
            ]},
        ]
    },
    {
        groupLabel: 'Automações de Sistema',
        resources: [
            {
                key: 'automacao',
                label: 'Aprovações Automáticas',
                actions: [
                    { key: 'auto_aprovar_vendas', label: 'Vendas' },
                    { key: 'auto_aprovar_atividades', label: 'Atividades' },
                ]
            }
        ]
    },
    {
        groupLabel: 'Aprovações de Registros',
        resources: [
            {
                key: 'aprovacao_atividades',
                label: 'Atividades',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'editar', label: 'Editar' },
                    { key: 'devolver', label: 'Devolver' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            },
            {
                key: 'aprovacao_vendas',
                label: 'Vendas',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'editar', label: 'Editar' },
                    { key: 'devolver', label: 'Devolver' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            },
            {
                key: 'aprovacao_cotacoes',
                label: 'Cotações',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'editar', label: 'Editar' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            },
            {
                key: 'aprovacao_alteracoes',
                label: 'Alterações',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'editar', label: 'Editar' },
                    { key: 'devolver', label: 'Devolver' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            }
        ]
    },
    {
        groupLabel: 'Aprovações Administrativas',
        resources: [
            {
                key: 'aprovacao_admin_acesso',
                label: 'Acesso',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'editar', label: 'Editar' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            },
            {
                key: 'aprovacao_admin_mfa',
                label: 'MFA',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            },
            {
                key: 'aprovacao_admin_senha',
                label: 'Senha',
                actions: [
                    { key: 'analisar', label: 'Analisar' },
                    { key: 'aprovar', label: 'Aprovar' },
                    { key: 'rejeitar', label: 'Rejeitar' },
                    { key: 'excluir', label: 'Excluir' },
                ]
            }
        ]
    }
];

// ─── Hooks ───────────────────────────────────────────────────────

/** Fetch all cargos */
export function useCargos() {
    return useQuery({
        queryKey: ['cargos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cargos' as any)
                .select('id, nome, description, requires_leader, security_profile_id, is_protected, protection_password, protection_mfa_secret, nivel_supervisao, created_at')
                .order('created_at');
            if (error) {
                if (error.message?.includes('relation "public.cargos" does not exist') || error.code === '42P01') return [];
                throw error;
            }
            return (data ?? []) as unknown as Cargo[];
        },
    });
}

/** Fetch permissions for a specific cargo */
export function useCargoPermissions(cargoId: string | null) {
    return useQuery({
        queryKey: ['cargo-permissions', cargoId],
        queryFn: async () => {
            if (!cargoId) return [];
            const { data, error } = await supabase
                .from('cargo_permissions' as any)
                .select('*')
                .eq('cargo_id', cargoId);
            if (error) {
                if (error.code === '42P01') return [];
                throw error;
            }
            return (data ?? []) as unknown as CargoPermission[];
        },
        enabled: !!cargoId,
    });
}

/** Fetch the current user's cargo permissions */
export function useMyCargoPermissions() {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['my-cargo-permissions', user?.id, (profile as any)?.cargo_id],
        queryFn: async () => {
            const cargoId = (profile as any)?.cargo_id as string | undefined;
            if (!cargoId) return null;
            
            const { data, error } = await supabase
                .from('cargo_permissions' as any)
                .select('*')
                .eq('cargo_id', cargoId);
            if (error) {
                if (error.code === '42P01') return null;
                throw error;
            }
            return (data ?? []) as unknown as CargoPermission[];
        },
        enabled: !!user && !!profile,
    });
}

/**
 * Check if the user has a specific cargo permission.
 * Supports hierarchical check: if 'atividades' is denied, 'atividades.atividades' is auto-denied.
 */
export function hasCargoPermission(
    permissions: CargoPermission[] | null | undefined,
    resource: string,
    action: string
): boolean {
    // If permissions not loaded or empty, default to deny (safer)
    if (!permissions || permissions.length === 0) return false;

    // Direct match: exact resource + action
    const direct = permissions.find(p => p.resource === resource && p.action === action);
    if (direct) return direct.allowed;

    // Parent-level match: if resource is 'atividades.atividades', also check parent 'atividades'
    const dot = resource.lastIndexOf('.');
    if (dot !== -1) {
        const parent = resource.substring( dot + 1); // For cargos, we might need to check if we check parents
        // Actually, let's keep it consistent with hasPermission from useSecurityProfiles
        const parentKey = resource.substring(0, dot);
        const parentPerm = permissions.find(p => p.resource === parentKey && p.action === action);
        if (parentPerm) return parentPerm.allowed;
    }

    // No match found → deny
    return false;
}

// ─── Mutations ───────────────────────────────────────────────────

export function useCreateCargo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ nome, description, requires_leader = true, nivel_supervisao = 'supervisor' }: { nome: string; description?: string; requires_leader?: boolean; nivel_supervisao?: 'ninguem' | 'supervisor' | 'gerente' | 'diretor' }) => {
            const { data, error } = await supabase
                .from('cargos' as any)
                .insert({ nome, description, requires_leader, nivel_supervisao } as any)
                .select()
                .single();
            if (error) throw error;
            return data as unknown as Cargo;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
        },
    });
}

export function useUpdateCargo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, nome, description, requires_leader, protection_password, protection_mfa_secret, nivel_supervisao }: { 
            id: string; 
            nome: string; 
            description?: string; 
            requires_leader?: boolean;
            protection_password?: string | null;
            protection_mfa_secret?: string | null;
            nivel_supervisao?: 'ninguem' | 'supervisor' | 'gerente' | 'diretor';
        }) => {
            const updateProps: any = { nome };
            if (description !== undefined) updateProps.description = description;
            if (requires_leader !== undefined) updateProps.requires_leader = requires_leader;
            if (protection_password !== undefined) updateProps.protection_password = protection_password;
            if (protection_mfa_secret !== undefined) updateProps.protection_mfa_secret = protection_mfa_secret;
            if (nivel_supervisao !== undefined) updateProps.nivel_supervisao = nivel_supervisao;
            const { error } = await supabase
                .from('cargos' as any)
                .update(updateProps)
                .eq('id', id);
            if (error) throw error;
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
        },
    });
}

export function useDeleteCargo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('cargos' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
        },
    });
}

export function useToggleCargoPermission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ cargoId, resource, action, allowed }: {
            cargoId: string;
            resource: string;
            action: string;
            allowed: boolean;
        }) => {
            const { error } = await supabase
                .from('cargo_permissions' as any)
                .upsert(
                    { cargo_id: cargoId, resource, action, allowed } as any,
                    { onConflict: 'cargo_id,resource,action' }
                );
            if (error) throw error;
        },
        onSuccess: (_, { cargoId }) => {
            queryClient.invalidateQueries({ queryKey: ['cargo-permissions', cargoId] });
            queryClient.invalidateQueries({ queryKey: ['my-cargo-permissions'] });
        },
    });
}

/** Bulk set permissions for a cargo */
export function useBulkSetCargoPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ cargoId, permissions }: {
            cargoId: string;
            permissions: { resource: string; action: string; allowed: boolean }[];
        }) => {
            const payload = permissions.map(p => ({
                cargo_id: cargoId,
                resource: p.resource,
                action: p.action,
                allowed: p.allowed
            }));

            const { error } = await supabase
                .from('cargo_permissions' as any)
                .upsert(payload as any, { onConflict: 'cargo_id,resource,action' });
            
            if (error) throw error;
        },
        onSuccess: (_, { cargoId }) => {
            queryClient.invalidateQueries({ queryKey: ['cargo-permissions', cargoId] });
            queryClient.invalidateQueries({ queryKey: ['my-cargo-permissions'] });
        },
    });
}
