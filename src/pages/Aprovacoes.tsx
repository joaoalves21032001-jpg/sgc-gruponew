import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useTeamVendas, useUpdateVendaStatus, type Venda } from '@/hooks/useVendas';
import { useTeamAtividades, type Atividade } from '@/hooks/useAtividades';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Search, CheckCircle2, Clock, Undo2,
  ClipboardList, ShoppingCart, Users, UserPlus, Eye, XCircle, Trash2
} from 'lucide-react';

/* ─── Types ─── */
interface AccessRequest {
  id: string; nome: string; email: string; telefone: string | null;
  mensagem: string | null; cpf: string | null; rg: string | null;
  endereco: string | null; cargo: string | null; nivel_acesso: string | null;
  numero_emergencia_1: string | null; numero_emergencia_2: string | null;
  motivo_recusa: string | null; status: string; created_at: string;
}

const statusColors: Record<string, string> = {
  analise: 'bg-primary/10 text-primary border-primary/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  aprovado: 'bg-success/10 text-success border-success/20',
  recusado: 'bg-destructive/10 text-destructive border-destructive/20',
  devolvido: 'bg-primary/10 text-primary border-primary/20',
  rejeitado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabel: Record<string, string> = {
  analise: 'Em Análise', pendente: 'Pendente', aprovado: 'Aprovado',
  recusado: 'Recusado', devolvido: 'Devolvido', rejeitado: 'Rejeitado',
};

/* ─── Hooks ─── */
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

const Aprovacoes = () => {
  const { data: role } = useUserRole();
  const { data: profiles = [] } = useTeamProfiles();
  const { data: vendas = [], isLoading: loadingVendas } = useTeamVendas();
  const { data: atividades = [], isLoading: loadingAtiv } = useTeamAtividades();
  const { data: accessRequests = [], isLoading: loadingAccess } = useAccessRequests();
  const updateStatus = useUpdateVendaStatus();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterConsultor, setFilterConsultor] = useState('todos');
  const [filterDate, setFilterDate] = useState('');

  // Venda dialog
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [obs, setObs] = useState('');
  const [justificativa, setJustificativa] = useState('');

  // Atividade dialog
  const [selectedAtiv, setSelectedAtiv] = useState<Atividade | null>(null);
  const [ativJustificativa, setAtivJustificativa] = useState('');
  const [savingAtiv, setSavingAtiv] = useState(false);

  // Access dialog
  const [viewAccess, setViewAccess] = useState<AccessRequest | null>(null);
  const [rejectAccess, setRejectAccess] = useState<AccessRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);

  const isAdmin = role === 'administrador';
  const isSupervisorUp = role === 'supervisor' || role === 'gerente' || role === 'administrador';

  if (!isSupervisorUp) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Disponível para Supervisores, Gerentes e Diretores.</p>
        </div>
      </div>
    );
  }

  const getConsultorName = (userId: string) => {
    const p = profiles.find(c => c.id === userId);
    return p?.apelido || p?.nome_completo?.split(' ')[0] || '—';
  };

  /* ─── Filters ─── */
  const filteredVendas = vendas.filter(v => {
    const matchesSearch = !search || v.nome_titular.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || v.status === filterStatus;
    const matchesConsultor = filterConsultor === 'todos' || v.user_id === filterConsultor;
    const matchesDate = !filterDate || v.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesConsultor && matchesDate;
  });

  const filteredAtividades = atividades.filter(a => {
    const name = getConsultorName(a.user_id);
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || a.data.includes(search);
    const ativStatus = (a as any).status || 'pendente';
    const matchesStatus = filterStatus === 'todos' || ativStatus === filterStatus;
    const matchesConsultor = filterConsultor === 'todos' || a.user_id === filterConsultor;
    const matchesDate = !filterDate || a.data === filterDate;
    return matchesSearch && matchesStatus && matchesConsultor && matchesDate;
  });

  const filteredAccess = accessRequests.filter(r => {
    const matchesSearch = !search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchesDate = !filterDate || r.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pendingVendas = vendas.filter(v => v.status === 'analise' || v.status === 'pendente').length;
  const pendingAtiv = atividades.filter(a => (a as any).status === 'pendente' || !(a as any).status).length;
  const pendingAccess = accessRequests.filter(r => r.status === 'pendente').length;
  const totalPending = pendingVendas + pendingAtiv + pendingAccess;

  /* ─── Venda Actions ─── */
  const handleVendaAction = async (venda: Venda, action: 'aprovado' | 'devolvido') => {
    if (action === 'devolvido' && !justificativa.trim()) {
      toast.error('Informe a justificativa para a devolução.');
      return;
    }
    try {
      const finalObs = action === 'devolvido' ? justificativa.trim() : obs;
      await updateStatus.mutateAsync({ id: venda.id, status: action, observacoes: finalObs });
      toast.success(`Venda ${action === 'aprovado' ? 'aprovada' : 'devolvida'} com sucesso!`);
      setSelectedVenda(null);
      setObs(''); setJustificativa('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    }
  };

  /* ─── Atividade Actions ─── */
  const handleAtivAction = async (ativ: Atividade, action: 'aprovado' | 'devolvido') => {
    if (action === 'devolvido' && !ativJustificativa.trim()) {
      toast.error('Informe a justificativa para a devolução.');
      return;
    }
    setSavingAtiv(true);
    try {
      const { error } = await supabase.from('atividades')
        .update({ status: action } as any)
        .eq('id', ativ.id);
      if (error) throw error;
      toast.success(`Atividade ${action === 'aprovado' ? 'aprovada' : 'devolvida'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      setSelectedAtiv(null); setAtivJustificativa('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setSavingAtiv(false);
    }
  };

  /* ─── Access Actions ─── */
  const handleApproveAccess = async (req: AccessRequest) => {
    setSavingAccess(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', req.email).maybeSingle();
      if (existing) { toast.error(`Já existe usuário com e-mail ${req.email}.`); setSavingAccess(false); return; }
      if (req.cpf) {
        const { data: cpfCheck } = await supabase.from('profiles').select('id').eq('cpf', req.cpf).maybeSingle();
        if (cpfCheck) { toast.error(`Já existe usuário com CPF ${req.cpf}.`); setSavingAccess(false); return; }
      }
      const { error } = await supabase.from('access_requests').update({ status: 'aprovado' } as any).eq('id', req.id);
      if (error) throw error;
      toast.success(`Acesso aprovado para ${req.nome}!`);
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleRejectAccess = async () => {
    if (!rejectAccess) return;
    if (!rejectReason.trim()) { toast.error('Informe o motivo da recusa.'); return; }
    setSavingAccess(true);
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
      toast.success('Solicitação recusada.');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setRejectAccess(null); setRejectReason('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao recusar.');
    } finally {
      setSavingAccess(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Aprovações</h1>
          <p className="text-sm text-muted-foreground mt-1">Aprove ou devolva registros da sua equipe</p>
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
          <Input placeholder="Buscar por titular ou consultor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
        <Select value={filterConsultor} onValueChange={setFilterConsultor}>
          <SelectTrigger className="w-[160px] h-10 border-border/40"><Users className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.apelido || p.nome_completo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-10 border-border/40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="devolvido">Devolvido</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10 w-[160px] bg-card border-border/40" />
      </div>

      <Tabs defaultValue="atividades" className="space-y-4">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="atividades" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <ClipboardList className="w-4 h-4" /> Atividades ({filteredAtividades.length})
          </TabsTrigger>
          <TabsTrigger value="vendas" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <ShoppingCart className="w-4 h-4" /> Vendas ({filteredVendas.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="acesso" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
              <UserPlus className="w-4 h-4" /> Acesso ({filteredAccess.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Atividades Tab ── */}
        <TabsContent value="atividades">
          <div className="grid gap-3">
            {loadingAtiv ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredAtividades.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma atividade encontrada.
              </div>
            ) : (
              filteredAtividades.map((a) => {
                const ativStatus = (a as any).status || 'pendente';
                const sc = statusColors[ativStatus] || statusColors.pendente;
                return (
                  <div key={a.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{getConsultorName(a.user_id)}</p>
                          <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[ativStatus] || 'Pendente'}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">Atividade</Badge>
                          <Badge variant="outline" className="text-[10px]">📅 {a.data.split('-').reverse().join('/')}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>Lig: <strong>{a.ligacoes}</strong></span>
                          <span>Msg: <strong>{a.mensagens}</strong></span>
                          <span>Cot.Env: <strong>{a.cotacoes_enviadas}</strong></span>
                          <span>Cot.Fech: <strong>{a.cotacoes_fechadas}</strong></span>
                          <span>Follow: <strong>{a.follow_up}</strong></span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleDateString('pt-BR')} — ID: {a.id.slice(0, 8)}...
                        </p>
                      </div>
                      {(ativStatus === 'pendente') && (
                        <Button size="sm" variant="outline" className="gap-1.5 font-semibold shrink-0" onClick={() => { setSelectedAtiv(a); setAtivJustificativa(''); }}>
                          <Eye className="w-4 h-4" /> Analisar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Vendas Tab ── */}
        <TabsContent value="vendas">
          <div className="grid gap-3">
            {loadingVendas ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredVendas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum registro encontrado.
              </div>
            ) : (
              filteredVendas.map((v) => {
                const sc = statusColors[v.status] || statusColors.analise;
                const isPending = v.status === 'analise' || v.status === 'pendente';
                return (
                  <div key={v.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{v.nome_titular}</p>
                          <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[v.status] || v.status}</Badge>
                          <Badge variant="outline" className="text-[10px]">{v.modalidade}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">Venda</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{getConsultorName(v.user_id)}</span>
                          <span>•</span>
                          <span>{v.vidas} vida(s)</span>
                          {v.valor && <><span>•</span><span>R$ {v.valor.toLocaleString('pt-BR')}</span></>}
                          <span>•</span>
                          <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">ID: {v.id.slice(0, 8)}...</p>
                      </div>
                      {isPending && (
                        <Button size="sm" variant="outline" className="gap-1.5 font-semibold shrink-0" onClick={() => { setSelectedVenda(v); setObs(v.observacoes || ''); setJustificativa(''); }}>
                          <Eye className="w-4 h-4" /> Analisar
                        </Button>
                      )}
                    </div>
                    {v.observacoes && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                        <p className="text-sm text-foreground">{v.observacoes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Acesso Tab (Admin only) ── */}
        {isAdmin && (
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
                  const sc = statusColors[req.status] || statusColors.pendente;
                  return (
                    <div key={req.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{req.nome}</p>
                            <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[req.status] || req.status}</Badge>
                            <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">Acesso</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{req.email}{req.telefone ? ` • ${req.telefone}` : ''}</p>
                          {req.cargo && <p className="text-xs text-muted-foreground">Cargo: {req.cargo}</p>}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(req.created_at).toLocaleDateString('pt-BR')} — ID: {req.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button variant="outline" size="sm" className="gap-1 font-semibold" onClick={() => setViewAccess(req)}>
                            <Eye className="w-3.5 h-3.5" /> Detalhes
                          </Button>
                          {req.status === 'pendente' && (
                            <>
                              <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground font-semibold" onClick={() => handleApproveAccess(req)} disabled={savingAccess}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 font-semibold" onClick={() => { setRejectAccess(req); setRejectReason(''); }} disabled={savingAccess}>
                                <XCircle className="w-3.5 h-3.5" /> Recusar
                              </Button>
                            </>
                          )}
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
          </TabsContent>
        )}
      </Tabs>

      {/* ── Venda Detail Dialog ── */}
      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Titular</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.nome_titular}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Modalidade</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.modalidade}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Consultor</span><p className="font-semibold text-foreground mt-0.5">{getConsultorName(selectedVenda.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Vidas</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.vidas}</p></div>
                {selectedVenda.valor && <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Valor</span><p className="font-semibold text-foreground mt-0.5">R$ {selectedVenda.valor.toLocaleString('pt-BR')}</p></div>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Justificativa da Devolução <span className="text-destructive">*</span></label>
                <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Obrigatório para devolver. Explique o motivo..." rows={3} className="border-border/40" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => handleVendaAction(selectedVenda, 'aprovado')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                  <CheckCircle2 className="w-5 h-5" /> Aprovar Venda
                </Button>
                <Button onClick={() => handleVendaAction(selectedVenda, 'devolvido')} variant="outline" className="flex-1 font-semibold gap-1.5 border-primary text-primary hover:bg-primary/10" size="lg">
                  <Undo2 className="w-5 h-5" /> Devolver Venda
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Atividade Detail Dialog ── */}
      <Dialog open={!!selectedAtiv} onOpenChange={() => setSelectedAtiv(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detalhes da Atividade</DialogTitle>
          </DialogHeader>
          {selectedAtiv && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Consultor</span><p className="font-semibold text-foreground mt-0.5">{getConsultorName(selectedAtiv.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Data</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.data.split('-').reverse().join('/')}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Ligações</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.ligacoes}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Mensagens</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.mensagens}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Cot. Enviadas</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.cotacoes_enviadas}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Cot. Fechadas</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.cotacoes_fechadas}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Follow-up</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.follow_up}</p></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Justificativa da Devolução <span className="text-destructive">*</span></label>
                <Textarea value={ativJustificativa} onChange={(e) => setAtivJustificativa(e.target.value)} placeholder="Obrigatório para devolver. Explique o motivo..." rows={3} className="border-border/40" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => handleAtivAction(selectedAtiv, 'aprovado')} disabled={savingAtiv} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                  <CheckCircle2 className="w-5 h-5" /> Aprovar Atividade
                </Button>
                <Button onClick={() => handleAtivAction(selectedAtiv, 'devolvido')} disabled={savingAtiv} variant="outline" className="flex-1 font-semibold gap-1.5 border-primary text-primary hover:bg-primary/10" size="lg">
                  <Undo2 className="w-5 h-5" /> Devolver Atividade
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Access Dialog ── */}
      <Dialog open={!!viewAccess} onOpenChange={(v) => { if (!v) setViewAccess(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {viewAccess && (
            <div className="grid grid-cols-2 gap-3 text-sm py-2">
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Nome</span><p className="font-semibold mt-0.5">{viewAccess.nome}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">E-mail</span><p className="font-semibold mt-0.5">{viewAccess.email}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Celular</span><p className="font-semibold mt-0.5">{viewAccess.telefone || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">CPF</span><p className="font-semibold mt-0.5">{viewAccess.cpf || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">RG</span><p className="font-semibold mt-0.5">{viewAccess.rg || '—'}</p></div>
              <div className="col-span-2"><span className="text-[10px] text-muted-foreground uppercase font-semibold">Endereço</span><p className="font-semibold mt-0.5">{viewAccess.endereco || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Cargo</span><p className="font-semibold mt-0.5">{viewAccess.cargo || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Nível de Acesso</span><p className="font-semibold mt-0.5">{viewAccess.nivel_acesso === 'administrador' ? 'Administrador' : 'Usuário'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Emergência 1</span><p className="font-semibold mt-0.5">{viewAccess.numero_emergencia_1 || '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Emergência 2</span><p className="font-semibold mt-0.5">{viewAccess.numero_emergencia_2 || '—'}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Access Dialog ── */}
      <Dialog open={!!rejectAccess} onOpenChange={(v) => { if (!v) setRejectAccess(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Recusar Solicitação</DialogTitle>
            <DialogDescription>Informe o motivo da recusa. Um e-mail será enviado para {rejectAccess?.nome}.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da recusa (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectAccess(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectAccess} disabled={savingAccess} className="gap-1">
              {savingAccess ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Recusar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aprovacoes;
