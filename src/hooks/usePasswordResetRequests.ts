import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  motivo: string;
  encrypted_password: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  profiles?: {
    nome_completo: string;
    email: string;
  };
}

export function usePasswordResetRequests() {
  const queryClient = useQueryClient();

  // Real-time subscription: invalidate cache whenever any row changes/is deleted
  useEffect(() => {
    const channel = supabase
      .channel('pwd-reset-admin-watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'password_reset_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['password-reset-requests'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('password_reset_requests' as any)
          .select(`*`)
          // Filter out cancelled requests so they don't clutter the admin view
          .not('status', 'eq', 'cancelado')
          .order('requested_at', { ascending: false });
          
        if (error) {
          console.error('Erro ao buscar solicitacoes de senha:', error);
          return [];
        }

        const requests = (data ?? []) as any as PasswordResetRequest[];
        
        // Fetch profiles separately to avoid PostgREST foreign key relationship errors
        // since user_id references auth.users instead of public.profiles
        if (requests.length > 0) {
          const userIds = [...new Set(requests.map(r => r.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, nome_completo, email')
            .in('id', userIds);
            
          if (profilesData) {
            requests.forEach(req => {
              const p = profilesData.find(x => x.id === req.user_id);
              if (p) {
                req.profiles = { nome_completo: p.nome_completo, email: p.email };
              }
            });
          }
        }
        
        return requests;
      } catch (e) {
        console.error('Falha ao carregar solicitacoes de senha:', e);
        return [];
      }
    },
    retry: 1,
  });
}


export async function resolvePasswordResetRequest(requestId: string, action: 'aprovado' | 'recusado') {
  const { data, error } = await supabase.functions.invoke('resolve-password-reset', {
    body: { request_id: requestId, action },
  });

  if (error) {
    throw new Error(error.message || 'Erro de rede ou permissao.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function directPasswordReset(targetUserId: string, forceNewPassword: string) {
  const { data, error } = await supabase.functions.invoke('resolve-password-reset', {
    body: { action: 'force_reset', target_user_id: targetUserId, force_new_password: forceNewPassword },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao forçar nova senha.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
