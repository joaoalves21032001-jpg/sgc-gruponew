import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function useAuditLogs(filters?: {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.userId && filters.userId !== 'todos') {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.action && filters.action !== 'todos') {
        query = query.eq('action', filters.action);
      }
      if (filters?.entityType && filters.entityType !== 'todos') {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });
}

export function useLogAction() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return async (action: string, entityType?: string, entityId?: string, details?: Record<string, any>) => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: profile?.nome_completo || user.email,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        details: details || null,
      } as any);
    } catch (e) {
      console.error('Audit log error:', e);
    }
  };
}
