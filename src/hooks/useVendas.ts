import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Venda {
  id: string;
  user_id: string;
  nome_titular: string;
  modalidade: 'PF' | 'Familiar' | 'PME Multi' | 'Empresarial' | 'Adesão';
  status: 'analise' | 'pendente' | 'aprovado' | 'recusado';
  vidas: number;
  valor: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendaDocumento {
  id: string;
  venda_id: string;
  nome: string;
  tipo: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

export function useMyVendas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendas', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Venda[];
    },
    enabled: !!user,
  });
}

export function useTeamVendas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-vendas', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Venda[];
    },
    enabled: !!user,
  });
}

export function useCreateVenda() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (venda: { nome_titular: string; modalidade: string; vidas: number; valor?: number; observacoes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('vendas')
        .insert({
          ...venda,
          user_id: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['team-vendas'] });
    },
  });
}

export function useUpdateVendaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string; status: string; observacoes?: string }) => {
      const { data, error } = await supabase
        .from('vendas')
        .update({ status, observacoes } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['team-vendas'] });
    },
  });
}

export async function uploadVendaDocumento(vendaId: string, userId: string, file: File, tipo: string) {
  const filePath = `${userId}/${vendaId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('venda-documentos')
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from('venda_documentos')
    .insert({
      venda_id: vendaId,
      nome: file.name,
      tipo,
      file_path: filePath,
      file_size: file.size,
    });
  if (dbError) throw dbError;

  return filePath;
}
