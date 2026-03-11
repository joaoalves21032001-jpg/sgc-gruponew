import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SystemError = {
  id: string;
  source: string;
  error_message: string;
  stack_trace: string | null;
  context_data: any;
  status: 'unresolved' | 'analyzing' | 'resolved' | 'ignored';
  ai_analysis: string | null;
  ai_recommendation: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function useStarkWatchdog() {
  return useQuery({
    queryKey: ['stark-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_errors' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SystemError[];
    },
  });
}

export function useUpdateStarkErrorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'resolved' | 'ignored' | 'unresolved' }) => {
      const { error } = await supabase
        .from('system_errors' as any)
        .update({ 
            status,
            resolved_at: status === 'resolved' ? new Date().toISOString() : null 
        })
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stark-errors'] });
    },
  });
}
