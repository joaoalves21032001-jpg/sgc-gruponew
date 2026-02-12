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
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterDate, setFilterDate] = useState('');
  const [deleteItem, setDeleteItem] = useState<{ type: 'atividade' | 'venda'; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editAtiv, setEditAtiv] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ligacoes: '', mensagens: '', cotacoes_enviadas: '', cotacoes_fechadas: '', follow_up: '' });
  const [editSaving, setEditSaving] = useState(false);

  const filteredAtividades = useMemo(() => {
    return atividades.filter(a => {
      const matchesSearch = a.data.includes(search) || search === '';
      const matchesStatus = filterStatus === 'todos' || (a as any).status === filterStatus;
      const matchesDate = !filterDate || a.data === filterDate;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [atividades, search, filterStatus, filterDate]);

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      const matchesSearch = !search || v.nome_titular.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'todos' || v.status === filterStatus;
      const matchesDate = !filterDate || v.created_at.startsWith(filterDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [vendas, search, filterStatus, filterDate]);

  const canEditDelete = (status: string) => status === 'devolvido' || status === 'pendente';

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
      }).eq('id', editAtiv.id);
      if (error) throw error;
      toast.success('Atividade atualizada!');
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      setEditAtiv(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setEditSaving(false);
    }
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
          Você pode editar ou excluir registros com status <strong>Pendente</strong> ou <strong>Devolvido</strong>. Registros aprovados ficam bloqueados.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
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
        </TabsList>

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
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="vendas">
          <div className="grid gap-3">
            {loadingVendas ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredVendas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma venda encontrada.
              </div>
            ) : (
              filteredVendas.map((v) => {
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
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => tryDelete('venda', v.id, v.nome_titular, v.status)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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
              {editSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MinhasAcoes;
