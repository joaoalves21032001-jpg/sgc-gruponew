import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TabPermission {
  tab_key: string;
  enabled: boolean;
}

// All configurable tabs with their keys
export const ALL_TABS = [
  { key: 'progresso', label: 'Meu Progresso' },
  { key: 'comercial', label: 'Registro de Atividades' },
  { key: 'minhas-acoes', label: 'Minhas Ações' },
  { key: 'crm', label: 'CRM' },
  { key: 'notificacoes', label: 'Notificações' },
  { key: 'inventario', label: 'Inventário' },
  { key: 'aprovacoes', label: 'Aprovações' },
  { key: 'gestao', label: 'Dashboard (Gestão)' },
];

// Hook: fetch own tab permissions
export function useMyTabPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tab-permissions', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_tab_permissions' as any)
        .select('tab_key, enabled')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []) as unknown as TabPermission[];
    },
    enabled: !!user,
  });
}

// Hook: fetch tab permissions for a specific user (admin use)
export function useUserTabPermissions(userId: string | null) {
  return useQuery({
    queryKey: ['tab-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_tab_permissions' as any)
        .select('tab_key, enabled')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as unknown as TabPermission[];
    },
    enabled: !!userId,
  });
}

// Check if a tab is visible for the current user
// Returns true if no permission record exists (default: visible)
export function isTabEnabled(permissions: TabPermission[], tabKey: string): boolean {
  const perm = permissions.find(p => p.tab_key === tabKey);
  if (!perm) return true; // default: visible
  return perm.enabled;
}

// Mutation: set tab permission for a user (admin only)
export function useSetTabPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, tabKey, enabled }: { userId: string; tabKey: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('user_tab_permissions' as any)
        .upsert({ user_id: userId, tab_key: tabKey, enabled }, { onConflict: 'user_id,tab_key' });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['tab-permissions', userId] });
    },
  });
}
