import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  return useQuery({
    queryKey: ['password-reset-requests'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('password_reset_requests' as any)
          .select(`*, profiles:user_id(nome_completo, email)`)
          .order('requested_at', { ascending: false });
          
        if (error) {
          console.error('Erro ao buscar solicitacoes de senha:', error);
          return [];
        }
        return (data ?? []) as any as PasswordResetRequest[];
      } catch (e) {
        console.error('Falha ao carregar solicitacoes de senha:', e);
        return [];
      }
    },
    retry: 1,
  });
}

export async function resolvePasswordResetRequest(requestId: string, action: 'approve' | 'reject') {
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
