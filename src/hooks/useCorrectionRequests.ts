import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CorrectionRequestPayload {
    tipo: 'atividade' | 'venda' | 'lead';
    registroId: string;
    statusAtual: string;
    justificativa: string;
    alteracoesPropostas: {
        campo: string;
        valorAntigo: any;
        valorNovo: any;
    }[];
}

export function useSubmitCorrectionRequest() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CorrectionRequestPayload) => {
            if (!user) throw new Error('Not authenticated');

            // Fetch profile to get cargo_id for auto-approval permission
            const { data: profile } = await supabase.from('profiles').select('cargo_id').eq('id', user.id).maybeSingle();
            let isAutoApprove = false;
            if (profile?.cargo_id) {
                const { data: perm } = await supabase.from('cargo_permissions')
                    .select('allowed')
                    .eq('cargo_id', profile.cargo_id)
                    .eq('resource', 'aprovacao_admin')
                    .eq('action', 'avaliar_correcao')
                    .maybeSingle();
                isAutoApprove = perm?.allowed ?? false;
            }

            const structuredPayload = {
                registroId: payload.registroId,
                statusAtual: payload.statusAtual,
                justificativa: payload.justificativa,
                alteracoesPropostas: payload.alteracoesPropostas,
            };

            if (isAutoApprove) {
                // Auto-approve logic: apply changes directly
                const updateObj: Record<string, any> = {};

                // Convert string values to appropriate types based on column
                const numericCols = ['ligacoes', 'mensagens', 'cotacoes_enviadas', 'cotacoes_fechadas', 'cotacoes_nao_respondidas', 'follow_up', 'vidas', 'valor', 'tempo_follow_up_dias'];

                for (const a of payload.alteracoesPropostas) {
                    let val = a.valorNovo;
                    if (numericCols.includes(a.campo)) {
                        val = a.campo === 'valor' ? parseFloat(val) || 0 : parseInt(val) || 0;
                    }
                    if (val === '') val = null;
                    updateObj[a.campo] = val;
                }

                // Keep status as aprovado or return to pending? Auto-approve implies it's approved.
                // The original approval logic resets status to 'pendente' or 'analise', but for a manager we can keep it 'aprovado'.
                updateObj.status = 'aprovado';

                const table = payload.tipo === 'atividade' ? 'atividades' : payload.tipo === 'venda' ? 'vendas' : 'leads';

                if (Object.keys(updateObj).length > 0) {
                    const { error: updateError } = await supabase.from(table).update(updateObj as any).eq('id', payload.registroId);
                    if (updateError) throw updateError;
                }

                // Insert a resolved CR for auditing
                const { error: crError } = await supabase.from('correction_requests').insert({
                    user_id: user.id,
                    tipo: payload.tipo,
                    registro_id: payload.registroId,
                    motivo: JSON.stringify(structuredPayload),
                    status: 'resolvido',
                    admin_resposta: 'Aprovado automaticamente (Perfil de Gestão)',
                } as any);
                if (crError) throw crError;

                return { autoApproved: true, tipo: payload.tipo };

            } else {
                // Standard insert
                const { error } = await supabase.from('correction_requests').insert({
                    user_id: user.id,
                    tipo: payload.tipo,
                    registro_id: payload.registroId,
                    motivo: JSON.stringify(structuredPayload),
                    status: 'pendente'
                } as any);
                if (error) throw error;

                return { autoApproved: false, tipo: payload.tipo };
            }
        },
        onSuccess: (data) => {
            if (data.autoApproved) {
                toast.success(`Alteração aplicada automaticamente!`);
                const queryKey = data.tipo === 'atividade' ? 'atividades' : data.tipo === 'venda' ? 'vendas' : 'leads';
                const teamQueryKey = data.tipo === 'atividade' ? 'team-atividades' : data.tipo === 'venda' ? 'team-vendas' : 'leads';
                queryClient.invalidateQueries({ queryKey: [queryKey] });
                queryClient.invalidateQueries({ queryKey: [teamQueryKey] });
            } else {
                toast.success('Solicitação de alteração enviada ao supervisor!');
            }
            queryClient.invalidateQueries({ queryKey: ['my-correction-requests'] });
            queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao enviar solicitação.');
        }
    });
}
