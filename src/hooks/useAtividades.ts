import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Atividade {
  id: string;
  user_id: string;
  data: string;
  ligacoes: number;
  mensagens: number;
  cotacoes_enviadas: number;
  cotacoes_fechadas: number;
  follow_up: number;
  created_at: string;
  updated_at: string;
}

export function useMyAtividades() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['atividades', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Atividade[];
    },
    enabled: !!user,
  });
}

export function useTeamAtividades() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-atividades', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .order('data', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Atividade[];
    },
    enabled: !!user,
  });
}

export function useCreateAtividade() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (atividade: Omit<Atividade, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('atividades')
        .upsert({
          ...atividade,
          user_id: user.id,
        }, { onConflict: 'user_id,data' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
    },
  });
}
