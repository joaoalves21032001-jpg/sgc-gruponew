import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Shield, Search, UserPlus, CheckCircle2, XCircle, Clock, Trash2, Eye
} from 'lucide-react';

interface AccessRequest {
  id: string; nome: string; email: string; telefone: string | null;
  mensagem: string | null; cpf: string | null; rg: string | null;
  endereco: string | null; cargo: string | null; nivel_acesso: string | null;
  numero_emergencia_1: string | null; numero_emergencia_2: string | null;
  motivo_recusa: string | null; status: string; created_at: string;
}

function useAccessRequests() {
  return useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('access_requests').select('*').order('created_at', { ascending: false });
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
  const { data: accessRequests, isLoading } = useAccessRequests();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<AccessRequest | null>(null);
  const [viewAccess, setViewAccess] = useState<AccessRequest | null>(null);
  const [rejectAccess, setRejectAccess] = useState<AccessRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = role === 'administrador';

  if (!isAdmin) {
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

  const pending = accessRequests?.filter(r => r.status === 'pendente').length ?? 0;

  const handleApproveAccess = async (req: AccessRequest) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', req.email).maybeSingle();
      if (existing) { toast.error(`Já existe usuário com e-mail ${req.email}.`); setSaving(false); return; }
      if (req.cpf) {
        const { data: cpfCheck } = await supabase.from('profiles').select('id').eq('cpf', req.cpf).maybeSingle();
        if (cpfCheck) { toast.error(`Já existe usuário com CPF ${req.cpf}.`); setSaving(false); return; }
      }
      const { error } = await supabase.from('access_requests').update({ status: 'aprovado' } as any).eq('id', req.id);
      if (error) throw error;
      toast.success(`Acesso aprovado para ${req.nome}!`);
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectAccess = async () => {
    if (!rejectAccess) return;
    if (!rejectReason.trim()) { toast.error('Informe o motivo da recusa.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('access_requests')
        .update({ status: 'rejeitado', motivo_recusa: rejectReason.trim() } as any)
        .eq('id', rejectAccess.id);
      if (error) throw error;
      try {
        await supabase.functions.invoke('send-notification', {
          body: { type: 'acesso_negado', data: { nome: rejectAccess.nome, email: rejectAccess.email, motivo: rejectReason.trim() } },
        });
      } catch (e) { console.error('Email error:', e); }
      toast.success('Solicitação recusada e e-mail enviado.');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setRejectAccess(null); setRejectReason('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao recusar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccess = async (id: string) => {
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

  const filtered = accessRequests?.filter(r => {
    const matchesSearch = r.nome.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchesDate = !filterDate || r.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  }) ?? [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Solicitações de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie solicitações de novos usuários</p>
        </div>
        {pending > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/20 text-sm px-3 py-1">
            {pending} pendente{pending > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-10 border-border/40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10 w-[160px] bg-card border-border/40" />
      </div>

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
                    {req.cargo && <p className="text-xs text-muted-foreground">Cargo: {req.cargo}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(req.created_at).toLocaleDateString('pt-BR')} às {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1 font-semibold" onClick={() => setViewAccess(req)}>
                      <Eye className="w-3.5 h-3.5" /> Detalhes
                    </Button>
                    {req.status === 'pendente' && (
                      <>
                        <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground font-semibold" onClick={() => handleApproveAccess(req)} disabled={saving}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1 font-semibold" onClick={() => { setRejectAccess(req); setRejectReason(''); }} disabled={saving}>
                          <XCircle className="w-3.5 h-3.5" /> Recusar
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(req)}>
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
                {req.motivo_recusa && (
                  <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                    <p className="text-xs text-muted-foreground mb-1">Motivo da recusa:</p>
                    <p className="text-sm text-foreground">{req.motivo_recusa}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* View Details */}
      <Dialog open={!!viewAccess} onOpenChange={(v) => { if (!v) setViewAccess(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-lg">Detalhes da Solicitação</DialogTitle></DialogHeader>
          {viewAccess && (
            <div className="grid grid-cols-2 gap-3 text-sm py-2">
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Nome</span><p className="font-semibold mt-0.5">{viewAccess.nome}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">E-mail</span><p className="font-semibold mt-0.5">{viewAccess.email}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Celular</span><p className="font-semibold mt-0.5">{viewAccess.telefone || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">CPF</span><p className="font-semibold mt-0.5">{viewAccess.cpf || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">RG</span><p className="font-semibold mt-0.5">{viewAccess.rg || '—'}</p></div>
              <div className="col-span-2"><span className="text-[10px] text-muted-foreground uppercase font-semibold">Endereço</span><p className="font-semibold mt-0.5">{viewAccess.endereco || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Cargo</span><p className="font-semibold mt-0.5">{viewAccess.cargo || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Nível</span><p className="font-semibold mt-0.5">{viewAccess.nivel_acesso === 'administrador' ? 'Administrador' : 'Usuário'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Emergência 1</span><p className="font-semibold mt-0.5">{viewAccess.numero_emergencia_1 || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Emergência 2</span><p className="font-semibold mt-0.5">{viewAccess.numero_emergencia_2 || '—'}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectAccess} onOpenChange={(v) => { if (!v) setRejectAccess(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Recusar Solicitação</DialogTitle>
            <DialogDescription>Informe o motivo da recusa. Um e-mail será enviado para {rejectAccess?.nome}.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da recusa (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectAccess(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectAccess} disabled={saving} className="gap-1">
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Recusar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Solicitação</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir a solicitação de <strong>{deleteConfirm?.nome}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteAccess(deleteConfirm.id)} disabled={saving} className="gap-1">
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSolicitacoes;
