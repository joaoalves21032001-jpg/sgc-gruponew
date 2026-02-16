import { useState } from 'react';
import { useUserRole } from '@/hooks/useProfile';
import {
  useCompanhias, useCreateCompanhia, useUpdateCompanhia, useDeleteCompanhia,
  useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto,
  useModalidades, useCreateModalidade, useUpdateModalidade, useDeleteModalidade,
  useLeads, useCreateLead, useUpdateLead, useDeleteLead,
  type Companhia, type Produto, type Modalidade as ModalidadeType, type Lead
} from '@/hooks/useInventario';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2, Package, Tag, Users, Plus, Pencil, Trash2, Search, Shield,
  Upload, FileText, X
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

/* ─── Leads Tab ─── */
function LeadsTab() {
  const { data: role } = useUserRole();
  const isAdmin = role === 'administrador';
  const { data: leads = [], isLoading } = useLeads();
  const createMut = useCreateLead();
  const updateMut = useUpdateLead();
  const deleteMut = useDeleteLead();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Lead | null>(null);
  const [form, setForm] = useState({ tipo: 'pessoa_fisica' as string, nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '' });
  const [deleteItem, setDeleteItem] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [docFoto, setDocFoto] = useState<File | null>(null);
  const [cartaoCnpj, setCartaoCnpj] = useState<File | null>(null);
  const [comprovanteEndereco, setComprovanteEndereco] = useState<File | null>(null);
  const [boletos, setBoletos] = useState<File | null>(null);

  const filtered = leads.filter(l => l.nome.toLowerCase().includes(search.toLowerCase()) || (l.email || '').toLowerCase().includes(search.toLowerCase()));

  const openEdit = (l: Lead) => {
    setEditItem(l);
    setForm({ tipo: l.tipo, nome: l.nome, contato: l.contato || '', email: l.email || '', cpf: l.cpf || '', cnpj: l.cnpj || '', endereco: l.endereco || '' });
    setDocFoto(null);
    setCartaoCnpj(null);
    setComprovanteEndereco(null);
    setBoletos(null);
    setShowAdd(true);
  };

  const uploadFile = async (file: File, leadId: string, prefix: string): Promise<string> => {
    const filePath = `${leadId}/${prefix}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('lead-documentos').upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome.'); return; }
    setSaving(true);
    const payload: any = { tipo: form.tipo, nome: form.nome.trim(), contato: form.contato || null, email: form.email || null, endereco: form.endereco || null };
    if (form.tipo === 'pessoa_fisica') { payload.cpf = form.cpf || null; payload.cnpj = null; }
    else { payload.cnpj = form.cnpj || null; payload.cpf = null; }
    try {
      let leadId: string;
      if (editItem) {
        leadId = editItem.id;
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
      } else {
        const result = await createMut.mutateAsync(payload);
        leadId = result.id;
      }

      // Upload documents
      const updates: any = {};
      if (docFoto) updates.doc_foto_path = await uploadFile(docFoto, leadId, 'doc_foto');
      if (cartaoCnpj) updates.cartao_cnpj_path = await uploadFile(cartaoCnpj, leadId, 'cartao_cnpj');
      if (comprovanteEndereco) updates.comprovante_endereco_path = await uploadFile(comprovanteEndereco, leadId, 'comprovante');
      if (boletos) updates.boletos_path = await uploadFile(boletos, leadId, 'boletos');

      if (Object.keys(updates).length > 0) {
        await supabase.from('leads').update(updates as any).eq('id', leadId);
      }

      toast.success(editItem ? 'Lead atualizado!' : 'Lead criado!');
      setShowAdd(false); setEditItem(null);
      setForm({ tipo: 'pessoa_fisica', nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '' });
      setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setBoletos(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const FileUploadField = ({ label, file, onFileChange, existingPath }: { label: string; file: File | null; onFileChange: (f: File | null) => void; existingPath?: string | null }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground">{label} <span className="text-[10px] font-normal">(Opcional)</span></label>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer flex-1">
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-xs font-medium hover:bg-muted transition-colors cursor-pointer w-full">
            <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
            {file ? (
              <span className="text-success truncate">{file.name}</span>
            ) : existingPath ? (
              <span className="text-muted-foreground truncate">Arquivo existente ✓</span>
            ) : (
              <span className="text-muted-foreground">Selecionar arquivo...</span>
            )}
          </span>
        </label>
        {(file || existingPath) && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => onFileChange(null)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
        {isAdmin && (
          <Button onClick={() => { setShowAdd(true); setEditItem(null); setForm({ tipo: 'pessoa_fisica', nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '' }); setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setBoletos(null); }} className="gap-1.5 font-semibold shadow-brand">
            <Plus className="w-4 h-4" /> Novo Lead
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {isLoading ? <p className="text-center py-12 text-muted-foreground">Carregando...</p> :
          filtered.length === 0 ? <p className="text-center py-12 text-muted-foreground">Nenhum lead encontrado.</p> :
            filtered.map(l => (
              <div key={l.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{l.nome}</p>
                    <Badge variant="outline" className="text-[10px]">{l.tipo === 'pessoa_fisica' ? 'PF' : 'Empresa'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{l.email || l.contato || '—'}{l.cpf ? ` • CPF: ${l.cpf}` : ''}{l.cnpj ? ` • CNPJ: ${l.cnpj}` : ''}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {l.doc_foto_path && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20"><FileText className="w-2.5 h-2.5 mr-0.5" />Doc Foto</Badge>}
                    {l.cartao_cnpj_path && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20"><FileText className="w-2.5 h-2.5 mr-0.5" />CNPJ</Badge>}
                    {l.comprovante_endereco_path && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20"><FileText className="w-2.5 h-2.5 mr-0.5" />Endereço</Badge>}
                    {l.boletos_path && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20"><FileText className="w-2.5 h-2.5 mr-0.5" />Boletos</Badge>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Novo'} Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome</label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Contato</label>
                <Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-10" />
              </div>
            </div>
            {form.tipo === 'pessoa_fisica' ? (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">CPF</label>
                <Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className="h-10" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">CNPJ</label>
                <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} className="h-10" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Endereço</label>
              <Input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} className="h-10" />
            </div>

            {/* Document uploads */}
            <div className="border-t border-border/20 pt-3 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em]">Documentos <span className="font-normal">(todos opcionais)</span></p>
              {form.tipo === 'pessoa_fisica' && (
                <FileUploadField label="Documento com Foto" file={docFoto} onFileChange={setDocFoto} existingPath={editItem?.doc_foto_path} />
              )}
              {form.tipo === 'empresa' && (
                <FileUploadField label="Cartão CNPJ" file={cartaoCnpj} onFileChange={setCartaoCnpj} existingPath={editItem?.cartao_cnpj_path} />
              )}
              <FileUploadField label="Comprovante de Endereço" file={comprovanteEndereco} onFileChange={setComprovanteEndereco} existingPath={editItem?.comprovante_endereco_path} />
              <FileUploadField label="3 Últimos Boletos/Comprovantes de pagamento" file={boletos} onFileChange={setBoletos} existingPath={editItem?.boletos_path} />
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
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Lead</DialogTitle><DialogDescription>Excluir "{deleteItem?.nome}"?</DialogDescription></DialogHeader>
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
        <TabsContent value="leads"><LeadsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventario;
