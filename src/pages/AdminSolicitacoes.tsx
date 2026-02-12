import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Search, UserPlus, CheckCircle2, XCircle, Clock, Trash2, CalendarIcon } from 'lucide-react';

interface AccessRequest {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  mensagem: string | null;
  status: string;
  created_at: string;
}

function useAccessRequests() {
  return useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccessRequest[];
    },
  });
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  rejeitado: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const AdminSolicitacoes = () => {
  const { data: role } = useUserRole();
  const { data: requests, isLoading } = useAccessRequests();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AccessRequest | null>(null);

  if (role !== 'administrador') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Somente administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  const filtered = requests?.filter(r => {
    const matchesSearch = r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.telefone || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchesDate = !filterDate || r.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  }) ?? [];

  const handleStatusChange = async (id: string, newStatus: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({ status: newStatus } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success(`Status atualizado para ${newStatus}!`);
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('access_requests').delete().eq('id', id);
      if (error) throw error;
      toast.success('Solicitação excluída!');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = requests?.filter(r => r.status === 'pendente').length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Solicitações de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as solicitações de novos usuários</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/20 text-sm px-3 py-1">
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card border-border/40"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-11 border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-10 h-11 w-[180px] bg-card border-border/40"
          />
        </div>
      </div>

      {/* Requests list */}
      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          filtered.map((req) => {
            const sc = statusConfig[req.status] || statusConfig.pendente;
            const StatusIcon = sc.icon;
            return (
              <div key={req.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{req.nome}</p>
                      <Badge variant="outline" className={`text-[10px] ${sc.className}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{req.email}{req.telefone ? ` • ${req.telefone}` : ''}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(req.created_at).toLocaleDateString('pt-BR')} às {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {req.status === 'pendente' && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-success hover:bg-success/10"
                          onClick={() => handleStatusChange(req.id, 'aprovado')}
                          disabled={saving}
                          title="Aprovar"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleStatusChange(req.id, 'rejeitado')}
                          disabled={saving}
                          title="Rejeitar"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirm(req)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {req.mensagem && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
                    <p className="text-sm text-foreground">{req.mensagem}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Solicitação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a solicitação de <strong>{deleteConfirm?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)} disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSolicitacoes;
