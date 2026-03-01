import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useLeadStages, useMoveLeadToStage, type LeadStage } from '@/hooks/useLeadStages';
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type Lead } from '@/hooks/useInventario';
import { useModalidades, useCompanhias, useProdutos } from '@/hooks/useInventario';
import { useUserRole, useProfile, useTeamProfiles } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, X, Upload, MoreHorizontal, Phone, Mail, Shield, User, FileText, Building2, Users, Heart, DollarSign
} from 'lucide-react';
import { maskCPF, maskPhone, maskCurrency, unmaskCurrency } from '@/lib/masks';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/* ─── Lead Card ─── */
function getLeadValor(lead: Lead): number | null {
  try {
    if (lead.origem) {
      const ext = JSON.parse(lead.origem);
      if (ext.valor && !isNaN(ext.valor) && ext.valor > 0) return ext.valor;
    }
  } catch { /* not JSON */ }
  return null;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function LeadCard({ lead, isAdmin, onEdit, onDelete, onDragStart, onAssume, leaderName, stageName, currentUserId }: {
  lead: Lead; isAdmin: boolean;
  onEdit: (l: Lead) => void; onDelete: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onAssume: (l: Lead) => void;
  leaderName?: string;
  stageName?: string;
  currentUserId?: string;
}) {
  const valor = getLeadValor(lead);
  const isEnvioCotacao = stageName?.toLowerCase().includes('envio de cotação') || stageName?.toLowerCase().includes('cotação');
  const initials = leaderName ? leaderName.charAt(0).toUpperCase() : null;
  const canAssume = lead.livre && lead.created_by !== currentUserId;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className="bg-card rounded-lg border border-border/30 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-card-hover transition-shadow group"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{lead.nome}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[9px]">{lead.tipo}</Badge>
            {lead.produto && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">{lead.produto}</Badge>}
            {lead.livre && <Badge className="text-[9px] bg-success/10 text-success border-success/20">Livre</Badge>}
          </div>
          {valor !== null && (
            <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />{formatBRL(valor)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* UX-01: Avatar/initials of consultant */}
          {initials && (
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center" title={leaderName}>
              <span className="text-[10px] font-bold text-primary">{initials}</span>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onEdit(lead)} className="text-xs gap-2"><Pencil className="w-3 h-3" /> Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(lead)} className="text-xs gap-2 text-destructive"><Trash2 className="w-3 h-3" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {leaderName && <span className="block text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><User className="w-3 h-3" />{leaderName}</span>}
      <div className="mt-2 space-y-1">
        {lead.contato && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{lead.contato}</p>}
        {lead.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{lead.email}</p>}
      </div>
      {(lead.doc_foto_path || lead.cartao_cnpj_path || lead.comprovante_endereco_path || lead.boletos_path) && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {lead.doc_foto_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Doc</span>}
          {lead.cartao_cnpj_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">CNPJ</span>}
          {lead.comprovante_endereco_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Endereço</span>}
          {lead.boletos_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Cotação</span>}
        </div>
      )}

      {/* FEAT-01: Assume free lead */}
      {canAssume && (
        <button
          onClick={(e) => { e.stopPropagation(); onAssume(lead); }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <User className="w-3 h-3" /> Assumir Lead
        </button>
      )}
    </div>
  );
}



/* ─── Kanban Column ─── */
function KanbanColumn({ stage, leads, isAdmin, onEdit, onDelete, onDragStart, onDrop, onAddLead, onAssume, getLeaderName, currentUserId }: {
  stage: LeadStage; leads: Lead[]; isAdmin: boolean;
  onEdit: (l: Lead) => void; onDelete: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDrop: (stageId: string) => void;
  onAddLead: (stageId: string) => void;
  onAssume: (l: Lead) => void;
  getLeaderName: (createdBy: string | null) => string | undefined;
  currentUserId?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  // Sum valor from all leads in this column
  const columnTotal = useMemo(() => {
    let total = 0;
    for (const l of leads) {
      const v = getLeadValor(l);
      if (v !== null) total += v;
    }
    return total;
  }, [leads]);

  return (
    <div
      className={`flex flex-col min-w-[280px] flex-1 rounded-xl border transition-all duration-200 shadow-card ${dragOver ? 'border-primary bg-primary/5' : 'border-border/30 bg-muted/20'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(stage.id); }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.cor }} />
        <span className="text-sm font-bold text-foreground flex-1 truncate">{stage.nome}</span>
        <Badge variant="outline" className="text-[10px] font-bold h-5 px-1.5">{leads.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px]">
        {leads.map(l => (
          <LeadCard key={l.id} lead={l} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} onAssume={onAssume} leaderName={getLeaderName(l.created_by)} stageName={stage.nome} currentUserId={currentUserId} />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-6 text-muted-foreground/50 text-xs">Arraste leads para cá</div>
        )}
      </div>
      <button onClick={() => onAddLead(stage.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border/20">
        <Plus className="w-3.5 h-3.5" /> Novo lead
      </button>
      {/* Column total */}
      <div className="px-3 py-2 border-t border-border/20 bg-muted/30 rounded-b-xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</span>
          <span className={`text-xs font-bold ${columnTotal > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {formatBRL(columnTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Kanban Board ─── */
export function KanbanBoard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { data: profile } = useProfile();
  const { data: allProfiles = [] } = useTeamProfiles();
  const isAdmin = role === 'administrador';
  const { data: stages = [], isLoading: stagesLoading } = useLeadStages();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: modalidadesList = [] } = useModalidades();
  const { data: companhias = [] } = useCompanhias();
  const { data: produtos = [] } = useProdutos();
  const createMut = useCreateLead();
  const updateMut = useUpdateLead();
  const deleteMut = useDeleteLead();
  const moveMut = useMoveLeadToStage();
  const logAction = useLogAction();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Lead form state - full sales draft
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Lead | null>(null);
  const [formStageId, setFormStageId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: '', nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '', idade: '',
    livre: false, possuiAproveitamento: false,
    produto: '', quantidade_vidas: '', companhia_nome: '', valor: '',
    vendaDental: false, coParticipacao: 'sem' as string, estagiarios: false, qtdEstagiarios: '',
    observacoes: '', dataVigencia: '',
  });
  const [titulares, setTitulares] = useState<{ nome: string; idade: string; produto: string }[]>([{ nome: '', idade: '', produto: '' }]);
  const [dependentes, setDependentes] = useState<{ nome: string; idade: string; produto: string; descricao: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Lead | null>(null);

  // Approval state for non-admins
  const [approvalDialog, setApprovalDialog] = useState<{ type: 'edit' | 'delete'; lead: Lead } | null>(null);
  const [approvalJustificativa, setApprovalJustificativa] = useState('');
  const [sendingApproval, setSendingApproval] = useState(false);

  // File uploads
  const [docFoto, setDocFoto] = useState<File | null>(null);
  const [cartaoCnpj, setCartaoCnpj] = useState<File | null>(null);
  const [comprovanteEndereco, setComprovanteEndereco] = useState<File | null>(null);
  const [cotacaoPdfs, setCotacaoPdfs] = useState<File[]>([]);
  const [existingCotacaoPaths, setExistingCotacaoPaths] = useState<string[]>([]);
  // RN-02: Carência files
  const [carteirinhaAnterior, setCarteirinhaAnterior] = useState<File | null>(null);
  const [cartaPermanencia, setCartaPermanencia] = useState<File | null>(null);
  const [existingCarteirinhaPath, setExistingCarteirinhaPath] = useState<string | null>(null);
  const [existingCartaPath, setExistingCartaPath] = useState<string | null>(null);

  const isPessoaFisica = (tipo: string) => tipo === 'PF' || tipo === 'Familiar' || tipo === 'pessoa_fisica' || tipo === 'Adesão';

  const getLeaderName = (createdBy: string | null): string | undefined => {
    if (!createdBy) return undefined;
    const creator = allProfiles.find(p => p.id === createdBy);
    if (!creator) return undefined;
    return creator.apelido || creator.nome_completo?.split(' ')[0] || undefined;
  };

  const visibleLeads = useMemo(() => {
    if (isAdmin) return leads;
    const teamIds = new Set(allProfiles.map(p => p.id));
    if (user?.id) teamIds.add(user.id);
    return leads.filter(l => l.livre || (l.created_by && teamIds.has(l.created_by)));
  }, [leads, isAdmin, allProfiles, user]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of stages) map[s.id] = [];
    const unassigned: Lead[] = [];
    for (const l of visibleLeads) {
      const sid = (l as any).stage_id;
      if (sid && map[sid]) map[sid].push(l);
      else unassigned.push(l);
    }
    return { map, unassigned };
  }, [stages, visibleLeads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const validateLeadForStage = (lead: Lead, targetStageId: string | null): string | null => {
    if (!targetStageId) return null;
    const stage = stages.find(s => s.id === targetStageId);
    if (!stage) return null;
    const stageName = stage.nome.toLowerCase();

    // RN-01: Block "Envio de Cotação" without cotação attached
    if (stageName.includes('envio de cotação') || stageName.includes('cotação')) {
      if (!lead.boletos_path) return `Para mover para "${stage.nome}", o lead precisa ter uma Cotação (PDF) anexada.`;
    }

    const contactRequiredStages = ['envio de cotação', 'negociação', 'fechamento', 'pós-venda'];
    if (contactRequiredStages.some(s => stageName.includes(s))) {
      if (!lead.contato && !lead.email) return `Para mover para "${stage.nome}", o lead precisa ter Contato ou E-mail preenchido.`;
    }

    const docRequiredStages = ['fechamento', 'pós-venda'];
    if (docRequiredStages.some(s => stageName.includes(s))) {
      const pf = isPessoaFisica(lead.tipo);
      if (pf && !lead.doc_foto_path) return `Para mover para "${stage.nome}", o lead precisa ter Documento com Foto anexado.`;
      if (!pf && !lead.cartao_cnpj_path) return `Para mover para "${stage.nome}", o lead precisa ter Cartão CNPJ anexado.`;
    }

    return null;
  };

  const handleDrop = (stageId: string | null) => {
    if (!draggedLeadId) return;
    const lead = leads.find(l => l.id === draggedLeadId);
    if (lead) {
      const error = validateLeadForStage(lead, stageId);
      if (error) {
        toast.error(error);
        setDraggedLeadId(null);
        return;
      }
    }

    // Check if target stage is "Venda Realizada"
    if (stageId) {
      const stage = stages.find(s => s.id === stageId);
      if (stage && stage.nome.toLowerCase().includes('venda realizada')) {
        // Redirect to sales form with lead data pre-filled
        moveMut.mutate({ leadId: draggedLeadId, stageId });
        setDraggedLeadId(null);
        // Celebrate!
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
        // Navigate to commercial page with lead data in state
        if (lead) {
          navigate('/comercial', { state: { prefillLead: lead } });
        }
        return;
      }
    }

    moveMut.mutate({ leadId: draggedLeadId, stageId });
    setDraggedLeadId(null);
  };

  const openEdit = (l: Lead) => {
    const canEdit = isAdmin || l.created_by === user?.id;
    if (!canEdit) {
      setApprovalDialog({ type: 'edit', lead: l });
      setApprovalJustificativa('');
      return;
    }
    setEditItem(l);
    // Parse extended data from origem JSON
    let ext: any = {};
    try { if (l.origem) ext = JSON.parse(l.origem); } catch { /* not JSON */ }
    setForm({
      tipo: l.tipo, nome: l.nome, contato: l.contato || '', email: l.email || '',
      cpf: l.cpf || '', cnpj: l.cnpj || '', endereco: l.endereco || '',
      idade: l.idade ? String(l.idade) : '',
      livre: l.livre || false,
      possuiAproveitamento: ext.plano_anterior || false,
      produto: ext.produto || '', quantidade_vidas: ext.quantidade_vidas ? String(ext.quantidade_vidas) : '',
      companhia_nome: ext.companhia_nome || '', valor: ext.valor ? maskCurrency(String(Math.round(ext.valor * 100))) : '',
      vendaDental: ext.vendaDental || false,
      coParticipacao: ext.coParticipacao || 'sem',
      estagiarios: ext.estagiarios || false,
      qtdEstagiarios: ext.qtdEstagiarios || '',
      observacoes: ext.observacoes || '',
      dataVigencia: ext.dataVigencia || '',
    });
    setTitulares(ext.titulares?.length ? ext.titulares : [{ nome: '', idade: '', produto: '' }]);
    setDependentes(ext.dependentes?.length ? ext.dependentes : []);
    setFormStageId(l.stage_id || null);
    setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setCotacaoPdfs([]); setCarteirinhaAnterior(null); setCartaPermanencia(null);
    // Load existing cotação paths from origem JSON
    setExistingCotacaoPaths(ext.cotacao_paths || (l.boletos_path ? [l.boletos_path] : []));
    // Load existing carência paths from origem JSON
    setExistingCarteirinhaPath(ext.carteirinha_anterior_path || null);
    setExistingCartaPath(ext.carta_permanencia_path || null);
    setShowForm(true);
  };

  // FEAT-01: Assume a free lead
  const handleAssumeLead = async (l: Lead) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { toast.error('Não autenticado.'); return; }
      await updateMut.mutateAsync({ id: l.id, created_by: currentUser.id, livre: false } as any);
      toast.success(`Lead "${l.nome}" assumido! Agora ele é seu.`);
      logAction('assumir_lead', 'lead', l.id, { nome: l.nome });
    } catch (err: any) { toast.error(err.message); }
  };

  const requestDelete = (l: Lead) => {
    const canDel = isAdmin || l.created_by === user?.id;
    if (!canDel) {
      setApprovalDialog({ type: 'delete', lead: l });
      setApprovalJustificativa('');
      return;
    }
    setDeleteItem(l);
  };

  const openAdd = (stageId?: string | null) => {
    setEditItem(null);
    setForm({ tipo: '', nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '', idade: '', livre: false, possuiAproveitamento: false, produto: '', quantidade_vidas: '', companhia_nome: '', valor: '', vendaDental: false, coParticipacao: 'sem', estagiarios: false, qtdEstagiarios: '', observacoes: '', dataVigencia: '' });
    setTitulares([{ nome: '', idade: '', produto: '' }]);
    setDependentes([]);
    setFormStageId(stageId ?? (stages.length > 0 ? stages[0].id : null));
    setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setCotacaoPdfs([]); setExistingCotacaoPaths([]); setCarteirinhaAnterior(null); setCartaPermanencia(null);
    setExistingCarteirinhaPath(null); setExistingCartaPath(null);
    setAssignedTo(user?.id || '');
    setShowForm(true);
  };

  const uploadFile = async (file: File, leadId: string, prefix: string): Promise<string> => {
    // Sanitize filename: remove accents, replace spaces with underscores, strip special chars
    const safeName = file.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/\s+/g, '_')                             // spaces → underscores
      .replace(/[^a-zA-Z0-9._-]/g, '');                 // strip remaining special chars
    const filePath = `${leadId}/${prefix}_${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('lead-documentos').upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome.'); return; }
    if (!form.tipo) { toast.error('Selecione o Tipo / Modalidade.'); return; }
    setSaving(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Preserve existing carência paths from previous origem JSON when editing
    let existingCarenciaPaths: any = {};
    if (editItem?.origem) {
      try {
        const prev = JSON.parse(editItem.origem);
        if (prev.carteirinha_anterior_path) existingCarenciaPaths.carteirinha_anterior_path = prev.carteirinha_anterior_path;
        if (prev.carta_permanencia_path) existingCarenciaPaths.carta_permanencia_path = prev.carta_permanencia_path;
      } catch { /* ignore */ }
    }

    // Build extended draft data JSON (fields not in DB stored here)
    const extendedData = JSON.stringify({
      vendaDental: form.vendaDental,
      coParticipacao: form.coParticipacao,
      estagiarios: form.estagiarios,
      qtdEstagiarios: form.qtdEstagiarios,
      observacoes: form.observacoes,
      companhia_nome: form.companhia_nome,
      plano_anterior: form.possuiAproveitamento,
      produto: form.produto || null,
      quantidade_vidas: form.quantidade_vidas ? parseInt(form.quantidade_vidas) : null,
      valor: form.valor ? (() => { const v = unmaskCurrency(form.valor); return isNaN(v) || v === 0 ? null : v; })() : null,
      dataVigencia: form.dataVigencia || null,
      titulares: titulares.filter(t => t.nome.trim()),
      dependentes: dependentes.filter(d => d.nome.trim()),
      ...existingCarenciaPaths,
    });
    const payload: any = {
      tipo: form.tipo, nome: form.nome.trim(), contato: form.contato || null,
      email: form.email || null, endereco: form.endereco || null, stage_id: formStageId,
      idade: form.idade ? parseInt(form.idade) : null,
      origem: extendedData,
    };
    payload.livre = form.livre;
    if (isPessoaFisica(form.tipo)) { payload.cpf = form.cpf || null; payload.cnpj = null; }
    else { payload.cnpj = form.cnpj || null; payload.cpf = null; }
    if (!editItem) { payload.created_by = (isAdmin && assignedTo) ? assignedTo : (currentUser?.id || null); }
    try {
      let leadId: string;
      if (editItem) {
        leadId = editItem.id;
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
      } else {
        const result = await createMut.mutateAsync(payload);
        leadId = result.id;
      }
      const updates: any = {};
      if (docFoto) updates.doc_foto_path = await uploadFile(docFoto, leadId, 'doc_foto');
      if (cartaoCnpj) updates.cartao_cnpj_path = await uploadFile(cartaoCnpj, leadId, 'cartao_cnpj');
      if (comprovanteEndereco) updates.comprovante_endereco_path = await uploadFile(comprovanteEndereco, leadId, 'comprovante');
      // Upload cotação PDFs (up to 3)
      const allCotacaoPaths = [...existingCotacaoPaths];
      for (const cpdf of cotacaoPdfs) {
        if (allCotacaoPaths.length >= 3) break;
        const path = await uploadFile(cpdf, leadId, 'cotacao');
        allCotacaoPaths.push(path);
      }
      if (allCotacaoPaths.length > 0) {
        updates.boletos_path = allCotacaoPaths[0]; // First cotação in the DB column
      }
      // RN-02: Carência files - save paths in origem JSON
      let carenciaUpdates: any = {};
      if (carteirinhaAnterior) carenciaUpdates.carteirinha_anterior_path = await uploadFile(carteirinhaAnterior, leadId, 'carteirinha');
      if (cartaPermanencia) carenciaUpdates.carta_permanencia_path = await uploadFile(cartaPermanencia, leadId, 'carta_permanencia');
      // Always merge cotação paths into origem JSON
      const needsOrigemUpdate = allCotacaoPaths.length > 0 || Object.keys(carenciaUpdates).length > 0;
      if (Object.keys(updates).length > 0 || needsOrigemUpdate) {
        if (needsOrigemUpdate) {
          const baseOrigem = JSON.parse(extendedData);
          const mergedOrigem = JSON.stringify({ ...baseOrigem, ...carenciaUpdates, cotacao_paths: allCotacaoPaths });
          updates.origem = mergedOrigem;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('leads').update(updates as any).eq('id', leadId);
        }
      }
      // Re-invalidate leads cache AFTER all uploads to ensure doc paths are in DB
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(editItem ? 'Lead atualizado!' : 'Lead criado!');
      logAction(editItem ? 'editar_lead' : 'criar_lead', 'lead', leadId, { nome: form.nome.trim() });
      setShowForm(false); setEditItem(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const sendApprovalRequest = async () => {
    if (!approvalDialog || !approvalJustificativa.trim()) { toast.error('Informe a justificativa.'); return; }
    setSendingApproval(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Não autenticado');
      const { error } = await supabase.from('correction_requests').insert({
        user_id: currentUser.id, tipo: 'lead',
        registro_id: approvalDialog.lead.id, motivo: `[${approvalDialog.type === 'edit' ? 'Edição' : 'Exclusão'}] ${approvalJustificativa.trim()}`,
      } as any);
      if (error) throw error;
      toast.success('Solicitação enviada ao supervisor!');
      setApprovalDialog(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingApproval(false); }
  };

  const FileUploadField = ({ label, file, onFileChange, existingPath }: { label: string; file: File | null; onFileChange: (f: File | null) => void; existingPath?: string | null }) => {
    const hasExisting = !file && !!existingPath;
    const hasFile = !!file;
    const fileName = file ? file.name : existingPath ? existingPath.split('/').pop() || 'Arquivo' : null;
    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        {(hasFile || hasExisting) ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-success/30 bg-success/5 text-xs">
            <FileText className="w-3.5 h-3.5 text-success shrink-0" />
            <span className="text-success flex-1 truncate">{fileName} ✓</span>
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { onFileChange(e.target.files?.[0] || null); e.target.value = ''; }} />
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border/30 text-[10px] font-medium hover:bg-muted transition-colors cursor-pointer">
                <Upload className="w-3 h-3" /> Trocar
              </span>
            </label>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => onFileChange(e.target.files?.[0] || null)} />
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-xs hover:bg-muted transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Selecionar...</span>
            </span>
          </label>
        )}
      </div>
    );
  };

  if (stagesLoading || leadsLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">CRM — Board de Leads</h2>
          <p className="text-xs text-muted-foreground">Arraste leads entre colunas para atualizar o status</p>
        </div>
        <Button onClick={() => openAdd()} className="gap-1.5 font-semibold shadow-brand" size="sm">
          <Plus className="w-4 h-4" /> Novo Lead
        </Button>
      </div>

      {!isAdmin && (
        <div className="bg-accent/50 rounded-xl p-3 border border-border/30 flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Você pode criar, editar e excluir <strong>seus próprios leads</strong>. Para editar leads de outros consultores, envie uma solicitação ao supervisor.
          </p>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 min-h-[calc(100vh-16rem)] kanban-scroll">
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage.map[stage.id] || []}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={requestDelete}
            onDragStart={handleDragStart}
            onDrop={stageId => handleDrop(stageId)}
            onAddLead={stageId => openAdd(stageId)}
            onAssume={handleAssumeLead}
            getLeaderName={getLeaderName}
            currentUserId={user?.id}
          />
        ))}
      </div>

      {/* Lead Form Dialog - Full Sales Draft */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Novo'} Lead (Rascunho de Venda)</DialogTitle></DialogHeader>
          {/* Admin: assign lead to a user */}
          {isAdmin && (
            <div className="mb-3">
              <label className="text-xs font-semibold text-muted-foreground">Vincular a Usuário</label>
              <Select value={assignedTo || '__self__'} onValueChange={v => setAssignedTo(v === '__self__' ? (user?.id || '') : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o consultor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__self__">Eu mesmo</SelectItem>
                  {allProfiles.filter(p => !p.disabled && p.id !== user?.id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_completo} ({p.cargo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-3">
            {stages.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Coluna</label>
                <Select value={formStageId || 'none'} onValueChange={v => setFormStageId(v === 'none' ? null : v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem coluna</SelectItem>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.cor }} />{s.nome}</div></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tipo / Modalidade <span className="text-destructive">*</span></label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a modalidade..." /></SelectTrigger>
                <SelectContent>
                  {modalidadesList.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {!form.tipo && <p className="text-[10px] text-destructive mt-1">Obrigatório</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome <span className="text-destructive">*</span></label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground">Contato</label><Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground">E-mail</label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-10" /></div>
            </div>
            {isPessoaFisica(form.tipo) ? (
              <div><label className="text-xs font-semibold text-muted-foreground">CPF</label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" className="h-10" /></div>
            ) : (
              <div><label className="text-xs font-semibold text-muted-foreground">CNPJ</label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} className="h-10" /></div>
            )}
            <div><label className="text-xs font-semibold text-muted-foreground">Endereço</label><Input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} className="h-10" /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Idade</label>
                <Input type="number" value={form.idade} onChange={e => setForm(p => ({ ...p, idade: e.target.value }))} placeholder="Ex: 30" className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Qtd. de Vidas</label>
                <Input type="number" value={form.quantidade_vidas} onChange={e => setForm(p => ({ ...p, quantidade_vidas: e.target.value }))} placeholder="Ex: 3" className="h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Companhia</label>
                <Select value={form.companhia_nome || '__none__'} onValueChange={v => { setForm(p => ({ ...p, companhia_nome: v === '__none__' ? '' : v, produto: '' })); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {companhias.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Produto</label>
                <Select value={form.produto || '__none__'} onValueChange={v => setForm(p => ({ ...p, produto: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {(() => {
                      const selectedCompanhia = companhias.find(c => c.nome === form.companhia_nome);
                      const filtered = selectedCompanhia
                        ? produtos.filter(p => p.companhia_id === selectedCompanhia.id)
                        : produtos;
                      return filtered.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary/50 font-medium">R$</span>
                <Input value={form.valor} onChange={e => setForm(p => ({ ...p, valor: maskCurrency(e.target.value) }))} placeholder="0,00" className="h-10 pl-10" />
              </div>
            </div>

            {/* Toggles Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                <Switch checked={form.possuiAproveitamento} onCheckedChange={v => setForm(p => ({ ...p, possuiAproveitamento: v }))} />
                <Label className="text-sm text-foreground">Plano anterior (Aproveitamento de Carência)?</Label>
              </div>
              {/* RN-02: Dynamic upload fields for carência */}
              {form.possuiAproveitamento && (
                <div className="ml-4 space-y-2 border-l-2 border-primary/20 pl-3">
                  <FileUploadField label="Foto Carteirinha Anterior" file={carteirinhaAnterior} onFileChange={setCarteirinhaAnterior} existingPath={existingCarteirinhaPath} />
                  <FileUploadField label="Carta de Permanência (PDF)" file={cartaPermanencia} onFileChange={setCartaPermanencia} existingPath={existingCartaPath} />
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                <Switch checked={form.vendaDental} onCheckedChange={v => setForm(p => ({ ...p, vendaDental: v }))} />
                <Label className="text-sm text-foreground">Venda c/ Dental</Label>
                <span className="text-xs text-muted-foreground ml-auto">{form.vendaDental ? 'Sim' : 'Não'}</span>
              </div>
            </div>

            {/* Co-Participação */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Co-Participação</label>
              <Select value={form.coParticipacao} onValueChange={v => setForm(p => ({ ...p, coParticipacao: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem">Sem Co-Participação</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="completa">Completa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data de Vigência */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Data de Vigência</label>
              <Input type="date" value={form.dataVigencia} onChange={e => setForm(p => ({ ...p, dataVigencia: e.target.value }))} className="h-10" />
            </div>

            {/* Estagiários */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
              <Switch checked={form.estagiarios} onCheckedChange={v => setForm(p => ({ ...p, estagiarios: v }))} />
              <Label className="text-sm text-foreground">Estagiários</Label>
              <span className="text-xs text-muted-foreground ml-auto">{form.estagiarios ? 'Sim' : 'Não'}</span>
            </div>
            {form.estagiarios && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Qtd. Estagiários</label>
                <Input type="number" min={1} value={form.qtdEstagiarios} onChange={e => setForm(p => ({ ...p, qtdEstagiarios: e.target.value }))} placeholder="Ex: 2" className="h-10" />
              </div>
            )}

            {/* Auto-fill titular 1 from lead data */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
              <Switch
                checked={form.nome ? titulares[0]?.nome === form.nome : false}
                onCheckedChange={(checked) => {
                  if (checked && form.nome) {
                    const arr = [...titulares];
                    arr[0] = { ...arr[0], nome: form.nome, idade: form.idade || arr[0].idade };
                    if (form.produto) arr[0] = { ...arr[0], produto: form.produto };
                    setTitulares(arr);
                    toast.success('Dados do responsável aplicados ao 1º titular!');
                  } else {
                    const arr = [...titulares];
                    arr[0] = { ...arr[0], nome: '', idade: '', produto: '' };
                    setTitulares(arr);
                  }
                }}
              />
              <Label className="text-sm text-foreground cursor-pointer">Utilizar as informações do responsável no titular 1</Label>
            </div>

            {/* Titulares Section */}
            <div className="border-t border-border/20 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Titulares ({titulares.length})</p>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setTitulares(t => [...t, { nome: '', idade: '', produto: '' }])}>
                  + Adicionar
                </Button>
              </div>
              {titulares.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_1fr_32px] gap-2 mb-2 items-end">
                  <div>
                    {i === 0 && <label className="text-[10px] text-muted-foreground">Nome</label>}
                    <Input value={t.nome} onChange={e => { const arr = [...titulares]; arr[i] = { ...t, nome: e.target.value }; setTitulares(arr); }} placeholder="Nome" className="h-9 text-sm" />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-muted-foreground">Idade</label>}
                    <Input type="number" value={t.idade} onChange={e => { const arr = [...titulares]; arr[i] = { ...t, idade: e.target.value }; setTitulares(arr); }} placeholder="30" className="h-9 text-sm" />
                  </div>
                  <div>
                    {i === 0 && <label className="text-[10px] text-muted-foreground">Produto</label>}
                    <Select value={t.produto || '__none__'} onValueChange={v => { const arr = [...titulares]; arr[i] = { ...t, produto: v === '__none__' ? '' : v }; setTitulares(arr); }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Produto" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {produtos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-8 p-0 text-destructive" onClick={() => { if (titulares.length > 1) setTitulares(t2 => t2.filter((_, j) => j !== i)); }} disabled={titulares.length <= 1}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Dependentes Section */}
            <div className="border-t border-border/20 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em] flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" />Dependentes ({dependentes.length})</p>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setDependentes(d => [...d, { nome: '', idade: '', produto: '', descricao: '' }])}>
                  + Adicionar
                </Button>
              </div>
              {dependentes.map((d, i) => (
                <div key={i} className="space-y-1.5 mb-3 p-2.5 bg-muted/30 rounded-lg border border-border/10">
                  <div className="grid grid-cols-[1fr_70px_32px] gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Nome</label>
                      <Input value={d.nome} onChange={e => { const arr = [...dependentes]; arr[i] = { ...d, nome: e.target.value }; setDependentes(arr); }} placeholder="Nome" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Idade</label>
                      <Input type="number" value={d.idade} onChange={e => { const arr = [...dependentes]; arr[i] = { ...d, idade: e.target.value }; setDependentes(arr); }} placeholder="30" className="h-9 text-sm" />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-9 w-8 p-0 text-destructive" onClick={() => setDependentes(d2 => d2.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Produto</label>
                      <Select value={d.produto || '__none__'} onValueChange={v => { const arr = [...dependentes]; arr[i] = { ...d, produto: v === '__none__' ? '' : v }; setDependentes(arr); }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {produtos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Descrição</label>
                      <Input value={d.descricao} onChange={e => { const arr = [...dependentes]; arr[i] = { ...d, descricao: e.target.value }; setDependentes(arr); }} placeholder="Ex: Cônjuge" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Observações */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Observações</label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais..." rows={3} />
            </div>

            {/* Lead Livre (Admin only) */}
            {isAdmin && (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                <input type="checkbox" checked={form.livre} onChange={e => setForm(p => ({ ...p, livre: e.target.checked }))} className="w-4 h-4 rounded border-border" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Lead Livre</p>
                  <p className="text-[10px] text-muted-foreground">Qualquer consultor pode assumir este lead.</p>
                </div>
              </div>
            )}

            <div className="border-t border-border/20 pt-3 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em]">Documentos</p>
              {isPessoaFisica(form.tipo) && <FileUploadField label="Documento com Foto" file={docFoto} onFileChange={setDocFoto} existingPath={editItem?.doc_foto_path} />}
              {!isPessoaFisica(form.tipo) && <FileUploadField label="Cartão CNPJ" file={cartaoCnpj} onFileChange={setCartaoCnpj} existingPath={editItem?.cartao_cnpj_path} />}
              <FileUploadField label="Comprovante de Endereço" file={comprovanteEndereco} onFileChange={setComprovanteEndereco} existingPath={editItem?.comprovante_endereco_path} />
              {/* Cotação PDFs (up to 3) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Cotações (PDF) — máx. 3</label>
                {existingCotacaoPaths.map((p, i) => (
                  <div key={`existing-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 bg-card text-xs">
                    <FileText className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-success flex-1 truncate">Cotação {i + 1} ✓</span>
                    <button type="button" onClick={() => setExistingCotacaoPaths(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                {cotacaoPdfs.map((f, i) => (
                  <div key={`new-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 bg-card text-xs">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-primary flex-1 truncate">{f.name}</span>
                    <button type="button" onClick={() => setCotacaoPdfs(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                {(existingCotacaoPaths.length + cotacaoPdfs.length) < 3 && (
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) setCotacaoPdfs(prev => [...prev, f]); e.target.value = ''; }} />
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-xs hover:bg-muted transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">Anexar PDF...</span>
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.tipo}>{saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Lead</DialogTitle><DialogDescription>Excluir "{deleteItem?.nome}"?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => { setSaving(true); try { await deleteMut.mutateAsync(deleteItem!.id); toast.success('Excluído!'); setDeleteItem(null); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }} disabled={saving}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog (non-admins) */}
      <Dialog open={!!approvalDialog} onOpenChange={v => { if (!v) setApprovalDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{approvalDialog?.type === 'edit' ? 'Solicitar Edição' : 'Solicitar Exclusão'}</DialogTitle>
            <DialogDescription>Informe a justificativa para que seu supervisor aprove.</DialogDescription>
          </DialogHeader>
          <Textarea value={approvalJustificativa} onChange={e => setApprovalJustificativa(e.target.value)} placeholder="Justificativa..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancelar</Button>
            <Button onClick={sendApprovalRequest} disabled={sendingApproval}>{sendingApproval ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
