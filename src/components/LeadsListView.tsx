import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    useLeads, useUpdateLead, useDeleteLead,
    useCompanhias, useProdutos, useModalidades,
    type Lead,
} from '@/hooks/useInventario';
import { useTeamProfiles } from '@/hooks/useProfile';
import { useLeadStages } from '@/hooks/useLeadStages';
import { useMyPermissions, hasPermission } from '@/hooks/useSecurityProfiles';
import { maskCPF, maskPhone, maskCurrency, unmaskCurrency } from '@/lib/masks';
import {
    Search, ChevronUp, ChevronDown, ChevronsUpDown, Trash2,
    Pencil, Users, Phone, Mail, FileText, Building2, X, Save,
    CircleSlash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

/* ─── Helpers ─── */
type SortKey = 'nome' | 'tipo' | 'stage' | 'companhia_nome' | 'valor' | 'created_at';
type SortDir = 'asc' | 'desc';

function currency(val: number | null | undefined) {
    if (!val) return '—';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
    if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return dir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
}

const isPF = (tipo: string) => ['PF', 'Familiar', 'pessoa_fisica', 'Adesão'].includes(tipo);

/* ─── Component ─── */
interface Props { permissionNamespace?: string; }

export function LeadsListView({ permissionNamespace = 'inventario.leads' }: Props) {
    const { user } = useAuth();
    const { data: myPermissions } = useMyPermissions();
    const { data: leads = [], isLoading } = useLeads();
    const { data: stages = [] } = useLeadStages();
    const { data: allProfiles = [] } = useTeamProfiles();
    const { data: companhias = [] } = useCompanhias();
    const { data: produtos = [] } = useProdutos();
    const { data: modalidades = [] } = useModalidades();
    const updateLead = useUpdateLead();
    const deleteLead = useDeleteLead();

    /* Permissions */
    const canViewAll = hasPermission(myPermissions, permissionNamespace, 'view_all');
    const canViewOwn = hasPermission(myPermissions, permissionNamespace, 'view_own');
    const canEdit    = hasPermission(myPermissions, permissionNamespace, 'edit')
                    || hasPermission(myPermissions, permissionNamespace, 'edit_leads');
    const canDelete  = hasPermission(myPermissions, permissionNamespace, 'edit_leads')
                    || hasPermission(myPermissions, permissionNamespace, 'edit');

    /* Visible leads based on permission */
    const visibleLeads = useMemo(() => {
        if (canViewAll) return leads;
        if (canViewOwn) return leads.filter(l => l.livre || l.created_by === user?.id);
        return leads.filter(l => l.livre);
    }, [leads, canViewAll, canViewOwn, user]);

    /* Search / filter / sort */
    const [search, setSearch]       = useState('');
    const [filterTipo, setFilterTipo]   = useState('all');
    const [filterStage, setFilterStage] = useState('all');
    const [sortKey, setSortKey]     = useState<SortKey>('created_at');
    const [sortDir, setSortDir]     = useState<SortDir>('desc');

    /* Delete confirm */
    const [deleteConfirm, setDeleteConfirm] = useState<Lead | null>(null);

    /* Inline edit dialog */
    const [editLead, setEditLead] = useState<Lead | null>(null);
    const [saving, setSaving]     = useState(false);
    const [editForm, setEditForm] = useState({
        nome: '', tipo: '', contato: '', email: '',
        cpf: '', cnpj: '', endereco: '',
        stage_id: '' as string | null,
        companhia_nome: '', produto: '', valor: '',
        quantidade_vidas: '', livre: false,
    });

    const openEdit = (lead: Lead) => {
        let ext: any = {};
        try { if (lead.origem) ext = JSON.parse(lead.origem); } catch { /* */ }
        setEditForm({
            nome:             lead.nome,
            tipo:             lead.tipo,
            contato:          lead.contato || '',
            email:            lead.email || '',
            cpf:              lead.cpf || '',
            cnpj:             lead.cnpj || '',
            endereco:         lead.endereco || '',
            stage_id:         lead.stage_id || null,
            companhia_nome:   ext.companhia_nome || lead.companhia_nome || '',
            produto:          ext.produto || lead.produto || '',
            valor:            lead.valor ? maskCurrency(String(Math.round(lead.valor * 100))) : (ext.valor ? maskCurrency(String(Math.round(ext.valor * 100))) : ''),
            quantidade_vidas: ext.quantidade_vidas ? String(ext.quantidade_vidas) : (lead.quantidade_vidas ? String(lead.quantidade_vidas) : ''),
            livre:            lead.livre,
        });
        setEditLead(lead);
    };

    const handleSave = async () => {
        if (!editLead) return;
        if (!editForm.nome.trim()) { toast.error('Informe o nome.'); return; }
        if (!editForm.tipo)       { toast.error('Selecione o tipo.'); return; }
        setSaving(true);
        try {
            // Merge editable fields into the existing origem JSON
            let ext: any = {};
            try { if (editLead.origem) ext = JSON.parse(editLead.origem); } catch { /* */ }
            const valorNum = editForm.valor ? unmaskCurrency(editForm.valor) : null;
            const newOrigem = JSON.stringify({
                ...ext,
                companhia_nome:   editForm.companhia_nome || null,
                produto:          editForm.produto || null,
                quantidade_vidas: editForm.quantidade_vidas ? parseInt(editForm.quantidade_vidas) : null,
                valor:            valorNum && !isNaN(valorNum) && valorNum > 0 ? valorNum : null,
            });

            await updateLead.mutateAsync({
                id:       editLead.id,
                nome:     editForm.nome.trim(),
                tipo:     editForm.tipo,
                contato:  editForm.contato || null,
                email:    editForm.email || null,
                endereco: editForm.endereco || null,
                cpf:      isPF(editForm.tipo) ? (editForm.cpf || null) : null,
                cnpj:     !isPF(editForm.tipo) ? (editForm.cnpj || null) : null,
                stage_id: editForm.stage_id || null,
                livre:    editForm.livre,
                origem:   newOrigem,
            });
            toast.success('Lead atualizado com sucesso!');
            setEditLead(null);
        } catch {
            toast.error('Erro ao salvar lead.');
        } finally {
            setSaving(false);
        }
    };

    /* Lookup helpers */
    const stageMap = useMemo(() => {
        const m: Record<string, string> = {};
        stages.forEach(s => (m[s.id] = s.nome));
        return m;
    }, [stages]);

    const ownerName = (createdBy: string | null): string => {
        if (!createdBy) return '—';
        const p = allProfiles.find(x => x.id === createdBy);
        return p ? (p.apelido || p.nome_completo?.split(' ')[0] || '—') : '—';
    };

    const tiposUnicos = useMemo(() =>
        Array.from(new Set(visibleLeads.map(l => l.tipo).filter(Boolean))),
    [visibleLeads]);

    const filteredProdutos = useMemo(() => {
        const comp = companhias.find(c => c.nome === editForm.companhia_nome);
        return comp ? produtos.filter(p => (p as any).companhia_id === comp.id) : produtos;
    }, [companhias, produtos, editForm.companhia_nome]);

    /* Filtered + sorted list */
    const filtered = useMemo(() => {
        let list = visibleLeads;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(l =>
                l.nome.toLowerCase().includes(q) ||
                (l.email || '').toLowerCase().includes(q) ||
                (l.contato || '').includes(q) ||
                (l.cpf || '').includes(q) ||
                (l.cnpj || '').includes(q) ||
                (l.companhia_nome || '').toLowerCase().includes(q)
            );
        }
        if (filterTipo  !== 'all') list = list.filter(l => l.tipo === filterTipo);
        if (filterStage !== 'all') list = list.filter(l => (l.stage_id || 'sem-coluna') === filterStage);

        return [...list].sort((a, b) => {
            let av: any, bv: any;
            if (sortKey === 'stage') {
                av = stageMap[a.stage_id || ''] || '';
                bv = stageMap[b.stage_id || ''] || '';
            } else {
                av = (a as any)[sortKey] ?? '';
                bv = (b as any)[sortKey] ?? '';
            }
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv), 'pt')
                : String(bv).localeCompare(String(av), 'pt');
        });
    }, [visibleLeads, search, filterTipo, filterStage, sortKey, sortDir, stageMap]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await deleteLead.mutateAsync(deleteConfirm.id);
            toast.success('Lead excluído.');
        } catch { toast.error('Erro ao excluir lead.'); }
        finally { setDeleteConfirm(null); }
    };

    /* CSS helpers */
    const thClass = "px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors whitespace-nowrap";
    const tdClass = "px-3 py-3 text-sm text-foreground align-middle";
    const fieldLabel = "text-xs font-semibold text-muted-foreground block mb-1";

    return (
        <div className="space-y-4 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold font-display text-foreground">Base de Clientes / Leads</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, e-mail, CPF, CNPJ..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-card border-border/40"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="w-[150px] h-9 border-border/40 bg-card text-sm">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {tiposUnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger className="w-[180px] h-9 border-border/40 bg-card text-sm">
                        <SelectValue placeholder="Fase" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as fases</SelectItem>
                        <SelectItem value="sem-coluna">Sem fase</SelectItem>
                        {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
                {(filterTipo !== 'all' || filterStage !== 'all' || search) && (
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-9"
                        onClick={() => { setSearch(''); setFilterTipo('all'); setFilterStage('all'); }}>
                        <X className="w-3 h-3" /> Limpar
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border/40 overflow-hidden shadow-elevated bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-border/30 bg-muted/20">
                                <th className={thClass} onClick={() => handleSort('nome')}>
                                    <span className="flex items-center gap-1">Nome <SortIcon col="nome" sortKey={sortKey} dir={sortDir} /></span>
                                </th>
                                <th className={thClass} onClick={() => handleSort('tipo')}>
                                    <span className="flex items-center gap-1">Tipo <SortIcon col="tipo" sortKey={sortKey} dir={sortDir} /></span>
                                </th>
                                <th className={thClass} onClick={() => handleSort('stage')}>
                                    <span className="flex items-center gap-1">Fase <SortIcon col="stage" sortKey={sortKey} dir={sortDir} /></span>
                                </th>
                                <th className={thClass}>Contato</th>
                                <th className={thClass} onClick={() => handleSort('companhia_nome')}>
                                    <span className="flex items-center gap-1">Companhia <SortIcon col="companhia_nome" sortKey={sortKey} dir={sortDir} /></span>
                                </th>
                                <th className={thClass} onClick={() => handleSort('valor')}>
                                    <span className="flex items-center gap-1">Valor <SortIcon col="valor" sortKey={sortKey} dir={sortDir} /></span>
                                </th>
                                {canViewAll && (
                                    <th className={thClass}>
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Consultor</span>
                                    </th>
                                )}
                                <th className={thClass + " text-right"}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Carregando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                                            <FileText className="w-10 h-10 text-muted-foreground/30" />
                                            <p className="text-sm text-muted-foreground">Nenhum lead encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((lead, idx) => {
                                    const stage   = lead.stage_id ? stages.find(s => s.id === lead.stage_id) : null;
                                    const isOwner = lead.created_by === user?.id;
                                    const canAct  = canEdit && (canViewAll || isOwner);
                                    const canDel  = canDelete && (canViewAll || isOwner);
                                    return (
                                        <tr key={lead.id}
                                            className={`border-b border-border/10 transition-colors hover:bg-primary/5 ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                                            {/* Nome */}
                                            <td className={tdClass}>
                                                <div className="font-semibold text-foreground leading-tight">{lead.nome}</div>
                                                {lead.cpf  && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">CPF: {lead.cpf}</div>}
                                                {lead.cnpj && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">CNPJ: {lead.cnpj}</div>}
                                            </td>
                                            {/* Tipo */}
                                            <td className={tdClass}>
                                                <Badge variant="outline" className="text-[10px] font-semibold border-primary/20 text-primary bg-primary/5">{lead.tipo}</Badge>
                                                {lead.livre && <Badge variant="outline" className="text-[10px] ml-1 border-success/20 text-success bg-success/5">Livre</Badge>}
                                            </td>
                                            {/* Fase */}
                                            <td className={tdClass}>
                                                {stage ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (stage as any).cor || '#94a3b8' }} />
                                                        <span className="text-xs">{stage.nome}</span>
                                                    </span>
                                                ) : <span className="text-[11px] text-muted-foreground/60">—</span>}
                                            </td>
                                            {/* Contato */}
                                            <td className={tdClass}>
                                                <div className="space-y-0.5 min-w-[130px]">
                                                    {lead.contato && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {lead.contato}</div>}
                                                    {lead.email   && <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[200px]"><Mail className="w-3 h-3" /> {lead.email}</div>}
                                                    {!lead.contato && !lead.email && <span className="text-[11px] text-muted-foreground/60">—</span>}
                                                </div>
                                            </td>
                                            {/* Companhia */}
                                            <td className={tdClass}>
                                                {lead.companhia_nome
                                                    ? <div className="flex items-center gap-1 text-xs"><Building2 className="w-3 h-3 text-muted-foreground" />{lead.companhia_nome}</div>
                                                    : <span className="text-[11px] text-muted-foreground/60">—</span>}
                                                {lead.produto && <div className="text-[10px] text-muted-foreground mt-0.5">{lead.produto}</div>}
                                            </td>
                                            {/* Valor */}
                                            <td className={tdClass}>
                                                {lead.valor
                                                    ? <span className="font-semibold text-success text-sm tabular-nums">{currency(lead.valor)}</span>
                                                    : <span className="text-[11px] text-muted-foreground/60">—</span>}
                                                {lead.quantidade_vidas && (
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">{lead.quantidade_vidas} vida{lead.quantidade_vidas > 1 ? 's' : ''}</div>
                                                )}
                                            </td>
                                            {/* Consultor */}
                                            {canViewAll && (
                                                <td className={tdClass}>
                                                    <span className="text-xs text-muted-foreground">{ownerName(lead.created_by)}</span>
                                                </td>
                                            )}
                                            {/* Ações */}
                                            <td className={tdClass + " text-right"}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {canAct && (
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-primary hover:bg-primary/10"
                                                            onClick={() => openEdit(lead)}
                                                            title="Editar lead">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    {canDel && (
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeleteConfirm(lead)}
                                                            title="Excluir">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer summary */}
                {filtered.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border/20 bg-muted/10 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            {filtered.length} lead{filtered.length !== 1 ? 's' : ''} listado{filtered.length !== 1 ? 's' : ''}
                        </span>
                        {filtered.some(l => l.valor) && (
                            <span className="text-xs font-semibold text-success tabular-nums">
                                Total: {currency(filtered.reduce((acc, l) => acc + (l.valor || 0), 0))}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Inline Edit Dialog ── */}
            <Dialog open={!!editLead} onOpenChange={v => { if (!v) setEditLead(null); }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-display">Editar Lead</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        {/* Tipo */}
                        <div>
                            <label className={fieldLabel}>Tipo / Modalidade <span className="text-destructive">*</span></label>
                            <Select value={editForm.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v, cpf: '', cnpj: '' }))}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {modalidades.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Nome */}
                        <div>
                            <label className={fieldLabel}>Nome <span className="text-destructive">*</span></label>
                            <Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
                        </div>

                        {/* Contato + Email */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={fieldLabel}>Contato</label>
                                <Input value={editForm.contato} onChange={e => setEditForm(p => ({ ...p, contato: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
                            </div>
                            <div>
                                <label className={fieldLabel}>E-mail</label>
                                <Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="h-10" />
                            </div>
                        </div>

                        {/* CPF / CNPJ */}
                        {isPF(editForm.tipo) ? (
                            <div>
                                <label className={fieldLabel}>CPF</label>
                                <Input value={editForm.cpf} onChange={e => setEditForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" className="h-10" />
                            </div>
                        ) : (
                            <div>
                                <label className={fieldLabel}>CNPJ</label>
                                <Input value={editForm.cnpj} onChange={e => setEditForm(p => ({ ...p, cnpj: e.target.value }))} className="h-10" />
                            </div>
                        )}

                        {/* Endereço */}
                        <div>
                            <label className={fieldLabel}>Endereço</label>
                            <Input value={editForm.endereco} onChange={e => setEditForm(p => ({ ...p, endereco: e.target.value }))} className="h-10" />
                        </div>

                        <Separator />

                        {/* Fase */}
                        <div>
                            <label className={fieldLabel}>Fase do Funil</label>
                            <Select value={editForm.stage_id || 'none'} onValueChange={v => setEditForm(p => ({ ...p, stage_id: v === 'none' ? null : v }))}>
                                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem fase</SelectItem>
                                    {stages.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: (s as any).cor }} />
                                                {s.nome}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Companhia + Produto */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={fieldLabel}>Companhia</label>
                                <Select value={editForm.companhia_nome || '__none__'} onValueChange={v => setEditForm(p => ({ ...p, companhia_nome: v === '__none__' ? '' : v, produto: '' }))}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Nenhuma</SelectItem>
                                        {companhias.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={fieldLabel}>Produto</label>
                                <Select value={editForm.produto || '__none__'} onValueChange={v => setEditForm(p => ({ ...p, produto: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Nenhum</SelectItem>
                                        {filteredProdutos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Valor + Vidas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={fieldLabel}>Valor Total (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary/50 font-medium">R$</span>
                                    <Input
                                        value={editForm.valor}
                                        onChange={e => setEditForm(p => ({ ...p, valor: maskCurrency(e.target.value) }))}
                                        placeholder="0,00"
                                        className="h-10 pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={fieldLabel}>Qtd. de Vidas</label>
                                <Input
                                    type="number"
                                    value={editForm.quantidade_vidas}
                                    onChange={e => setEditForm(p => ({ ...p, quantidade_vidas: e.target.value }))}
                                    placeholder="Ex: 3"
                                    className="h-10"
                                />
                            </div>
                        </div>

                        {/* Lead livre */}
                        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                            <Switch
                                checked={editForm.livre}
                                onCheckedChange={v => setEditForm(p => ({ ...p, livre: v }))}
                            />
                            <Label className="text-sm text-foreground cursor-pointer">Lead livre (disponível para assumir)</Label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" onClick={() => setEditLead(null)} disabled={saving}>
                            <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-destructive flex items-center gap-2">
                            <CircleSlash className="w-5 h-5" /> Excluir Lead
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Tem certeza que deseja excluir <strong className="text-foreground">{deleteConfirm?.nome}</strong>? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-2 justify-end mt-2">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteLead.isPending}>
                            {deleteLead.isPending ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
