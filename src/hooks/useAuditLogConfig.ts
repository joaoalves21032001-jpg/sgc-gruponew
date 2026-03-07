import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogConfig {
    id: string;
    event_key: string;
    event_label: string;
    category: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export const AUDIT_CATEGORIES = [
    { key: 'autenticacao', label: 'Autenticação' },
    { key: 'atividades', label: 'Atividades' },
    { key: 'vendas', label: 'Vendas' },
    { key: 'aprovacoes', label: 'Aprovações' },
    { key: 'crm', label: 'CRM' },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'inventario', label: 'Inventário' },
    { key: 'perfil', label: 'Perfil' },
    { key: 'sistema', label: 'Sistema' },
    { key: 'geral', label: 'Geral' },
];

export function useAuditLogConfig() {
    return useQuery({
        queryKey: ['audit-log-config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_log_config' as any)
                .select('*')
                .order('category')
                .order('event_label');
            if (error) {
                if (error.code === '42P01' || error.message?.includes('schema cache')) return [];
                throw error;
            }
            return (data ?? []) as unknown as AuditLogConfig[];
        },
    });
}

export function useToggleAuditLogEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
            const { error } = await supabase
                .from('audit_log_config' as any)
                .update({ enabled, updated_at: new Date().toISOString() } as any)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-log-config'] });
        },
    });
}

export function useCreateAuditLogEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ event_key, event_label, category, enabled }: {
            event_key: string;
            event_label: string;
            category: string;
            enabled: boolean;
        }) => {
            const { data, error } = await supabase
                .from('audit_log_config' as any)
                .insert({ event_key, event_label, category, enabled } as any)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-log-config'] });
        },
    });
}

export function useDeleteAuditLogEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('audit_log_config' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-log-config'] });
        },
    });
}

export function useUpdateAuditLogEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, event_label, category, enabled }: {
            id: string;
            event_label: string;
            category: string;
            enabled: boolean;
        }) => {
            const { error } = await supabase
                .from('audit_log_config' as any)
                .update({ event_label, category, enabled, updated_at: new Date().toISOString() } as any)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-log-config'] });
        },
    });
}
