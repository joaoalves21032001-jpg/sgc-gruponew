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
        { count: cotacaoCount },
        { count: alteracaoCount },
      ] = await Promise.all([
        supabase.from('atividades').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('vendas').select('*', { count: 'exact', head: true }).in('status', ['analise', 'pendente']),
        supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('cotacoes').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('correction_requests').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      ]);
      // mfa_reset_requests may not be in generated types — query via any cast
      const { count: mfaCount } = await (supabase as any).from('mfa_reset_requests').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
      return (ativCount || 0) + (vendaCount || 0) + (accessCount || 0) + (cotacaoCount || 0) + (alteracaoCount || 0) + (mfaCount || 0);
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
