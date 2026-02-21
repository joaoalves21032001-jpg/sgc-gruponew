import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePendingApprovals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-approvals-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const [
        { count: ativCount },
        { count: vendaCount },
        { count: accessCount },
      ] = await Promise.all([
        supabase.from('atividades').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('vendas').select('*', { count: 'exact', head: true }).in('status', ['analise', 'pendente']),
        supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      ]);
      return (ativCount || 0) + (vendaCount || 0) + (accessCount || 0);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useMyPendingActions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-pending-actions-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const [
        { count: ativCount },
        { count: vendaCount },
      ] = await Promise.all([
        supabase.from('atividades').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pendente', 'devolvido']),
        supabase.from('vendas').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['analise', 'pendente', 'devolvido']),
      ]);
      return (ativCount || 0) + (vendaCount || 0);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
