import { useState } from 'react';
import { useUserRole } from '@/hooks/useProfile';
import {
  useCompanhias, useCreateCompanhia, useUpdateCompanhia, useDeleteCompanhia,
  useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto,
  useModalidades, useCreateModalidade, useUpdateModalidade, useDeleteModalidade,
  type Companhia, type Produto, type Modalidade as ModalidadeType
} from '@/hooks/useInventario';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2, Package, Tag, Users, Plus, Pencil, Trash2, Search
} from 'lucide-react';

/* ─── Companhias Tab ─── */
function CompanhiasTab() {
  const { data: role } = useUserRole();
  const isAdmin = role === 'administrador';
  const { data: companhias = [], isLoading } = useCompanhias();
  const createMut = useCreateCompanhia();
  const updateMut = useUpdateCompanhia();
  const deleteMut = useDeleteCompanhia();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Companhia | null>(null);
  const [nome, setNome] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Companhia | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = companhias.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, nome: nome.trim() });
        toast.success('Companhia atualizada!');
      } else {
        await createMut.mutateAsync(nome.trim());
        toast.success('Companhia criada!');
      }
      setShowAdd(false); setEditItem(null); setNome('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await deleteMut.mutateAsync(deleteItem.id);
      toast.success('Companhia excluída!');
      setDeleteItem(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar companhia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
        {isAdmin && (
          <Button onClick={() => { setShowAdd(true); setEditItem(null); setNome(''); }} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Nova Companhia
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          filtered.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhuma companhia encontrada.</p> :
            filtered.map(c => (
              <div key={c.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditItem(c); setNome(c.nome); setShowAdd(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Nova'} Companhia</DialogTitle></DialogHeader>
          <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da companhia" className="h-10" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Companhia</DialogTitle><DialogDescription>Excluir "{deleteItem?.nome}"? Produtos vinculados também serão removidos.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Excluir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Produtos Tab ─── */
function ProdutosTab() {
  const { data: role } = useUserRole();
  const isAdmin = role === 'administrador';
  const { data: produtos = [], isLoading } = useProdutos();
  const { data: companhias = [] } = useCompanhias();
  const createMut = useCreateProduto();
  const updateMut = useUpdateProduto();
  const deleteMut = useDeleteProduto();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Produto | null>(null);
  const [nome, setNome] = useState('');
  const [companhiaId, setCompanhiaId] = useState('');
  const [deleteItem, setDeleteItem] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));
  const getCompanhiaNome = (id: string) => companhias.find(c => c.id === id)?.nome ?? '—';

  const handleSave = async () => {
    if (!nome.trim() || !companhiaId) { toast.error('Preencha todos os campos.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, nome: nome.trim(), companhia_id: companhiaId });
        toast.success('Produto atualizado!');
      } else {
        await createMut.mutateAsync({ nome: nome.trim(), companhia_id: companhiaId });
        toast.success('Produto criado!');
      }
      setShowAdd(false); setEditItem(null); setNome(''); setCompanhiaId('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
        {isAdmin && (
          <Button onClick={() => { setShowAdd(true); setEditItem(null); setNome(''); setCompanhiaId(''); }} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          filtered.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhum produto encontrado.</p> :
            filtered.map(p => (
              <div key={p.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{getCompanhiaNome(p.companhia_id)}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditItem(p); setNome(p.nome); setCompanhiaId(p.companhia_id); setShowAdd(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Novo'} Produto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produto" className="h-10" />
            <Select value={companhiaId} onValueChange={setCompanhiaId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a companhia" /></SelectTrigger>
              <SelectContent>
                {companhias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Produto</DialogTitle><DialogDescription>Excluir "{deleteItem?.nome}"?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => { setSaving(true); try { await deleteMut.mutateAsync(deleteItem!.id); toast.success('Excluído!'); setDeleteItem(null); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }} disabled={saving}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Modalidades Tab ─── */
function ModalidadesTab() {
  const { data: role } = useUserRole();
  const isAdmin = role === 'administrador';
  const { data: modalidades = [], isLoading } = useModalidades();
  const createMut = useCreateModalidade();
  const updateMut = useUpdateModalidade();
  const deleteMut = useDeleteModalidade();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ModalidadeType | null>(null);
  const [nome, setNome] = useState('');
  const [docsObrig, setDocsObrig] = useState('');
  const [docsOpc, setDocsOpc] = useState('');
  const [qtdVidas, setQtdVidas] = useState('indefinido');
  const [deleteItem, setDeleteItem] = useState<ModalidadeType | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (m: ModalidadeType) => {
    setEditItem(m);
    setNome(m.nome);
    setDocsObrig(m.documentos_obrigatorios.join('\n'));
    setDocsOpc(m.documentos_opcionais.join('\n'));
    setQtdVidas(m.quantidade_vidas);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      documentos_obrigatorios: docsObrig.split('\n').map(s => s.trim()).filter(Boolean),
      documentos_opcionais: docsOpc.split('\n').map(s => s.trim()).filter(Boolean),
      quantidade_vidas: qtdVidas.trim() || 'indefinido',
    };
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
        toast.success('Modalidade atualizada!');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Modalidade criada!');
      }
      setShowAdd(false); setEditItem(null); setNome(''); setDocsObrig(''); setDocsOpc(''); setQtdVidas('indefinido');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {isAdmin && (
          <Button onClick={() => { setShowAdd(true); setEditItem(null); setNome(''); setDocsObrig(''); setDocsOpc(''); setQtdVidas('indefinido'); }} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Nova Modalidade
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          modalidades.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhuma modalidade cadastrada.</p> :
            modalidades.map(m => (
              <div key={m.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                  {isAdmin && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(m)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">Vidas: {m.quantidade_vidas}</Badge>
                  {m.documentos_obrigatorios.map(d => <Badge key={d} className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{d}</Badge>)}
                  {m.documentos_opcionais.map(d => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
                </div>
              </div>
            ))}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Nova'} Modalidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Documentos Obrigatórios <span className="text-destructive">*</span></label>
              <p className="text-[10px] text-muted-foreground mb-1">Um por linha</p>
              <Textarea value={docsObrig} onChange={e => setDocsObrig(e.target.value)} rows={4} placeholder="Documento com foto&#10;Comprovante de endereço" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Documentos Opcionais</label>
              <p className="text-[10px] text-muted-foreground mb-1">Um por linha</p>
              <Textarea value={docsOpc} onChange={e => setDocsOpc(e.target.value)} rows={3} placeholder="Últimos 3 boletos" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Quantidade de Vidas</label>
              <Input value={qtdVidas} onChange={e => setQtdVidas(e.target.value)} placeholder="Ex: 1, 5, indefinido" className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Modalidade</DialogTitle><DialogDescription>Excluir "{deleteItem?.nome}"?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => { setSaving(true); try { await deleteMut.mutateAsync(deleteItem!.id); toast.success('Excluído!'); setDeleteItem(null); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }} disabled={saving}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* LeadsTab replaced by KanbanBoard component */

/* ─── Main Page ─── */
const Inventario = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Inventário</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie companhias, produtos, modalidades e leads</p>
      </div>

      <Tabs defaultValue="companhias" className="space-y-4">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg flex-wrap">
          <TabsTrigger value="companhias" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Building2 className="w-4 h-4" /> Companhias
          </TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Package className="w-4 h-4" /> Produtos
          </TabsTrigger>
          <TabsTrigger value="modalidades" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Tag className="w-4 h-4" /> Modalidades
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Users className="w-4 h-4" /> Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companhias"><CompanhiasTab /></TabsContent>
        <TabsContent value="produtos"><ProdutosTab /></TabsContent>
        <TabsContent value="modalidades"><ModalidadesTab /></TabsContent>
        <TabsContent value="leads"><KanbanBoard /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventario;
