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
      const isAutoApprove = userRole === 'gerente';

      const { data, error } = await supabase
        .from('atividades')
        .insert({
          ...atividade,
          user_id: user.id,
          ...(isAutoApprove ? { status: 'aprovado' } : {}),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return { ...data, _userRole: userRole };
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });

      const userRole = data._userRole;

      // Send email notification (fire and forget)
      // Supervisors: auto-approved but email gerente
      // Gerentes: auto-approved, no email
      if (userRole !== 'gerente') {
        try {
          const { data: profile } = await supabase.from('profiles').select('nome_completo').eq('id', user!.id).single();
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'atividade_registrada',
              data: {
                user_id: user!.id,
                user_name: profile?.nome_completo || user!.email,
                data: data.data,
                ligacoes: data.ligacoes,
                mensagens: data.mensagens,
                cotacoes_enviadas: data.cotacoes_enviadas,
                follow_up: data.follow_up,
                auto_aprovado: userRole === 'supervisor',
              },
            },
          });
        } catch (e) {
          console.error('Notification error:', e);
        }
      }
    },
  });
}
