import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeItem {
  id: string;
  content: string;
  categoria: string;
  created_at: string;
}

export function useKnowledgeBase() {
  return useQuery({
    queryKey: ['knowledge_base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base' as any)
        .select('id, content, categoria, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as KnowledgeItem[];
    },
  });
}

export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { content: string; categoria: string }) => {
      // NOTE: We only send the text content here. For a full production RAG,
      // the Supabase insert would either trigger an Edge Function webhook to calculate embeddings,
      // or we can calculate the embedding here via the Edge Function and then insert it.
      // For simplicity in this architecture, we will call our edge function to both create the embedding AND insert.
      // Let's create an 'embed' route in our copilot function or just assume a webhook doing the DB trigger.
      // Actually, since we need to generate embeddings, we must do it via Edge Function.
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Não autenticado');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'embed_knowledge', // Special action marker
          content: payload.content,
          categoria: payload.categoria,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao criar base de conhecimento');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base'] });
    },
  });
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_base' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base'] });
    },
  });
}
