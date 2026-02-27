import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

/* ─────────────────────────────────────────────
 * Notification helpers — scoped by audience
 * ───────────────────────────────────────────── */

type NotifyPayload = {
  titulo: string;
  descricao: string;
  tipo: string;
  link?: string;
};

/** Insert notification rows for a list of recipient IDs */
async function insertNotifications(recipientIds: string[], payload: NotifyPayload) {
  if (recipientIds.length === 0) return;
  const notifications = recipientIds.map(rid => ({
    user_id: rid,
    titulo: payload.titulo,
    descricao: payload.descricao,
    tipo: payload.tipo,
    link: payload.link || null,
    lida: false,
  }));
  await supabase.from('notifications').insert(notifications as any);
}

/**
 * Notify only the user themselves (e.g. when their venda is returned).
 */
export async function notifySelf(
  userId: string,
  titulo: string,
  descricao: string,
  tipo: string,
  link?: string
) {
  try {
    await insertNotifications([userId], { titulo, descricao, tipo, link });
  } catch (err) {
    console.error('notifySelf error:', err);
  }
}

/**
 * Notify the user's direct supervisor + gerente (hierarquia direta).
 */
export async function notifyDirectLeadership(
  userId: string,
  titulo: string,
  descricao: string,
  tipo: string,
  link?: string
) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('supervisor_id, gerente_id')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return;
    const recipients: string[] = [];
    if (profile.supervisor_id) recipients.push(profile.supervisor_id);
    if (profile.gerente_id && profile.gerente_id !== profile.supervisor_id) {
      recipients.push(profile.gerente_id);
    }
    await insertNotifications(recipients, { titulo, descricao, tipo, link });
  } catch (err) {
    console.error('notifyDirectLeadership error:', err);
  }
}

/**
 * Notify all supervisors, gerentes, and diretores system-wide.
 */
export async function notifyGlobalLeaders(
  excludeUserId: string,
  titulo: string,
  descricao: string,
  tipo: string,
  link?: string
) {
  try {
    const { data: leaders } = await supabase
      .from('profiles')
      .select('id')
      .in('cargo', ['supervisor', 'gerente', 'diretor']);
    if (!leaders) return;
    const recipients = leaders.map(l => l.id).filter(id => id !== excludeUserId);
    await insertNotifications(recipients, { titulo, descricao, tipo, link });
  } catch (err) {
    console.error('notifyGlobalLeaders error:', err);
  }
}

/**
 * Notify only admin-level users.
 */
export async function notifyAdmins(
  titulo: string,
  descricao: string,
  tipo: string,
  link?: string
) {
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('cargo', 'admin');
    if (!admins) return;
    await insertNotifications(admins.map(a => a.id), { titulo, descricao, tipo, link });
  } catch (err) {
    console.error('notifyAdmins error:', err);
  }
}

/**
 * Legacy — notifies direct supervisor + gerente + all diretores.
 * Kept for backward compatibility. New code should prefer the scoped helpers.
 */
export async function notifyHierarchy(
  userId: string,
  titulo: string,
  descricao: string,
  tipo: string,
  link?: string
) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('supervisor_id, gerente_id, nome_completo')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return;

    const recipients: string[] = [];
    if (profile.supervisor_id) recipients.push(profile.supervisor_id);
    if (profile.gerente_id && profile.gerente_id !== profile.supervisor_id) {
      recipients.push(profile.gerente_id);
    }

    // Also notify directors
    const { data: directors } = await supabase
      .from('profiles')
      .select('id')
      .eq('cargo', 'diretor');
    if (directors) {
      for (const d of directors) {
        if (!recipients.includes(d.id) && d.id !== userId) {
          recipients.push(d.id);
        }
      }
    }

    await insertNotifications(recipients, { titulo, descricao, tipo, link });
  } catch (err) {
    console.error('notifyHierarchy error:', err);
  }
}

export interface Notification {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Trigger cleanup of old read notifications
      await supabase.rpc('cleanup_read_notifications' as any);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.lida).length ?? 0;
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ lida: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAsUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ lida: false } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllAsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from('notifications').update({ lida: true } as any).eq('user_id', user.id).eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useNotificationConfig() {
  return useQuery({
    queryKey: ['notification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config' as any)
        .select('*')
        .eq('key', 'notification_auto_delete_days')
        .single();
      if (error) throw error;
      return data as unknown as { key: string; value: string };
    },
  });
}

export function useUpdateNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: number) => {
      const { error } = await supabase
        .from('system_config' as any)
        .update({ value: String(days) })
        .eq('key', 'notification_auto_delete_days');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-config'] }),
  });
}
