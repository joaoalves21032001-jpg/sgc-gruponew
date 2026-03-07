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
  cotacoes_nao_respondidas?: number;
  follow_up: number;
  motivo_recusa?: string | null;
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
      return (data ?? []) as unknown as Atividade[];
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
      return (data ?? []) as unknown as Atividade[];
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

      // Check for existing record on this date
      const { data: existing } = await supabase
        .from('atividades')
        .select('id')
        .eq('user_id', user.id)
        .eq('data', atividade.data)
        .maybeSingle();

      if (existing) {
        throw new Error('Você já possui um registro para este dia. Para alterar, acesse a guia "Minhas Ações" e solicite a alteração do registro.');
      }

      // Check if user is gerente or above for auto-approval
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      const userRole = roleData?.role;
      const isAutoApprove = ['gerente', 'diretor', 'administrador'].includes(userRole || '');

      const payload = {
        ...atividade,
        user_id: user.id,
        ...(isAutoApprove ? { status: 'aprovado' } : {}),
      } as any;

      let result = await supabase
        .from('atividades')
        .insert(payload)
        .select()
        .single();

      // If insert fails because of an unknown column, strip and retry
      if (result.error && result.error.message?.includes('schema cache')) {
        const match = result.error.message.match(/\'(\w+)\'/);
        if (match) delete payload[match[1]];
        result = await supabase
          .from('atividades')
          .insert(payload)
          .select()
          .single();
      }
      if (result.error) throw result.error;
      // Append computed cotacoes_nao_respondidas even if DB column doesn't exist
      const returned = result.data as any;
      if (returned.cotacoes_nao_respondidas === undefined || returned.cotacoes_nao_respondidas === null) {
        returned.cotacoes_nao_respondidas = Math.max(0, (returned.cotacoes_enviadas ?? 0) - (returned.cotacoes_fechadas ?? 0));
      }
      return { ...returned, _userRole: userRole };
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
    },
  });
}
