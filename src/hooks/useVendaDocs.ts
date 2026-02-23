import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VendaDocumento } from '@/hooks/useVendas';

export function useVendaDocumentos(vendaId: string | null) {
  return useQuery({
    queryKey: ['venda-documentos', vendaId],
    queryFn: async () => {
      if (!vendaId) return [];
      const { data, error } = await supabase
        .from('venda_documentos')
        .select('*')
        .eq('venda_id', vendaId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as VendaDocumento[];
    },
    enabled: !!vendaId,
  });
}

export async function getDocumentUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage.from('venda-documentos').createSignedUrl(filePath, 3600);
  return data?.signedUrl || null;
}
