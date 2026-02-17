import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadStage {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadStages() {
  return useQuery({
    queryKey: ['lead-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_stages')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return (data ?? []) as LeadStage[];
    },
  });
}

export function useCreateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: { nome: string; cor: string; ordem: number }) => {
      const { data, error } = await supabase
        .from('lead_stages')
        .insert(stage as any)
        .select()
        .single();
      if (error) throw error;
      return data as LeadStage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-stages'] }),
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: string; nome?: string; cor?: string; ordem?: number }) => {
      const { error } = await supabase
        .from('lead_stages')
        .update(rest as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-stages'] }),
  });
}

export function useDeleteLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-stages'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLeadStageOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stages: { id: string; ordem: number }[]) => {
      for (const s of stages) {
        const { error } = await supabase
          .from('lead_stages')
          .update({ ordem: s.ordem } as any)
          .eq('id', s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-stages'] }),
  });
}

export function useMoveLeadToStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string | null }) => {
      const { error } = await supabase
        .from('leads')
        .update({ stage_id: stageId } as any)
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
