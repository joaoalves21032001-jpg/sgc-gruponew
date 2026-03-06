import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MfaResetRequest {
    id: string;
    user_id: string;
    motivo: string;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    admin_id: string | null;
    admin_resposta: string | null;
    created_at: string;
    updated_at: string;
}

/** Fetch all MFA reset requests (for Aprovações) */
export function useMfaResetRequests() {
    return useQuery({
        queryKey: ['mfa-reset-requests'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('mfa_reset_requests' as any)
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) return [];
                return (data ?? []) as unknown as MfaResetRequest[];
            } catch {
                return [] as MfaResetRequest[];
            }
        },
        retry: false,
    });
}

/** Submit an MFA reset request (user self-request) */
export async function requestMfaReset(userId: string, motivo: string) {
    const { error } = await supabase
        .from('mfa_reset_requests' as any)
        .insert({ user_id: userId, motivo } as any);
    if (error) throw error;
}

/** Call the Edge Function to actually reset MFA factors */
export async function resetMfaFactors(userId: string) {
    const { data, error } = await supabase.functions.invoke('reset-mfa', {
        body: { user_id: userId },
    });
    if (error) throw error;
    return data;
}

/** Approve an MFA reset request */
export async function approveMfaReset(requestId: string, adminId: string) {
    // Get the request to find user_id
    const { data: req, error: fetchErr } = await supabase
        .from('mfa_reset_requests' as any)
        .select('user_id')
        .eq('id', requestId)
        .single();
    if (fetchErr) throw fetchErr;

    // Call Edge Function to reset MFA factors
    await resetMfaFactors((req as any).user_id);

    // Update request status
    const { error } = await supabase
        .from('mfa_reset_requests' as any)
        .update({
            status: 'aprovado',
            admin_id: adminId,
            updated_at: new Date().toISOString(),
        } as any)
        .eq('id', requestId);
    if (error) throw error;
}

/** Reject an MFA reset request */
export async function rejectMfaReset(requestId: string, adminId: string, adminResposta: string) {
    const { error } = await supabase
        .from('mfa_reset_requests' as any)
        .update({
            status: 'rejeitado',
            admin_id: adminId,
            admin_resposta: adminResposta,
            updated_at: new Date().toISOString(),
        } as any)
        .eq('id', requestId);
    if (error) throw error;
}
