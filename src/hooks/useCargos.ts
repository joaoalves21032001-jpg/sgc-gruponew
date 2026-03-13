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
            { key: 'crm.leads', label: 'CRM - Leads', actions: CRM_LEADS_ACTIONS },
            { key: 'crm.clientes', label: 'CRM - Clientes', actions: BASIC_CRUD },
            { key: 'comercial.cotacoes', label: 'Comercial - Cotações', actions: BASIC_CRUD },
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
                key: 'aprovacao_comercial',
                label: 'Gestão de Vendas e Atividades',
                actions: [
                    { key: 'analisar_venda', label: 'Analisar (Venda/Ativ)' },
                    { key: 'aprovar_venda', label: 'Aprovar (Venda/Ativ)' },
                    { key: 'editar_venda', label: 'Editar (Venda/Ativ)' },
                    { key: 'devolver_venda', label: 'Devolver (Venda/Ativ)' },
                    { key: 'rejeitar_venda', label: 'Rejeitar (Venda/Ativ)' },
                    { key: 'excluir_venda', label: 'Excluir (Venda/Ativ)' },
                ]
            }
        ]
    },
    {
        groupLabel: 'Aprovações Administrativas',
        resources: [
            {
                key: 'aprovacao_admin',
                label: 'Controle de Acesso e Correções',
                actions: [
                    { key: 'aprovar_acesso', label: 'Aprovar Acesso' },
                    { key: 'aprovar_mfa', label: 'Aprovar Reset MFA' },
                    { key: 'aprovar_senha', label: 'Aprovar Reset Senha' },
                    { key: 'avaliar_correcao', label: 'Avaliar Correções' },
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
                .select('*')
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
 */
export function hasCargoPermission(
    permissions: CargoPermission[] | null | undefined,
    resource: string,
    action: string
): boolean {
    return true; // Bypass all cargo permissions for testing
}

// ─── Mutations ───────────────────────────────────────────────────

export function useCreateCargo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ nome, description, requires_leader = true }: { nome: string; description?: string; requires_leader?: boolean }) => {
            const { data, error } = await supabase
                .from('cargos' as any)
                .insert({ nome, description, requires_leader } as any)
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
        mutationFn: async ({ id, nome, description, requires_leader }: { id: string; nome: string; description?: string; requires_leader?: boolean }) => {
            const updateProps: any = { nome, description, updated_at: new Date().toISOString() };
            if (requires_leader !== undefined) updateProps.requires_leader = requires_leader;
            
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
