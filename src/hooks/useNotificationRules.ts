import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ─────────────────────────────────────────────
 * Notification Rules — editable event → audience mapping
 * ───────────────────────────────────────────── */

export interface NotificationRule {
    id: string;
    event_key: string;
    event_label: string;
    audience: string;
    enabled: boolean;
    created_at: string;
}

export const AUDIENCES = [
    { key: 'proprio', label: 'Próprio Usuário' },
    { key: 'lideranca_direta', label: 'Liderança Direta' },
    { key: 'gestores', label: 'Gestores (Supervisores/Gerentes)' },
    { key: 'admins', label: 'Administradores' },
    { key: 'todos', label: 'Todos' },
] as const;

export const EVENTS = [
    { key: 'atividade_registrada', label: 'Atividade Registrada', defaultAudience: 'lideranca_direta' },
    { key: 'atividade_alteracao', label: 'Solicitação de Alteração de Atividade', defaultAudience: 'lideranca_direta' },
    { key: 'venda_criada', label: 'Nova Venda Criada', defaultAudience: 'lideranca_direta' },
    { key: 'venda_aprovada', label: 'Venda Aprovada', defaultAudience: 'proprio' },
    { key: 'venda_devolvida', label: 'Venda Devolvida', defaultAudience: 'proprio' },
    { key: 'cotacao_aprovada', label: 'Cotação Aprovada', defaultAudience: 'proprio' },
    { key: 'cotacao_reprovada', label: 'Cotação Reprovada', defaultAudience: 'proprio' },
    { key: 'acesso_solicitado', label: 'Solicitação de Acesso', defaultAudience: 'gestores' },
    { key: 'acesso_aprovado', label: 'Acesso Aprovado', defaultAudience: 'proprio' },
    { key: 'acesso_rejeitado', label: 'Acesso Rejeitado', defaultAudience: 'proprio' },
    { key: 'aniversariante_mes', label: 'Aniversariante do Mês', defaultAudience: 'todos' },
    { key: 'lead_movido', label: 'Lead Movido de Etapa', defaultAudience: 'lideranca_direta' },
    { key: 'meta_batida', label: 'Meta Batida', defaultAudience: 'gestores' },
    { key: 'premiacao_adicionada', label: 'Premiação Adicionada', defaultAudience: 'proprio' },
] as const;

export function useNotificationRules() {
    return useQuery({
        queryKey: ['notification-rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notification_rules' as any)
                .select('*')
                .order('event_key');
            if (error) return [] as NotificationRule[];
            return (data ?? []) as unknown as NotificationRule[];
        },
    });
}

export function useToggleNotificationRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
            const { error } = await supabase
                .from('notification_rules' as any)
                .update({ enabled })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-rules'] }),
    });
}

export function useUpdateRuleAudience() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, audience }: { id: string; audience: string }) => {
            const { error } = await supabase
                .from('notification_rules' as any)
                .update({ audience })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-rules'] }),
    });
}

export function useCreateNotificationRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (rule: { event_key: string; event_label: string; audience: string; enabled: boolean }) => {
            const { error } = await supabase
                .from('notification_rules' as any)
                .insert(rule);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-rules'] }),
    });
}

export function useDeleteNotificationRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notification_rules' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-rules'] }),
    });
}

/* ─────────────────────────────────────────────
 * Rule-based notification dispatcher
 * ───────────────────────────────────────────── */

async function insertNotifications(recipientIds: string[], titulo: string, descricao: string, tipo: string, link?: string) {
    if (recipientIds.length === 0) return;
    const notifications = recipientIds.map(rid => ({
        user_id: rid,
        titulo,
        descricao,
        tipo,
        link: link || null,
        lida: false,
    }));
    await supabase.from('notifications').insert(notifications as any);
}

async function getRecipientsForAudience(audience: string, userId: string): Promise<string[]> {
    switch (audience) {
        case 'proprio':
            return [userId];

        case 'lideranca_direta': {
            const { data: profile } = await supabase
                .from('profiles')
                .select('supervisor_id, gerente_id')
                .eq('id', userId)
                .maybeSingle();
            if (!profile) return [];
            const recipients: string[] = [];
            if (profile.supervisor_id) recipients.push(profile.supervisor_id);
            if (profile.gerente_id && profile.gerente_id !== profile.supervisor_id) {
                recipients.push(profile.gerente_id);
            }
            return recipients;
        }

        case 'gestores': {
            const { data: leaders } = await supabase
                .from('profiles')
                .select('id, cargo')
                .eq('disabled', false);
            if (!leaders) return [];
            return leaders
                .filter(l => {
                    const c = l.cargo.toLowerCase();
                    return (c.includes('supervisor') || c.includes('gerente') || c.includes('diretor')) && l.id !== userId;
                })
                .map(l => l.id);
        }

        case 'admins': {
            const { data: admins } = await supabase
                .from('profiles')
                .select('id, cargo')
                .eq('disabled', false);
            if (!admins) return [];
            return admins
                .filter(a => a.cargo.toLowerCase().includes('diretor') || a.cargo.toLowerCase() === 'admin')
                .map(a => a.id);
        }

        case 'todos': {
            const { data: allUsers } = await supabase
                .from('profiles')
                .select('id')
                .eq('disabled', false);
            if (!allUsers) return [];
            return allUsers.map(u => u.id).filter(id => id !== userId);
        }

        default:
            return [];
    }
}

/**
 * Main dispatch function — checks notification_rules table
 * and sends notifications according to enabled rules.
 */
export async function dispatchNotification(
    eventKey: string,
    userId: string,
    titulo: string,
    descricao: string,
    tipo: string,
    link?: string
) {
    try {
        // Fetch all rules for this event
        const { data: rules, error } = await supabase
            .from('notification_rules' as any)
            .select('*')
            .eq('event_key', eventKey)
            .eq('enabled', true);

        if (error || !rules || rules.length === 0) {
            // Fallback: if no rules (table not migrated), use legacy direct leadership
            console.log(`[Notify] No rules found for ${eventKey}, skipping.`);
            return;
        }

        // For each enabled rule, resolve recipients and send
        for (const rule of rules) {
            const recipients = await getRecipientsForAudience((rule as any).audience, userId);
            if (recipients.length > 0) {
                await insertNotifications(recipients, titulo, descricao, tipo, link);
            }
        }
    } catch (err) {
        console.error(`[Notify] dispatchNotification error for ${eventKey}:`, err);
    }
}
