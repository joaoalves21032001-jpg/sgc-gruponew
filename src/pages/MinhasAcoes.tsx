import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAtividades } from '@/hooks/useAtividades';
import { useMyVendas, type Venda } from '@/hooks/useVendas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, ShoppingCart, Search, Pencil, Trash2, Plus,
  CheckCircle2, Clock, XCircle, Undo2, AlertCircle
} from 'lucide-react';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  recusado: { label: 'Recusado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  devolvido: { label: 'Devolvido', icon: Undo2, className: 'bg-primary/10 text-primary border-primary/20' },
  analise: { label: 'Em Análise', icon: Clock, className: 'bg-primary/10 text-primary border-primary/20' },
};

const MinhasAcoes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: atividades = [], isLoading: loadingAtiv } = useMyAtividades();
  const { data: vendas = [], isLoading: loadingVendas } = useMyVendas();

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [mainTab, setMainTab] = useState('pendentes');
  const [deleteItem, setDeleteItem] = useState<{ type: 'atividade' | 'venda'; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editAtiv, setEditAtiv] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ligacoes: '', mensagens: '', cotacoes_enviadas: '', cotacoes_fechadas: '', follow_up: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Edit venda state
  const [editVenda, setEditVenda] = useState<Venda | null>(null);
  const [editVendaForm, setEditVendaForm] = useState({ nome_titular: '', vidas: '', valor: '', observacoes: '' });
  const [editVendaSaving, setEditVendaSaving] = useState(false);

  const getStatusFilter = () => {
    if (mainTab === 'pendentes') return ['pendente', 'analise', 'devolvido'];
    if (mainTab === 'aprovados') return ['aprovado'];
    if (mainTab === 'devolvidos') return ['devolvido'];
    return [];
  };

  const statusFilter = getStatusFilter();

  const filteredAtividades = useMemo(() => {
    return atividades.filter(a => {
      const ativStatus = (a as any).status || 'pendente';
      const matchesSearch = a.data.includes(search) || search === '';
      const matchesStatus = statusFilter.includes(ativStatus);
      const matchesDate = !filterDate || a.data === filterDate;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [atividades, search, statusFilter, filterDate]);

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      const matchesSearch = !search || v.nome_titular.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter.includes(v.status);
      const matchesDate = !filterDate || v.created_at.startsWith(filterDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [vendas, search, statusFilter, filterDate]);

  const canEditDelete = (status: string) => status === 'devolvido' || status === 'pendente';

  const pendingCount = atividades.filter(a => ['pendente', 'analise', 'devolvido'].includes((a as any).status || 'pendente')).length
    + vendas.filter(v => ['pendente', 'analise', 'devolvido'].includes(v.status)).length;
  const approvedCount = atividades.filter(a => (a as any).status === 'aprovado').length
    + vendas.filter(v => v.status === 'aprovado').length;
  const devolvidoCount = atividades.filter(a => (a as any).status === 'devolvido').length
    + vendas.filter(v => v.status === 'devolvido').length;

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const table = deleteItem.type === 'atividade' ? 'atividades' : 'vendas';
      const { error } = await supabase.from(table).delete().eq('id', deleteItem.id);
      if (error) throw error;
      toast.success('Registro excluído!');
      queryClient.invalidateQueries({ queryKey: [deleteItem.type === 'atividade' ? 'atividades' : 'vendas'] });
      setDeleteItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    } finally {
      setDeleting(false);
    }
  };

  const openEditAtiv = (a: any) => {
    if (!canEditDelete((a as any).status || 'pendente')) {
      toast.info('Este registro já foi processado e não pode ser editado.');
      return;
    }
    setEditAtiv(a);
    setEditForm({
      ligacoes: String(a.ligacoes),
      mensagens: String(a.mensagens),
      cotacoes_enviadas: String(a.cotacoes_enviadas),
      cotacoes_fechadas: String(a.cotacoes_fechadas),
      follow_up: String(a.follow_up),
    });
  };

  const openEditVenda = (v: Venda) => {
    if (!canEditDelete(v.status)) {
      toast.info('Este registro já foi processado e não pode ser editado.');
      return;
    }
    setEditVenda(v);
    setEditVendaForm({
      nome_titular: v.nome_titular,
      vidas: String(v.vidas),
      valor: v.valor ? String(v.valor) : '',
      observacoes: v.observacoes || '',
    });
  };

  const tryDelete = (type: 'atividade' | 'venda', id: string, label: string, status: string) => {
    if (!canEditDelete(status)) {
      toast.info('Este registro já foi processado e não pode ser excluído.');
      return;
    }
    setDeleteItem({ type, id, label });
  };

  const saveEditAtiv = async () => {
    if (!editAtiv) return;
    setEditSaving(true);
    try {
      const { error } = await supabase.from('atividades').update({
        ligacoes: parseInt(editForm.ligacoes) || 0,
        mensagens: parseInt(editForm.mensagens) || 0,
        cotacoes_enviadas: parseInt(editForm.cotacoes_enviadas) || 0,
        cotacoes_fechadas: parseInt(editForm.cotacoes_fechadas) || 0,
        follow_up: parseInt(editForm.follow_up) || 0,
        status: 'pendente',
      } as any).eq('id', editAtiv.id);
      if (error) throw error;
      toast.success('Atividade atualizada e reenviada para aprovação!');
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      setEditAtiv(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setEditSaving(false);
    }
  };

  const saveEditVenda = async () => {
    if (!editVenda) return;
    setEditVendaSaving(true);
    try {
      const { error } = await supabase.from('vendas').update({
        nome_titular: editVendaForm.nome_titular,
        vidas: parseInt(editVendaForm.vidas) || 1,
        valor: editVendaForm.valor ? parseFloat(editVendaForm.valor) : null,
        observacoes: editVendaForm.observacoes || null,
        status: 'analise',
      } as any).eq('id', editVenda.id);
      if (error) throw error;
      toast.success('Venda atualizada e reenviada para análise!');
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      setEditVenda(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setEditVendaSaving(false);
    }
  };

  const renderAtivCard = (a: any) => {
    const ativStatus = (a as any).status || 'pendente';
    const sc = statusConfig[ativStatus] || statusConfig.pendente;
    const StatusIcon = sc.icon;
    const editable = canEditDelete(ativStatus);
    return (
      <div key={a.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">📅 {a.data.split('-').reverse().join('/')}</p>
              <Badge variant="outline" className={`text-[10px] ${sc.className}`}>
                <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
              <span>Ligações: <strong className="text-foreground">{a.ligacoes}</strong></span>
              <span>Mensagens: <strong className="text-foreground">{a.mensagens}</strong></span>
              <span>Cot. Enviadas: <strong className="text-foreground">{a.cotacoes_enviadas}</strong></span>
              <span>Cot. Fechadas: <strong className="text-foreground">{a.cotacoes_fechadas}</strong></span>
              <span>Follow-up: <strong className="text-foreground">{a.follow_up}</strong></span>
            </div>
          </div>
          {editable && (
            <div className="flex gap-1.5 shrink-0">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditAtiv(a)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => tryDelete('atividade', a.id, a.data, ativStatus)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVendaCard = (v: Venda) => {
    const sc = statusConfig[v.status] || statusConfig.pendente;
    const StatusIcon = sc.icon;
    const editable = canEditDelete(v.status);
    return (
      <div key={v.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{v.nome_titular}</p>
              <Badge variant="outline" className={`text-[10px] ${sc.className}`}>
                <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{v.modalidade}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>{v.vidas} vida(s)</span>
              {v.valor && <span>R$ {v.valor.toLocaleString('pt-BR')}</span>}
              <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            {v.observacoes && <p className="text-xs text-muted-foreground mt-1 italic">{v.observacoes}</p>}
          </div>
          {editable && (
            <div className="flex gap-1.5 shrink-0">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditVenda(v)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => tryDelete('venda', v.id, v.nome_titular, v.status)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Minhas Ações</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe seus registros de atividades e vendas</p>
        </div>
        <Button onClick={() => navigate('/comercial')} className="gap-1.5 font-semibold shadow-brand">
          <Plus className="w-4 h-4" /> Novo Registro
        </Button>
      </div>

      {/* Info */}
      <div className="bg-accent/50 rounded-xl p-3 border border-border/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Você pode editar ou excluir registros com status <strong>Pendente</strong> ou <strong>Devolvido</strong>. Registros aprovados ficam bloqueados. Ao editar um devolvido, ele será reenviado para aprovação.
        </p>
      </div>

      {/* Main tabs: Pendentes / Aprovados / Devolvidos */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="pendentes" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Clock className="w-4 h-4" /> Pendentes ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="aprovados" className="gap-1.5 py-2 px-4 data-[state=active]:bg-success data-[state=active]:text-success-foreground font-semibold text-sm rounded-md">
            <CheckCircle2 className="w-4 h-4" /> Aprovados ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="devolvidos" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Undo2 className="w-4 h-4" /> Devolvidos ({devolvidoCount})
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
          </div>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10 w-[160px] bg-card border-border/40" />
        </div>

        <TabsContent value="pendentes">
          <div className="space-y-4">
            {(filteredAtividades.length > 0 || filteredVendas.length > 0) ? (
              <>
                {filteredAtividades.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Atividades ({filteredAtividades.length})</h3>
                    <div className="grid gap-3">{filteredAtividades.map(renderAtivCard)}</div>
                  </div>
                )}
                {filteredVendas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Vendas ({filteredVendas.length})</h3>
                    <div className="grid gap-3">{filteredVendas.map(renderVendaCard)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum registro pendente.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="aprovados">
          <div className="space-y-4">
            {(filteredAtividades.length > 0 || filteredVendas.length > 0) ? (
              <>
                {filteredAtividades.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Atividades ({filteredAtividades.length})</h3>
                    <div className="grid gap-3">{filteredAtividades.map(renderAtivCard)}</div>
                  </div>
                )}
                {filteredVendas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Vendas ({filteredVendas.length})</h3>
                    <div className="grid gap-3">{filteredVendas.map(renderVendaCard)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum registro aprovado.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="devolvidos">
          <div className="space-y-4">
            {(filteredAtividades.length > 0 || filteredVendas.length > 0) ? (
              <>
                {filteredAtividades.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Atividades ({filteredAtividades.length})</h3>
                    <div className="grid gap-3">{filteredAtividades.map(renderAtivCard)}</div>
                  </div>
                )}
                {filteredVendas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Vendas ({filteredVendas.length})</h3>
                    <div className="grid gap-3">{filteredVendas.map(renderVendaCard)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Undo2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum registro devolvido.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Registro</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir "{deleteItem?.label}"? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Atividade Dialog */}
      <Dialog open={!!editAtiv} onOpenChange={(v) => { if (!v) setEditAtiv(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Editar Atividade — {editAtiv?.data?.split('-').reverse().join('/')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              { key: 'ligacoes', label: 'Ligações' },
              { key: 'mensagens', label: 'Mensagens' },
              { key: 'cotacoes_enviadas', label: 'Cot. Enviadas' },
              { key: 'cotacoes_fechadas', label: 'Cot. Fechadas' },
              { key: 'follow_up', label: 'Follow-up' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                <Input type="number" min={0} value={(editForm as any)[key]} onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} className="h-9" />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditAtiv(null)}>Cancelar</Button>
            <Button onClick={saveEditAtiv} disabled={editSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {editSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar e Reenviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Venda Dialog */}
      <Dialog open={!!editVenda} onOpenChange={(v) => { if (!v) setEditVenda(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Editar Venda</DialogTitle>
            <DialogDescription>Ao salvar, a venda será reenviada para análise.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Nome do Titular</label>
              <Input value={editVendaForm.nome_titular} onChange={(e) => setEditVendaForm(prev => ({ ...prev, nome_titular: e.target.value }))} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Vidas</label>
                <Input type="number" min={1} value={editVendaForm.vidas} onChange={(e) => setEditVendaForm(prev => ({ ...prev, vidas: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Valor (R$)</label>
                <Input type="number" value={editVendaForm.valor} onChange={(e) => setEditVendaForm(prev => ({ ...prev, valor: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Observações</label>
              <Textarea value={editVendaForm.observacoes} onChange={(e) => setEditVendaForm(prev => ({ ...prev, observacoes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditVenda(null)}>Cancelar</Button>
            <Button onClick={saveEditVenda} disabled={editVendaSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {editVendaSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar e Reenviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MinhasAcoes;
