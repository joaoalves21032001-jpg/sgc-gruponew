import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Companhias ───
export interface Companhia {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export function useCompanhias() {
  return useQuery({
    queryKey: ['companhias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companhias').select('*').order('nome');
      if (error) throw error;
      return (data ?? []) as Companhia[];
    },
  });
}

export function useCreateCompanhia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from('companhias').insert({ nome } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companhias'] }),
  });
}

export function useUpdateCompanhia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('companhias').update({ nome } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companhias'] }),
  });
}

export function useDeleteCompanhia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companhias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companhias'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
    },
  });
}

// ─── Produtos ───
export interface Produto {
  id: string;
  nome: string;
  companhia_id: string;
  created_at: string;
  updated_at: string;
}

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('*').order('nome');
      if (error) throw error;
      return (data ?? []) as Produto[];
    },
  });
}

export function useCreateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, companhia_id }: { nome: string; companhia_id: string }) => {
      const { data, error } = await supabase.from('produtos').insert({ nome, companhia_id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

export function useUpdateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome, companhia_id }: { id: string; nome: string; companhia_id: string }) => {
      const { error } = await supabase.from('produtos').update({ nome, companhia_id } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

// ─── Modalidades ───
export interface Modalidade {
  id: string;
  nome: string;
  documentos_obrigatorios: string[];
  documentos_opcionais: string[];
  quantidade_vidas: string;
  created_at: string;
  updated_at: string;
}

export function useModalidades() {
  return useQuery({
    queryKey: ['modalidades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modalidades').select('*').order('nome');
      if (error) throw error;
      return (data ?? []) as Modalidade[];
    },
  });
}

export function useCreateModalidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { nome: string; documentos_obrigatorios: string[]; documentos_opcionais: string[]; quantidade_vidas: string }) => {
      const { data, error } = await supabase.from('modalidades').insert(m as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modalidades'] }),
  });
}

export function useUpdateModalidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: string; nome: string; documentos_obrigatorios: string[]; documentos_opcionais: string[]; quantidade_vidas: string }) => {
      const { error } = await supabase.from('modalidades').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modalidades'] }),
  });
}

export function useDeleteModalidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modalidades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modalidades'] }),
  });
}

// ─── Leads ───
export interface Lead {
  id: string;
  tipo: string;
  nome: string;
  contato: string | null;
  email: string | null;
  cpf: string | null;
  cnpj: string | null;
  endereco: string | null;
  doc_foto_path: string | null;
  cartao_cnpj_path: string | null;
  comprovante_endereco_path: string | null;
  boletos_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  idade: number | null;
  peso: string | null;
  altura: string | null;
  livre: boolean;
  origem: string | null;
  stage_id: string | null;
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('nome');
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data, error } = await supabase.from('leads').insert(lead as any).select().single();
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Lead> & { id: string }) => {
      const { error } = await supabase.from('leads').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
