import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, ExternalLink, Clock } from 'lucide-react';

const Notificacoes = () => {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.lida).length;

  const handleClick = (n: typeof notifications[0]) => {
    if (!n.lida) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe alertas e atualizações do sistema</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} className="gap-1.5">
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Carregando...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma notificação.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`bg-card rounded-xl border shadow-card p-4 cursor-pointer transition-all hover:shadow-card-hover ${
                n.lida ? 'border-border/30 opacity-70' : 'border-primary/20 bg-primary/[0.02]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.lida ? 'bg-transparent' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{n.titulo}</p>
                    {!n.lida && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Nova</Badge>}
                  </div>
                  {n.descricao && <p className="text-xs text-muted-foreground mt-0.5">{n.descricao}</p>}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleDateString('pt-BR')} às {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {n.link && <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notificacoes;
