import { useState } from 'react';
import { useNotifications, useMarkAsRead, useMarkAsUnread, useMarkAllAsRead, useDeleteNotification, useNotificationConfig, useUpdateNotificationConfig } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Bell, CheckCheck, ExternalLink, Clock, Mail, MailOpen,
  Trash2, Settings, Inbox, Archive
} from 'lucide-react';

const Notificacoes = () => {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkAsRead();
  const markUnread = useMarkAsUnread();
  const markAllRead = useMarkAllAsRead();
  const deleteNotif = useDeleteNotification();
  const { data: config } = useNotificationConfig();
  const updateConfig = useUpdateNotificationConfig();
  const { data: role } = useUserRole();
  const navigate = useNavigate();

  const [configOpen, setConfigOpen] = useState(false);
  const [configDays, setConfigDays] = useState('');

  const isAdmin = role === 'administrador';
  const unread = notifications.filter(n => !n.lida);
  const read = notifications.filter(n => n.lida);

  const handleClick = (n: typeof notifications[0]) => {
    if (!n.lida) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const openConfig = () => {
    setConfigDays(config?.value || '30');
    setConfigOpen(true);
  };

  const saveConfig = () => {
    const days = parseInt(configDays);
    if (isNaN(days) || days < 0) {
      toast.error('Informe um número válido (0 = desativado).');
      return;
    }
    updateConfig.mutate(days, {
      onSuccess: () => {
        toast.success('Configuração salva!');
        setConfigOpen(false);
      },
    });
  };

  const renderCard = (n: typeof notifications[0], showReadActions: boolean) => (
    <div
      key={n.id}
      className={`bg-card rounded-xl border shadow-card p-4 transition-all hover:shadow-card-hover ${
        n.lida ? 'border-border/30 opacity-70' : 'border-primary/20 bg-primary/[0.02]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.lida ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(n)}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{n.titulo}</p>
            {!n.lida && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Nova</Badge>}
          </div>
          {n.descricao && <p className="text-xs text-muted-foreground mt-0.5">{n.descricao}</p>}
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(n.created_at).toLocaleDateString('pt-BR')} às{' '}
            {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {n.link && (
            <button onClick={() => { if (n.link) navigate(n.link); }} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Abrir link">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {showReadActions ? (
            <button onClick={() => markUnread.mutate(n.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Marcar como não lida">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : (
            <button onClick={() => markRead.mutate(n.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Marcar como lida">
              <MailOpen className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => deleteNotif.mutate(n.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Excluir">
            <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
          </button>
        </div>
      </div>
    </div>
  );

  const emptyState = (icon: React.ReactNode, text: string) => (
    <div className="text-center py-12 text-muted-foreground">
      <div className="mx-auto mb-2 opacity-30">{icon}</div>
      <p>{text}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe alertas e atualizações do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} className="gap-1.5">
              <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={openConfig} className="gap-1.5">
              <Settings className="w-4 h-4" /> Configurar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="nao-lidas" className="space-y-4">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="nao-lidas" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Inbox className="w-4 h-4" /> Não Lidas ({unread.length})
          </TabsTrigger>
          <TabsTrigger value="lidas" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Archive className="w-4 h-4" /> Lidas ({read.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nao-lidas">
          <div className="grid gap-2">
            {isLoading ? (
              <p className="text-center py-12 text-muted-foreground">Carregando...</p>
            ) : unread.length === 0 ? (
              emptyState(<Bell className="w-10 h-10 mx-auto" />, 'Nenhuma notificação não lida.')
            ) : (
              unread.map(n => renderCard(n, false))
            )}
          </div>
        </TabsContent>

        <TabsContent value="lidas">
          <div className="grid gap-2">
            {isLoading ? (
              <p className="text-center py-12 text-muted-foreground">Carregando...</p>
            ) : read.length === 0 ? (
              emptyState(<MailOpen className="w-10 h-10 mx-auto" />, 'Nenhuma notificação lida.')
            ) : (
              read.map(n => renderCard(n, true))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Admin config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Exclusão Automática</DialogTitle>
            <DialogDescription>Configure a exclusão automática de notificações lidas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Excluir notificações lidas após (dias)
              </label>
              <Input
                type="number"
                min="0"
                value={configDays}
                onChange={e => setConfigDays(e.target.value)}
                placeholder="30"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Use 0 para desativar a exclusão automática.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={saveConfig} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notificacoes;
