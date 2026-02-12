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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield, Search, UserPlus, CheckCircle2, XCircle, Clock, Trash2,
  CalendarIcon, Flag, Pencil
} from 'lucide-react';

/* ─── Types ─── */
interface AccessRequest {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  mensagem: string | null;
  status: string;
  created_at: string;
}

interface CorrectionRequest {
  id: string;
  user_id: string;
  tipo: string;
  registro_id: string;
  motivo: string;
  status: string;
  admin_resposta: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Hooks ─── */
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

function useCorrections() {
  return useQuery({
    queryKey: ['correction-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correction_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CorrectionRequest[];
    },
  });
}

function useUserNames(userIds: string[]) {
  return useQuery({
    queryKey: ['user-names', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase.from('profiles').select('id, nome_completo').in('id', userIds);
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.nome_completo; });
      return map;
    },
    enabled: userIds.length > 0,
  });
}

/* ─── Status configs ─── */
const accessStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  rejeitado: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const correctionStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  rejeitado: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

/* ─── Page ─── */
const AdminSolicitacoes = () => {
  const { data: role } = useUserRole();
  const { data: accessRequests, isLoading: loadingAccess } = useAccessRequests();
  const { data: corrections, isLoading: loadingCorrections } = useCorrections();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Access requests state
  const [deleteAccessConfirm, setDeleteAccessConfirm] = useState<AccessRequest | null>(null);

  // Corrections state
  const [editItem, setEditItem] = useState<CorrectionRequest | null>(null);
  const [editStatus, setEditStatus] = useState('pendente');
  const [editResposta, setEditResposta] = useState('');
  const [deleteCorrConfirm, setDeleteCorrConfirm] = useState<CorrectionRequest | null>(null);

  const correctionUserIds = [...new Set(corrections?.map(c => c.user_id) ?? [])];
  const { data: userNames } = useUserNames(correctionUserIds);

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

  const pendingAccess = accessRequests?.filter(r => r.status === 'pendente').length ?? 0;
  const pendingCorr = corrections?.filter(c => c.status === 'pendente').length ?? 0;
  const totalPending = pendingAccess + pendingCorr;

  /* ─── Access Request Handlers ─── */
  const handleAccessStatusChange = async (id: string, newStatus: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('access_requests').update({ status: newStatus } as any).eq('id', id);
      if (error) throw error;
      toast.success(`Status atualizado para ${newStatus}!`);
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
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
      setDeleteAccessConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Correction Handlers ─── */
  const handleEditCorr = (item: CorrectionRequest) => {
    setEditItem(item);
    setEditStatus(item.status);
    setEditResposta(item.admin_resposta || '');
  };

  const handleSaveEditCorr = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('correction_requests')
        .update({ status: editStatus, admin_resposta: editResposta.trim() || null } as any)
        .eq('id', editItem.id);
      if (error) throw error;
      toast.success('Solicitação atualizada!');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      setEditItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCorrRecord = async (item: CorrectionRequest) => {
    setSaving(true);
    try {
      const table = item.tipo === 'atividade' ? 'atividades' : 'vendas';
      const { error: delError } = await supabase.from(table).delete().eq('id', item.registro_id);
      if (delError) throw delError;
      await supabase.from('correction_requests')
        .update({ status: 'resolvido', admin_resposta: 'Registro excluído pelo administrador.' } as any)
        .eq('id', item.id);
      toast.success('Registro excluído e solicitação resolvida!');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      setDeleteCorrConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir registro.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Filters ─── */
  const filteredAccess = accessRequests?.filter(r => {
    const matchesSearch = r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.telefone || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchesDate = !filterDate || r.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  }) ?? [];

  const filteredCorrections = corrections?.filter(c => {
    const matchesSearch = (userNames?.[c.user_id] || '').toLowerCase().includes(search.toLowerCase()) ||
      c.motivo.toLowerCase().includes(search.toLowerCase()) ||
      c.tipo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || c.status === filterStatus;
    const matchesDate = !filterDate || c.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  }) ?? [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Solicitações</h1>
          <p className="text-sm text-muted-foreground mt-1">Fila unificada de requisições e correções</p>
        </div>
        {totalPending > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/20 text-sm px-3 py-1">
            {totalPending} pendente{totalPending > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-card border-border/40"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-10 border-border/40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-10 w-[160px] bg-card border-border/40"
        />
      </div>

      <Tabs defaultValue="acesso" className="space-y-4">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="acesso" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <UserPlus className="w-4 h-4" /> Acesso ({filteredAccess.length})
          </TabsTrigger>
          <TabsTrigger value="correcoes" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Flag className="w-4 h-4" /> Correções ({filteredCorrections.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Acesso ─── */}
        <TabsContent value="acesso">
          <div className="grid gap-3">
            {loadingAccess ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredAccess.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de acesso encontrada.
              </div>
            ) : (
              filteredAccess.map((req) => {
                const sc = accessStatusConfig[req.status] || accessStatusConfig.pendente;
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
                          <Badge variant="outline" className="text-[10px] bg-muted/40">Acesso</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{req.email}{req.telefone ? ` • ${req.telefone}` : ''}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(req.created_at).toLocaleDateString('pt-BR')} às {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {req.status === 'pendente' && (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => handleAccessStatusChange(req.id, 'aprovado')} disabled={saving} title="Aprovar">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleAccessStatusChange(req.id, 'rejeitado')} disabled={saving} title="Rejeitar">
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteAccessConfirm(req)} title="Excluir">
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
        </TabsContent>

        {/* ─── Tab: Correções ─── */}
        <TabsContent value="correcoes">
          <div className="grid gap-3">
            {loadingCorrections ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredCorrections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de correção encontrada.
              </div>
            ) : (
              filteredCorrections.map((item) => {
                const sc = correctionStatusConfig[item.status] || correctionStatusConfig.pendente;
                const StatusIcon = sc.icon;
                return (
                  <div key={item.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{userNames?.[item.user_id] || 'Usuário'}</p>
                          <Badge variant="outline" className="text-[10px] uppercase">{item.tipo}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${sc.className}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-muted/40">Correção</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleDateString('pt-BR')} — ID: {item.registro_id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditCorr(item)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteCorrConfirm(item)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                      <p className="text-sm text-foreground">{item.motivo}</p>
                    </div>
                    {item.admin_resposta && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Resposta do administrador:</p>
                        <p className="text-sm text-foreground">{item.admin_resposta}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Access Confirm */}
      <Dialog open={!!deleteAccessConfirm} onOpenChange={(v) => { if (!v) setDeleteAccessConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Solicitação</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir a solicitação de <strong>{deleteAccessConfirm?.nome}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAccessConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteAccessConfirm && handleDeleteAccess(deleteAccessConfirm.id)} disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Correction Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Gerenciar Correção</DialogTitle>
            <DialogDescription>Atualize o status e adicione uma resposta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Resposta ao Usuário</label>
              <Textarea value={editResposta} onChange={(e) => setEditResposta(e.target.value)} placeholder="Descreva a ação tomada..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditCorr} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Correction Record Confirm */}
      <Dialog open={!!deleteCorrConfirm} onOpenChange={(v) => { if (!v) setDeleteCorrConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Registro Original</DialogTitle>
            <DialogDescription>Isso excluirá permanentemente o registro de {deleteCorrConfirm?.tipo} reportado. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCorrConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteCorrConfirm && handleDeleteCorrRecord(deleteCorrConfirm)} disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSolicitacoes;
