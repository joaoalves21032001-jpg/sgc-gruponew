import { useState } from 'react';
import { useMyPermissions, hasPermission } from '@/hooks/useSecurityProfiles';
import { useLogAction } from '@/hooks/useAuditLog';
import {
  useCompanhias, useCreateCompanhia, useUpdateCompanhia, useDeleteCompanhia,
  useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto,
  useModalidades, useCreateModalidade, useUpdateModalidade, useDeleteModalidade,
  useLeads,
  type Companhia, type Produto, type Modalidade as ModalidadeType
} from '@/hooks/useInventario';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadsListView } from '@/components/LeadsListView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, Package, Tag, Users, Plus, Pencil, Trash2, Search, Upload, Image, ClipboardList
} from 'lucide-react';

/* ─── Visão Geral Tab ─── */
function VisaoGeralTab() {
  const { data: companhias = [] } = useCompanhias();
  const { data: produtos = [] } = useProdutos();
  const { data: modalidades = [] } = useModalidades();
  const { data: leads = [] } = useLeads(); // Will be imported above

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
          <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{companhias.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Companhias</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
          <Package className="w-5 h-5 text-warning mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{produtos.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Produtos</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
          <Tag className="w-5 h-5 text-info mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{modalidades.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Modalidades</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
          <Users className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{leads.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Leads no Inventário</p>
        </div>
      </div>
      
      <div className="bg-muted/30 border border-border/20 rounded-2xl p-6 text-center">
        <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="text-sm font-semibold text-foreground">Gestão de Inventário</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Navegue pelas abas acima para gerenciar o catálogo de vendas, cadastrando companhias, produtos e as modalidades de serviço disponíveis na corretora.
        </p>
      </div>
    </div>
  );
}

/* ─── Companhias Tab with Logo Upload ─── */
function CompanhiasTab() {
  const { data: myPermissions } = useMyPermissions();
  const canEdit = hasPermission(myPermissions, 'inventario.companhias', 'edit');
  const logAction = useLogAction();
  const { data: companhias = [], isLoading } = useCompanhias();
  const createMut = useCreateCompanhia();
  const updateMut = useUpdateCompanhia();
  const deleteMut = useDeleteCompanhia();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Companhia | null>(null);
  const [nome, setNome] = useState('');
  const [metaTitulo, setMetaTitulo] = useState('10');
  const [nomeTitulo, setNomeTitulo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Companhia | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = companhias.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  const uploadLogo = async (companhiaId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `companhias/${companhiaId}/logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    setSaving(true);
    try {
      let logoUrl: string | undefined;
      const metaTituloVal = parseInt(metaTitulo) || 10;
      const nomeTituloVal = nomeTitulo.trim() || 'Título';
      
      if (editItem) {
        if (logoFile) {
          logoUrl = await uploadLogo(editItem.id, logoFile);
        }
        await updateMut.mutateAsync({ 
          id: editItem.id, 
          nome: nome.trim(),
          meta_titulo: metaTituloVal,
          nome_titulo: nomeTituloVal,
          ...(logoUrl ? { logo_url: logoUrl } : {})
        });
        logAction('editar_companhia', 'companhia', editItem.id, { nome: nome.trim() });
        toast.success('Companhia atualizada!');
      } else {
        // Primeiro crie com logo null, pegue o ID, caso tenha logo a gente upa e atualiza
        const result = await createMut.mutateAsync({ 
          nome: nome.trim(),
          meta_titulo: metaTituloVal,
          nome_titulo: nomeTituloVal
        });
        if (result?.id) {
            if (logoFile) {
                logoUrl = await uploadLogo(result.id, logoFile);
                if (logoUrl) {
                  await supabase.from('companhias').update({ logo_url: logoUrl } as any).eq('id', result.id);
                }
            }
        }
        logAction('criar_companhia', 'companhia', result?.id, { nome: nome.trim() });
        toast.success('Companhia criada!');
      }
      setShowAdd(false); setEditItem(null); setNome(''); setMetaTitulo('10'); setNomeTitulo(''); setLogoFile(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await deleteMut.mutateAsync(deleteItem.id);
      logAction('excluir_companhia', 'companhia', deleteItem.id, { nome: deleteItem.nome });
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
        {canEdit && (
          <Button onClick={() => { setShowAdd(true); setEditItem(null); setNome(''); setMetaTitulo('10'); setNomeTitulo(''); setLogoFile(null); }} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Nova Companhia
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          filtered.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhuma companhia encontrada.</p> :
            filtered.map(c => (
              <div key={c.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-border/30">
                    <AvatarImage src={(c as any).logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {c.nome.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')} · Meta: {(c as any).meta_titulo ?? 10} vendas para um(a) {(c as any).nome_titulo || 'Título'}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { 
                        setEditItem(c); 
                        setNome(c.nome); 
                        setMetaTitulo(String((c as any).meta_titulo ?? 10)); 
                        setNomeTitulo((c as any).nome_titulo || 'Título');
                        setLogoFile(null); 
                        setShowAdd(true); 
                    }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Nova'} Companhia</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da companhia" className="h-10" />
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome a ser Atingido (Ex: Título, Viagem, Prêmio)</label>
              <Input value={nomeTitulo} onChange={e => setNomeTitulo(e.target.value)} placeholder="Título" className="h-10 mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Meta p/ Título (vendas necessárias)</label>
              <Input type="number" min="1" value={metaTitulo} onChange={e => setMetaTitulo(e.target.value)} placeholder="10" className="h-10 mt-1" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Logomarca</label>
              <label className="cursor-pointer block">
                <input type="file" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-xs hover:bg-muted transition-colors cursor-pointer">
                  <Image className="w-3.5 h-3.5 text-primary shrink-0" />
                  {logoFile ? <span className="text-success truncate">{logoFile.name}</span> : (editItem as any)?.logo_url ? <span className="text-muted-foreground">Logo existente ✓</span> : <span className="text-muted-foreground">Selecionar imagem...</span>}
                </span>
              </label>
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
  const { data: myPermissions } = useMyPermissions();
  const canEdit = hasPermission(myPermissions, 'inventario.produtos', 'edit');
  const logAction = useLogAction();
  const { data: produtos = [], isLoading } = useProdutos();
  const { data: companhias = [] } = useCompanhias();
  const createMut = useCreateProduto();
  const updateMut = useUpdateProduto();
  const deleteMut = useDeleteProduto();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Produto | null>(null);
  const [deleteItem, setDeleteItem] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [companhiaId, setCompanhiaId] = useState('');
  const [catAcomodacao, setCatAcomodacao] = useState('');
  const [catReembolso, setCatReembolso] = useState('');
  const [catCopart, setCatCopart] = useState('');
  const [temIof, setTemIof] = useState(false);
  const [pctIof, setPctIof] = useState('');

  const resetForm = () => {
    setNome(''); setCompanhiaId(''); setCatAcomodacao(''); setCatReembolso('');
    setCatCopart(''); setTemIof(false); setPctIof('');
  };

  const openAdd = () => { resetForm(); setEditItem(null); setShowAdd(true); };

  const openEdit = (p: Produto) => {
    setEditItem(p);
    setNome(p.nome);
    setCompanhiaId(p.companhia_id);
    setCatAcomodacao(p.categoria_acomodacao || '');
    setCatReembolso(p.categoria_reembolso || '');
    setCatCopart(p.categoria_coparticipacao || '');
    setTemIof(p.tem_iof ?? false);
    setPctIof(p.porcentagem_iof != null ? String(p.porcentagem_iof) : '');
    setShowAdd(true);
  };

  const filtered = produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));
  const getCompanhiaNome = (id: string) => companhias.find(c => c.id === id)?.nome ?? '—';

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome do produto.'); return; }
    if (!companhiaId) { toast.error('Selecione a companhia.'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        companhia_id: companhiaId,
        categoria_acomodacao: catAcomodacao || null,
        categoria_reembolso: catReembolso || null,
        categoria_coparticipacao: catCopart || null,
        tem_iof: temIof,
        porcentagem_iof: temIof && pctIof ? parseFloat(pctIof) : null,
      };
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
        logAction('editar_produto', 'produto', editItem.id, { nome: nome.trim() });
        toast.success('Produto atualizado!');
      } else {
        const result = await createMut.mutateAsync(payload);
        logAction('criar_produto', 'produto', (result as any)?.id, { nome: nome.trim() });
        toast.success('Produto criado!');
      }
      setShowAdd(false); setEditItem(null); resetForm();
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
        {canEdit && (
          <Button onClick={openAdd} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          filtered.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhum produto encontrado.</p> :
            filtered.map(p => (
              <div key={p.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{getCompanhiaNome(p.companhia_id)}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.categoria_acomodacao && <Badge variant="outline" className="text-[10px]">{p.categoria_acomodacao}</Badge>}
                    {p.categoria_reembolso && <Badge variant="outline" className="text-[10px]">{p.categoria_reembolso}</Badge>}
                    {p.categoria_coparticipacao && <Badge variant="outline" className="text-[10px]">{p.categoria_coparticipacao}</Badge>}
                    {p.tem_iof && <Badge className="text-[10px] bg-warning/10 text-warning border-warning/20">IOF {p.porcentagem_iof != null ? `${p.porcentagem_iof}%` : ''}</Badge>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Novo'} Produto</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Produto <span className="text-destructive">*</span></label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Plano Empresarial Plus" className="h-10" />
            </div>

            {/* Companhia */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Companhia <span className="text-destructive">*</span></label>
              <Select value={companhiaId} onValueChange={setCompanhiaId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a companhia" /></SelectTrigger>
                <SelectContent>
                  {companhias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria de Acomodação */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria de Acomodação</label>
              <Input value={catAcomodacao} onChange={e => setCatAcomodacao(e.target.value)} placeholder="Ex: Enfermaria, Apartamento, Coletivo" className="h-10" />
            </div>

            {/* Categoria de Reembolso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria de Reembolso</label>
              <Input value={catReembolso} onChange={e => setCatReembolso(e.target.value)} placeholder="Ex: Nacional, Internacional, Sem reembolso" className="h-10" />
            </div>

            {/* Categoria de Co-participação */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria de Co-participação</label>
              <Select value={catCopart} onValueChange={setCatCopart}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem">Sem co-participação</SelectItem>
                  <SelectItem value="parcial">Co-participação parcial</SelectItem>
                  <SelectItem value="completa">Co-participação completa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* IOF Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Incidência de IOF</p>
                <p className="text-xs text-muted-foreground">Ativa se o produto possui IOF incidente</p>
              </div>
              <Switch
                checked={temIof}
                onCheckedChange={v => { setTemIof(v); if (!v) setPctIof(''); }}
                id="tem-iof"
              />
            </div>

            {/* Porcentagem IOF (conditional) */}
            {temIof && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Porcentagem do IOF (%) <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Input
                    type="text"
                    value={pctIof}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setPctIof(val);
                    }}
                    placeholder="Ex: 7.38"
                    className="h-10 pr-8"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
  const { data: myPermissions } = useMyPermissions();
  const canEdit = hasPermission(myPermissions, 'inventario.modalidades', 'edit');
  const logAction = useLogAction();
  const { data: modalidades = [], isLoading } = useModalidades();
  const createMut = useCreateModalidade();
  const updateMut = useUpdateModalidade();
  const deleteMut = useDeleteModalidade();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ModalidadeType | null>(null);
  const [nome, setNome] = useState('');
  const [tipoDoc, setTipoDoc] = useState<'CPF' | 'CNPJ' | 'EMPRESA'>('CPF');
  const [docsObrig, setDocsObrig] = useState('');
  const [docsOpc, setDocsOpc] = useState('');
  const [qtdVidas, setQtdVidas] = useState('indefinido');
  const [deleteItem, setDeleteItem] = useState<ModalidadeType | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (m: ModalidadeType) => {
    setEditItem(m); setNome(m.nome);
    setTipoDoc((m as any).tipo_documento || 'CPF');
    setDocsObrig(m.documentos_obrigatorios.join('\n'));
    setDocsOpc(m.documentos_opcionais.join('\n'));
    setQtdVidas(m.quantidade_vidas); setShowAdd(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      tipo_documento: tipoDoc,
      documentos_obrigatorios: docsObrig.split('\n').map(s => s.trim()).filter(Boolean),
      documentos_opcionais: docsOpc.split('\n').map(s => s.trim()).filter(Boolean),
      quantidade_vidas: qtdVidas.trim() || 'indefinido',
    };
    try {
      if (editItem) { await updateMut.mutateAsync({ id: editItem.id, ...payload }); logAction('editar_modalidade', 'modalidade', editItem.id, { nome: nome.trim() }); toast.success('Modalidade atualizada!'); }
      else { await createMut.mutateAsync(payload); logAction('criar_modalidade', 'modalidade', undefined, { nome: nome.trim() }); toast.success('Modalidade criada!'); }
      setShowAdd(false); setEditItem(null); setNome(''); setTipoDoc('CPF'); setDocsObrig(''); setDocsOpc(''); setQtdVidas('indefinido');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canEdit && (
          <Button onClick={() => { setShowAdd(true); setEditItem(null); setNome(''); setTipoDoc('CPF'); setDocsObrig(''); setDocsOpc(''); setQtdVidas('indefinido'); }} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Nova Modalidade
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          modalidades.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhuma modalidade cadastrada.</p> :
            modalidades.map(m => (
              <div key={m.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                  {canEdit && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(m)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">Vidas: {m.quantidade_vidas}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${(m as any).tipo_documento === 'CNPJ' ? 'border-info/30 text-info bg-info/5' : (m as any).tipo_documento === 'EMPRESA' ? 'border-primary/30 text-primary bg-primary/5' : 'border-success/30 text-success bg-success/5'}`}>{(m as any).tipo_documento || 'CPF'}</Badge>
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
            <div><label className="text-xs font-semibold text-muted-foreground">Nome</label><Input value={nome} onChange={e => setNome(e.target.value)} className="h-10" /></div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tipo de Documento</label>
              <Select value={tipoDoc} onValueChange={v => setTipoDoc(v as 'CPF' | 'CNPJ' | 'EMPRESA')}>
                <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF — Pessoa Física</SelectItem>
                  <SelectItem value="CNPJ">CNPJ — Pessoa Jurídica</SelectItem>
                  <SelectItem value="EMPRESA">CNPJ — Empresa</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Isso define qual campo de documento é exibido ao criar leads com essa modalidade.</p>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground">Documentos Obrigatórios <span className="text-destructive">*</span></label><p className="text-[10px] text-muted-foreground mb-1">Um por linha</p><Textarea value={docsObrig} onChange={e => setDocsObrig(e.target.value)} rows={4} placeholder="Documento com foto&#10;Comprovante de endereço" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Documentos Opcionais</label><p className="text-[10px] text-muted-foreground mb-1">Um por linha</p><Textarea value={docsOpc} onChange={e => setDocsOpc(e.target.value)} rows={3} /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Quantidade de Vidas</label><Input value={qtdVidas} onChange={e => setQtdVidas(e.target.value)} placeholder="Ex: 1, 5, indefinido" className="h-10" /></div>
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

/* ─── Main Page ─── */
const Inventario = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Inventário</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie companhias, produtos, modalidades e leads</p>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="bg-card border border-border/40 shadow-elevated p-1 h-auto rounded-xl flex-wrap">
          <TabsTrigger value="geral" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <ClipboardList className="w-4 h-4" /> Visão Geral
          </TabsTrigger>
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

        <TabsContent value="geral"><VisaoGeralTab /></TabsContent>
        <TabsContent value="companhias"><CompanhiasTab /></TabsContent>
        <TabsContent value="produtos"><ProdutosTab /></TabsContent>
        <TabsContent value="modalidades"><ModalidadesTab /></TabsContent>
        <TabsContent value="leads"><LeadsListView permissionNamespace="inventario.leads" /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventario;
