import { useState, useMemo } from 'react';
import { differenceInDays, addDays, isPast, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useLeadStages, useMoveLeadToStage, type LeadStage } from '@/hooks/useLeadStages';
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type Lead } from '@/hooks/useInventario';
import { useModalidades, useCompanhias, useProdutos } from '@/hooks/useInventario';
import { useUserRole, useProfile, useTeamProfiles } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { useSubmitCorrectionRequest } from '@/hooks/useCorrectionRequests';
import { useMyPermissions, hasPermission } from '@/hooks/useSecurityProfiles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, X, Upload, MoreHorizontal, Phone, Mail, Shield, User, FileText, Building2, Users, Heart, DollarSign, Undo2, CheckCircle2
} from 'lucide-react';
import { maskCPF, maskCNPJ, maskPhone, maskCurrency, unmaskCurrency } from '@/lib/masks';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/* ─── Lead Card ─── */
function getLeadValor(lead: Lead): number | null {
  try {
    if (lead.origem) {
      const ext = JSON.parse(lead.origem);
      // Sum individual cotação values if present
      if (ext.cotacao_values && Array.isArray(ext.cotacao_values)) {
        const sum = ext.cotacao_values.reduce((acc: number, v: number) => acc + (v || 0), 0);
        if (sum > 0) return sum;
      }
      // Fallback to single valor
      if (ext.valor && !isNaN(ext.valor) && ext.valor > 0) return ext.valor;
    }
  } catch { /* not JSON */ }
  return null;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function LeadCard({ lead, isAdmin, onEdit, onDelete, onDragStart, onAssume, leaderName, stageName, currentUserId, canEditOwn, canCreate }: {
  lead: Lead; isAdmin: boolean;
  onEdit: (l: Lead) => void; onDelete: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onAssume: (l: Lead) => void;
  leaderName?: string;
  stageName?: string;
  currentUserId?: string;
  canEditOwn: boolean;
  canCreate: boolean;
}) {
  const valor = getLeadValor(lead);
  const isEnvioCotacao = stageName?.toLowerCase().includes('envio de cotação') || stageName?.toLowerCase().includes('cotação');
  const initials = leaderName ? leaderName.charAt(0).toUpperCase() : null;
  const canAssume = lead.livre && lead.created_by !== currentUserId && canEditOwn;
  const isOwner = lead.created_by === currentUserId;
  const canEditLead = isAdmin || (canEditOwn && isOwner);
  const showMenu = canEditLead || isAdmin;

  const followUpStatus = useMemo(() => {
    const stage = stageName?.toLowerCase() || '';
    if (stage.includes('venda realizada') || stage.includes('implantada')) return null;
    if (!lead.tempo_follow_up_dias || !lead.data_ultimo_contato) return null;
    const lastContact = parseISO(lead.data_ultimo_contato);
    const dueDate = addDays(lastContact, lead.tempo_follow_up_dias);
    const isDue = isPast(dueDate);
    const daysOverdue = differenceInDays(new Date(), dueDate);
    return { isDue, daysOverdue };
  }, [lead.tempo_follow_up_dias, lead.data_ultimo_contato, stageName]);

  const docsCount = [lead.doc_foto_path, lead.cartao_cnpj_path, lead.comprovante_endereco_path, lead.boletos_path].filter(Boolean).length;

  return (
    <div
      draggable={canEditLead}
      onDragStart={e => onDragStart(e, lead.id)}
      className={cn(
        "group relative bg-card/90 backdrop-blur-sm rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden",
        canEditLead
          ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 border-border/40 hover:border-primary/30"
          : "opacity-70 grayscale-[0.3] border-border/20"
      )}
    >
      {/* Left accent bar by tipo */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
        lead.tipo === 'PJ' || lead.tipo === 'Empresarial' ? 'bg-violet-500' :
        lead.tipo === 'PF' || lead.tipo === 'Familiar' ? 'bg-blue-500' :
        lead.tipo === 'Adesão' ? 'bg-emerald-500' : 'bg-primary'
      )} />

      <div className="pl-3 pr-3 pt-3 pb-2.5 ml-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-foreground truncate leading-tight">{lead.nome}</p>
            {leaderName && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[7px] font-black text-primary">{initials}</span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{leaderName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {followUpStatus?.isDue && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                <span className="text-[9px] font-bold text-destructive">
                  {followUpStatus.daysOverdue > 0 ? `${followUpStatus.daysOverdue}d` : 'hoje'}
                </span>
              </div>
            )}
            {showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => onEdit(lead)} className="text-xs gap-2"><Pencil className="w-3 h-3" /> Editar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(lead)} className="text-xs gap-2 text-destructive"><Trash2 className="w-3 h-3" /> Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
            lead.tipo === 'PJ' || lead.tipo === 'Empresarial' ? 'bg-violet-500/10 text-violet-600 border-violet-500/20' :
            lead.tipo === 'PF' || lead.tipo === 'Familiar' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
            'bg-primary/10 text-primary border-primary/20'
          )}>{lead.tipo}</span>
          {lead.produto && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/30 truncate max-w-[80px]" title={lead.produto}>{lead.produto}</span>
          )}
          {lead.livre && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Livre</span>
          )}
        </div>

        {/* Contact info */}
        {(lead.contato || lead.email) && (
          <div className="mt-2 space-y-0.5">
            {lead.contato && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Phone className="w-2.5 h-2.5 text-primary/60" />
                <span>{lead.contato}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                <Mail className="w-2.5 h-2.5 text-primary/60 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer: value + docs */}
        <div className="mt-2.5 pt-2 border-t border-border/20 flex items-center justify-between gap-2">
          {valor !== null ? (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-2.5 h-2.5 text-emerald-600" />
              </div>
              <span className="text-[11px] font-bold text-emerald-600">{formatBRL(valor)}</span>
            </div>
          ) : <div />}
          {docsCount > 0 && (
            <div className="flex items-center gap-0.5">
              {lead.doc_foto_path && <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-success/15 text-success">Doc</span>}
              {lead.cartao_cnpj_path && <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-success/15 text-success">CNPJ</span>}
              {lead.boletos_path && <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-primary/15 text-primary">Cot.</span>}
            </div>
          )}
        </div>

        {/* Assume button */}
        {canAssume && (
          <button
            onClick={(e) => { e.stopPropagation(); onAssume(lead); }}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-primary/25 bg-primary/5 text-[10px] font-bold text-primary hover:bg-primary/10 hover:border-primary/40 transition-all"
          >
            <User className="w-3 h-3" /> Assumir Lead
          </button>
        )}
      </div>
    </div>
  );
}



/* ─── Kanban Column ─── */
function KanbanColumn({ stage, leads, isAdmin, onEdit, onDelete, onDragStart, onDrop, onAddLead, onAssume, getLeaderName, currentUserId, canEditOwn, canCreate }: {
  stage: LeadStage; leads: Lead[]; isAdmin: boolean;
  onEdit: (l: Lead) => void; onDelete: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDrop: (stageId: string) => void;
  onAddLead: (stageId: string) => void;
  onAssume: (l: Lead) => void;
  getLeaderName: (createdBy: string | null) => string | undefined;
  currentUserId?: string;
  canEditOwn: boolean;
  canCreate: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

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
      className={cn(
        "flex flex-col w-[270px] shrink-0 rounded-2xl border-2 transition-all duration-200 overflow-hidden",
        dragOver
          ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10'
          : 'border-border/30 bg-muted/20'
      )}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(stage.id); }}
    >
      {/* Column header */}
      <div
        className="px-3.5 py-3 border-b border-border/25 bg-card/70 backdrop-blur-sm"
        style={{ borderTop: `3px solid ${stage.cor}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/30" style={{ backgroundColor: stage.cor }} />
            <span className="text-[13px] font-bold text-foreground truncate">{stage.nome}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {columnTotal > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 hidden xl:block">{formatBRL(columnTotal)}</span>
            )}
            <div
              className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ backgroundColor: `${stage.cor}20`, color: stage.cor }}
            >
              {leads.length}
            </div>
          </div>
        </div>
      </div>

      {/* Cards area */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[120px]">
        {leads.map(l => (
          <LeadCard
            key={l.id}
            lead={l}
            isAdmin={isAdmin}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onAssume={onAssume}
            leaderName={getLeaderName(l.created_by)}
            stageName={stage.nome}
            currentUserId={currentUserId}
            canEditOwn={canEditOwn}
            canCreate={canCreate}
          />
        ))}
        {leads.length === 0 && (
          <div className={cn(
            "flex flex-col items-center justify-center py-8 text-center transition-all duration-200",
            dragOver ? 'opacity-100' : 'opacity-40'
          )}>
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2">
              <Plus className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Arraste leads para cá</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 bg-card/40 px-3 py-2 flex items-center justify-between gap-2">
        {canCreate ? (
          <button
            onClick={() => onAddLead(stage.id)}
            className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors group/btn"
          >
            <div className="w-4 h-4 rounded-md bg-muted/60 group-hover/btn:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus className="w-2.5 h-2.5" />
            </div>
            Novo lead
          </button>
        ) : <div />}
        <span className={cn(
          "text-[10px] font-bold tabular-nums",
          columnTotal > 0 ? 'text-emerald-600' : 'text-muted-foreground/50'
        )}>
          {formatBRL(columnTotal)}
        </span>
      </div>
    </div>
  );
}

/* ─── Main Kanban Board ─── */
export function KanbanBoard({ permissionNamespace = 'crm.leads' }: { permissionNamespace?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: allProfiles = [] } = useTeamProfiles();
  const { data: myPermissions } = useMyPermissions();
  const isAdmin = hasPermission(myPermissions, permissionNamespace, 'edit_leads');
  const canViewAll = hasPermission(myPermissions, permissionNamespace, 'view_all');
  const canViewOwn = hasPermission(myPermissions, permissionNamespace, 'view_own');
  const canEditOwn = hasPermission(myPermissions, permissionNamespace, 'edit');
  const canCreate = hasPermission(myPermissions, permissionNamespace, 'create');
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
  const submitCR = useSubmitCorrectionRequest();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('all');

  // Lead form state - full sales draft
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Lead | null>(null);
  const [formStageId, setFormStageId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: '', nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '', idade: '',
    livre: false, possuiAproveitamento: false,
    produto: '', quantidade_vidas: '', companhia_nome: [] as string[], valor: '',
    vendaDental: false, coParticipacao: 'sem' as string, estagiarios: false, qtdEstagiarios: '',
    observacoes: '', dataVigencia: '', tempoFollowUpDias: '0',
  });
  const [titulares, setTitulares] = useState<{ nome: string; idade: string; produto: string }[]>([{ nome: '', idade: '', produto: '' }]);
  const [dependentes, setDependentes] = useState<{ nome: string; idade: string; produto: string; descricao: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Lead | null>(null);

  // Approval state for non-admins
  const [approvalDialog, setApprovalDialog] = useState<{ type: 'edit' | 'delete'; lead: Lead } | null>(null);
  const [approvalJustificativa, setApprovalJustificativa] = useState('');
  const [sendingApproval, setSendingApproval] = useState(false);

  // Retrocessos
  const [retrocessoLead, setRetrocessoLead] = useState<{ lead: Lead; targetStageId: string | null } | null>(null);
  const [retrocessoJustificativa, setRetrocessoJustificativa] = useState('');
  const [savingRetrocesso, setSavingRetrocesso] = useState(false);

  // File uploads
  const [docFoto, setDocFoto] = useState<File | null>(null);
  const [cartaoCnpj, setCartaoCnpj] = useState<File | null>(null);
  const [comprovanteEndereco, setComprovanteEndereco] = useState<File | null>(null);
  const [cotacaoPdfs, setCotacaoPdfs] = useState<File[]>([]);
  const [cotacaoValues, setCotacaoValues] = useState<string[]>([]);
  const [existingCotacaoPaths, setExistingCotacaoPaths] = useState<string[]>([]);
  const [existingCotacaoValues, setExistingCotacaoValues] = useState<string[]>([]);
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
    if (canViewAll) {
      // view_all: can see all leads; managers also see their subordinates' leads
      return leads;
    }

    if (canViewOwn) {
      // view_own: ONLY the user's own leads (not subordinates')
      return leads.filter(l =>
        l.livre ||
        l.created_by === user?.id
      );
    }

    // No explicit permission: only free/unassigned leads
    return leads.filter(l => l.livre);
  }, [leads, canViewAll, canViewOwn, user]);

  // Apply user filter on top of visibility rules
  const filteredLeads = useMemo(() => {
    if (filterUserId === 'all') return visibleLeads;
    if (filterUserId === 'livre') return visibleLeads.filter(l => l.livre);
    return visibleLeads.filter(l => l.created_by === filterUserId);
  }, [visibleLeads, filterUserId]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of stages) map[s.id] = [];
    const unassigned: Lead[] = [];
    for (const l of filteredLeads) {
      const sid = (l as any).stage_id;
      if (sid && map[sid]) map[sid].push(l);
      else unassigned.push(l);
    }
    return { map, unassigned };
  }, [stages, filteredLeads]);

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
      // ── PARTE 6: Validação de Fluxo Kanban (Trava de Retrocesso) ──
      const getWeight = (sId: string | null) => {
        if (!sId) return 0;
        const s = stages.find(x => x.id === sId);
        if (!s) return 0;
        const name = s.nome.toLowerCase();
        // Peso 7 — Fase Final Absoluta (nenhuma saída permitida)
        if (name.includes('vendas implantadas')) return 7;
        // Peso 6 — Fechamento comercial / Venda Realizada
        if (name.includes('venda realizada') || name.includes('fechamento comercial')) return 6;
        // Peso 5 — Aguardando retorno / Declinado
        if (name.includes('aguardando retorno') || name.includes('declinado')) return 5;
        // Peso 4 — Negociação
        if (name.includes('negociação')) return 4;
        // Peso 3 — Envio de Cotação
        if (name.includes('envio de cotação') || name.includes('cotação')) return 3;
        // Peso 2 — Sem retorno (ex-Sem contato)
        if (name.includes('sem retorno') || name.includes('sem contato')) return 2;
        // Peso 1 — Primeiro contato
        if (name.includes('primeiro contato')) return 1;
        return 0;
      };

      const sourceWeight = getWeight(lead.stage_id);
      const targetWeight = getWeight(stageId);

      // Block exit from "Vendas Implantadas" (peso 7 - fase final absoluta)
      if (sourceWeight === 7 && targetWeight !== 7) {
        toast.error('Leads em "Vendas Implantadas" representam clientes ativos na base e não podem retornar ao funil.');
        setDraggedLeadId(null);
        return;
      }

      // Backward move: Request justification
      if (targetWeight < sourceWeight && targetWeight > 0) {
        setRetrocessoLead({ lead, targetStageId: stageId });
        setRetrocessoJustificativa('');
        setDraggedLeadId(null);
        return;
      }
    }

    // Check if target stage triggers celebration (Venda Realizada or Vendas Implantadas)
    if (stageId) {
      const stage = stages.find(s => s.id === stageId);
      const stageName = stage?.nome.toLowerCase() || '';
      const isVendaRealizada = stageName.includes('venda realizada');
      const isImplantada = stageName.includes('vendas implantadas') || stageName.includes('implantadas');

      if (isVendaRealizada) {
        moveMut.mutate({ leadId: draggedLeadId, stageId });
        setDraggedLeadId(null);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
        if (lead) navigate('/comercial', { state: { prefillLead: lead } });
        return;
      }

      if (isImplantada) {
        moveMut.mutate({ leadId: draggedLeadId, stageId });
        setDraggedLeadId(null);
        // Celebração maior para cliente implantado na base!
        confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 } });
        toast.success('🎉 Lead implantado na base! Cliente ativo confirmado.');
        return;
      }
    }

    moveMut.mutate({ leadId: draggedLeadId, stageId });
    setDraggedLeadId(null);
  };


  const handleRetrocesso = async () => {
    if (!retrocessoLead || !retrocessoJustificativa.trim()) {
      toast.error('Informe a justificativa do retrocesso.');
      return;
    }
    setSavingRetrocesso(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const sourceStage = stages.find(s => s.id === retrocessoLead.lead.stage_id);
      const targetStage = stages.find(s => s.id === retrocessoLead.targetStageId);

      // Log retrocesso
      await supabase.from('lead_retrocessos').insert({
        lead_id: retrocessoLead.lead.id,
        user_id: user.id,
        coluna_origem: sourceStage?.nome || 'Inexistente',
        coluna_destino: targetStage?.nome || 'Inexistente',
        justificativa: retrocessoJustificativa.trim()
      } as any);

      // Move lead
      await moveMut.mutateAsync({ leadId: retrocessoLead.lead.id, stageId: retrocessoLead.targetStageId });
      
      toast.success('Lead movido com justificativa de retrocesso.');
      logAction('retrocesso_lead', 'lead', retrocessoLead.lead.id, { 
        origem: sourceStage?.nome, 
        destino: targetStage?.nome,
        motivo: retrocessoJustificativa 
      });
      setRetrocessoLead(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingRetrocesso(false);
    }
  };

  const openEdit = (l: Lead) => {
    const isOwner = l.created_by === user?.id;
    const canEditLead = isAdmin || (canEditOwn && isOwner);

    if (!canEditLead) {
      if (!isAdmin && !canEditOwn) {
        toast.error('Seu perfil não possui permissão para editar leads.'); return;
      }
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
      tempoFollowUpDias: String(l.tempo_follow_up_dias ?? 0)
    });
    setTitulares(ext.titulares?.length ? ext.titulares : [{ nome: '', idade: '', produto: '' }]);
    setDependentes(ext.dependentes?.length ? ext.dependentes : []);
    setFormStageId(l.stage_id || null);
    setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setCotacaoPdfs([]); setCotacaoValues([]); setCarteirinhaAnterior(null); setCartaPermanencia(null);
    // Load existing cotação paths from origem JSON
    setExistingCotacaoPaths(ext.cotacao_paths || (l.boletos_path ? [l.boletos_path] : []));
    // Load existing cotação values
    const existingVals: string[] = [];
    if (ext.cotacao_values && Array.isArray(ext.cotacao_values)) {
      ext.cotacao_values.forEach((v: number) => existingVals.push(v ? maskCurrency(String(Math.round(v * 100))) : ''));
    }
    const pathCount = (ext.cotacao_paths || (l.boletos_path ? [l.boletos_path] : [])).length;
    while (existingVals.length < pathCount) existingVals.push('');
    setExistingCotacaoValues(existingVals);
    // Load existing carência paths from origem JSON
    setExistingCarteirinhaPath(ext.carteirinha_anterior_path || null);
    setExistingCartaPath(ext.carta_permanencia_path || null);
    // Set current owner for transfer field (admin only)
    setAssignedTo(l.created_by || user?.id || '');
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
    const isOwner = l.created_by === user?.id;
    const canDel = isAdmin || (canEditOwn && isOwner);
    if (!canDel) {
      if (!isAdmin && !canEditOwn) {
        toast.error('Privilégios insuficientes para excluir leads.'); return;
      }
      setApprovalDialog({ type: 'delete', lead: l });
      setApprovalJustificativa('');
      return;
    }
    setDeleteItem(l);
  };

  const openAdd = (stageId?: string | null) => {
    if (!canCreate) {
      toast.error('Seu perfil não possui permissão para criar novos leads.');
      return;
    }
    setEditItem(null);
    setForm({ tipo: '', nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '', idade: '', livre: false, possuiAproveitamento: false, produto: '', quantidade_vidas: '', companhia_nome: '', valor: '', vendaDental: false, coParticipacao: 'sem', estagiarios: false, qtdEstagiarios: '', observacoes: '', dataVigencia: '', tempoFollowUpDias: '0' });
    setTitulares([{ nome: '', idade: '', produto: '' }]);
    setDependentes([]);
    setFormStageId(stageId ?? (stages.length > 0 ? stages[0].id : null));
    setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setCotacaoPdfs([]); setCotacaoValues([]); setExistingCotacaoPaths([]); setExistingCotacaoValues([]); setCarteirinhaAnterior(null); setCartaPermanencia(null);
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
    if (editItem) {
      const isOwner = editItem.created_by === user?.id;
      if (!isAdmin && !(canEditOwn && isOwner)) {
        toast.error('Sem permissão para salvar alterações neste lead.');
        return;
      }
    } else if (!canCreate) {
      toast.error('Sem permissão para criar novos leads.');
      return;
    }

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

    // Build cotacao_values array (existing + new)
    const allCotacaoValuesArr: number[] = [
      ...existingCotacaoValues.map(v => v ? unmaskCurrency(v) : 0),
      ...cotacaoValues.map(v => v ? unmaskCurrency(v) : 0),
    ].filter(v => !isNaN(v));
    const totalCotacaoValor = allCotacaoValuesArr.reduce((a, b) => a + b, 0);

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
      valor: totalCotacaoValor > 0 ? totalCotacaoValor : (form.valor ? (() => { const v = unmaskCurrency(form.valor); return isNaN(v) || v === 0 ? null : v; })() : null),
      cotacao_values: allCotacaoValuesArr.length > 0 ? allCotacaoValuesArr : undefined,
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
      tempo_follow_up_dias: parseInt(form.tempoFollowUpDias) || 0,
    };
    payload.livre = form.livre;
    if (isPessoaFisica(form.tipo)) { payload.cpf = form.cpf || null; payload.cnpj = null; }
    else { payload.cnpj = form.cnpj || null; payload.cpf = null; }
    if (!editItem) { payload.created_by = (isAdmin && assignedTo) ? assignedTo : (currentUser?.id || null); }
    try {
      let leadId: string;
      if (editItem) {
        leadId = editItem.id;
        // Allow admin to transfer lead ownership
        if (isAdmin && assignedTo && assignedTo !== editItem.created_by) {
          payload.created_by = assignedTo;
        }
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

      const payload = await submitCR.mutateAsync({
        registroId: approvalDialog.lead.id,
        tipo: 'lead',
        statusAtual: (approvalDialog.lead as any).status || 'pendente',
        justificativa: `[${approvalDialog.type === 'edit' ? 'Edição' : 'Exclusão'}] ${approvalJustificativa.trim()}`,
        alteracoesPropostas: approvalDialog.type === 'edit' ? [
          { campo: 'tempo_follow_up_dias', valorAntigo: approvalDialog.lead.tempo_follow_up_dias, valorNovo: parseInt(form.tempoFollowUpDias) }
        ] : [],
      });

      if (!payload.autoApproved) {
        toast.success('Solicitação enviada ao supervisor!');
      }
      setApprovalDialog(null);
    } catch (e: any) {
      // Error handled by hook
    }
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

  const totalLeads = filteredLeads.length;
  const totalValor = useMemo(() => filteredLeads.reduce((acc, l) => acc + (getLeadValor(l) ?? 0), 0), [filteredLeads]);
  const leadsLivres = filteredLeads.filter(l => l.livre).length;

  if (stagesLoading || leadsLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">CRM — Board de Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie e mova leads pelo funil de vendas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* User filter - only for admins who can view all */}
          {canViewAll && allProfiles.length > 0 && (
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger className="h-10 w-[200px] text-sm border-border/40 bg-card">
                <SelectValue placeholder="Todos os consultores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Todos os consultores</span>
                  </div>
                </SelectItem>
                <SelectItem value="livre">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span>Leads livres</span>
                  </div>
                </SelectItem>
                {allProfiles.filter(p => !p.disabled).map(p => {
                  const name = p.apelido || p.nome_completo?.split(' ')[0] || p.id.slice(0, 8);
                  const initial = name.charAt(0).toUpperCase();
                  const leadsCount = visibleLeads.filter(l => l.created_by === p.id).length;
                  if (leadsCount === 0) return null;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-primary">{initial}</span>
                        </div>
                        <span>{name}</span>
                        <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{leadsCount}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          {filterUserId !== 'all' && (
            <button
              onClick={() => setFilterUserId('all')}
              className="h-10 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/40 rounded-lg bg-card hover:bg-muted/50 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Limpar filtro
            </button>
          )}
          {canCreate && (
            <Button onClick={() => openAdd()} className="gap-2 font-semibold shadow-brand h-10 px-5" size="sm">
              <Plus className="w-4 h-4" /> Novo Lead
            </Button>
          )}
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border/30 shadow-card px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Leads</p>
            <p className="text-xl font-black text-foreground tabular-nums">{totalLeads}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/30 shadow-card px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pipeline</p>
            <p className="text-lg font-black text-emerald-600 truncate tabular-nums">{formatBRL(totalValor)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/30 shadow-card px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Livres</p>
            <p className="text-xl font-black text-foreground tabular-nums">{leadsLivres}</p>
          </div>
        </div>
      </div>

      {/* Kanban board scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 px-0.5 hide-scrollbar snap-x snap-mandatory">
        {stages.map(stage => (
          <div key={stage.id} className="snap-start shrink-0">
            <KanbanColumn
              stage={stage}
              leads={leadsByStage.map[stage.id] || []}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={requestDelete}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onAddLead={openAdd}
              onAssume={handleAssumeLead}
              getLeaderName={getLeaderName}
              currentUserId={user?.id}
              canEditOwn={canEditOwn}
              canCreate={canCreate}
            />
          </div>
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

            {/* Tempo de Follow-up (RN-01) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                Tempo de Follow-up (Dias)
                {editItem && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-[10px] text-primary hover:no-underline"
                    onClick={() => {
                      setApprovalDialog({ type: 'edit', lead: editItem });
                      setApprovalJustificativa('');
                    }}
                  >
                    Solicitar Alteração
                  </Button>
                )}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={form.tempoFollowUpDias}
                  onChange={e => setForm(p => ({ ...p, tempoFollowUpDias: e.target.value }))}
                  disabled={!!editItem}
                  className={`h-10 pr-10 ${editItem ? 'bg-muted/50 opacity-80' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">dias</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome <span className="text-destructive">*</span></label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground">Contato</label><Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: maskPhone(e.target.value) }))} placeholder="(11) 9 9999-9999" className="h-10" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground">E-mail</label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-10" /></div>
            </div>
            {/* CPF / CNPJ */}
            {(() => {
              const mod = modalidadesList.find(m => m.nome === form.tipo);
              const tipDoc = (mod as any)?.tipo_documento;
              const showCpf = tipDoc === 'CPF' || (!tipDoc && isPessoaFisica(form.tipo));

              return showCpf ? (
                <div><label className="text-xs font-semibold text-muted-foreground">CPF</label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" className="h-10" /></div>
              ) : (
                <div><label className="text-xs font-semibold text-muted-foreground">CNPJ</label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: maskCNPJ(e.target.value) }))} placeholder="AA.AAA.AAA/AAAA-DD" className="h-10" /></div>
              );
            })()}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">Companhia de interesse</label>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    (form.companhia_nome as string[]).length >= 3
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {(form.companhia_nome as string[]).length}/3 selecionadas
                  </span>
                </div>
                <div className="border border-border/40 rounded-lg bg-muted/20 max-h-36 overflow-y-auto">
                  {companhias.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma companhia cadastrada</p>
                  )}
                  {companhias.map(c => {
                    const selected = (form.companhia_nome as string[]).includes(c.nome);
                    const atLimit = (form.companhia_nome as string[]).length >= 3 && !selected;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={atLimit}
                        onClick={() => {
                          setForm(p => {
                            const current = p.companhia_nome as string[];
                            if (selected) {
                              return { ...p, companhia_nome: current.filter(n => n !== c.nome), produto: '' };
                            }
                            if (current.length >= 3) return p;
                            return { ...p, companhia_nome: [...current, c.nome] };
                          });
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors border-b border-border/20 last:border-0 ${
                          selected
                            ? 'bg-primary/8 text-primary font-medium'
                            : atLimit
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'bg-primary border-primary' : 'border-border/60'
                        }`}>
                          {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        {c.nome}
                      </button>
                    );
                  })}
                </div>
                {(form.companhia_nome as string[]).length >= 3 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    Limite atingido — máx. 3 companhias
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Produto</label>
                <Select value={form.produto || '__none__'} onValueChange={v => setForm(p => ({ ...p, produto: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {(() => {
                      const selectedIds = companhias
                        .filter(c => (form.companhia_nome as string[]).includes(c.nome))
                        .map(c => c.id);
                      const filtered = selectedIds.length > 0
                        ? produtos.filter(p => selectedIds.includes(p.companhia_id))
                        : produtos;
                      return filtered.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Valor Total (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary/50 font-medium">R$</span>
                <Input
                  value={(() => {
                    const allVals = [...existingCotacaoValues, ...cotacaoValues];
                    const sum = allVals.reduce((acc, v) => acc + (v ? unmaskCurrency(v) : 0), 0);
                    return sum > 0 ? maskCurrency(String(Math.round(sum * 100))) : form.valor;
                  })()}
                  onChange={e => {
                    // Only editable if no cotação values exist
                    const allVals = [...existingCotacaoValues, ...cotacaoValues];
                    const hasCotValues = allVals.some(v => v && unmaskCurrency(v) > 0);
                    if (!hasCotValues) setForm(p => ({ ...p, valor: maskCurrency(e.target.value) }));
                  }}
                  readOnly={[...existingCotacaoValues, ...cotacaoValues].some(v => v && unmaskCurrency(v) > 0)}
                  placeholder="0,00"
                  className={`h-10 pl-10 ${[...existingCotacaoValues, ...cotacaoValues].some(v => v && unmaskCurrency(v) > 0) ? 'bg-muted/50 cursor-not-allowed' : ''}`}
                />
              </div>
              {[...existingCotacaoValues, ...cotacaoValues].some(v => v && unmaskCurrency(v) > 0) && (
                <p className="text-[10px] text-muted-foreground mt-1">Calculado automaticamente pela soma dos valores das cotações.</p>
              )}
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

            {/* Modalidade de co-participação */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Modalidade de co-participação</label>
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
                <label className="text-xs font-semibold text-muted-foreground">Cotações (PDF) — máx. 3 <span className="text-muted-foreground/50">(com valor individual)</span></label>
                {existingCotacaoPaths.map((p, i) => (
                  <div key={`existing-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 bg-card text-xs">
                    <FileText className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-success flex-1 truncate">Cotação {i + 1} ✓</span>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-primary/50 font-medium">R$</span>
                      <Input
                        value={existingCotacaoValues[i] || ''}
                        onChange={e => {
                          const arr = [...existingCotacaoValues];
                          while (arr.length <= i) arr.push('');
                          arr[i] = maskCurrency(e.target.value);
                          setExistingCotacaoValues(arr);
                        }}
                        placeholder="0,00"
                        className="h-7 pl-7 text-xs"
                      />
                    </div>
                    <button type="button" onClick={() => {
                      setExistingCotacaoPaths(prev => prev.filter((_, j) => j !== i));
                      setExistingCotacaoValues(prev => prev.filter((_, j) => j !== i));
                    }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                {cotacaoPdfs.map((f, i) => (
                  <div key={`new-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 bg-card text-xs">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-primary flex-1 truncate">{f.name}</span>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-primary/50 font-medium">R$</span>
                      <Input
                        value={cotacaoValues[i] || ''}
                        onChange={e => {
                          const arr = [...cotacaoValues];
                          while (arr.length <= i) arr.push('');
                          arr[i] = maskCurrency(e.target.value);
                          setCotacaoValues(arr);
                        }}
                        placeholder="0,00"
                        className="h-7 pl-7 text-xs"
                      />
                    </div>
                    <button type="button" onClick={() => {
                      setCotacaoPdfs(prev => prev.filter((_, j) => j !== i));
                      setCotacaoValues(prev => prev.filter((_, j) => j !== i));
                    }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                {(existingCotacaoPaths.length + cotacaoPdfs.length) < 3 && (
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) { setCotacaoPdfs(prev => [...prev, f]); setCotacaoValues(prev => [...prev, '']); } e.target.value = ''; }} />
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

      {/* Retrocesso Dialog */}
      <Dialog open={!!retrocessoLead} onOpenChange={v => { if (!v) setRetrocessoLead(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-primary" /> Justificativa de Retrocesso
            </DialogTitle>
            <DialogDescription>
              Você está movendo o lead para uma fase anterior do funil. Justifique esta ação para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/40 rounded-lg border border-border/20 text-xs">
              <p><strong>Origem:</strong> {stages.find(s => s.id === retrocessoLead?.lead.stage_id)?.nome}</p>
              <p><strong>Destino:</strong> {stages.find(s => s.id === retrocessoLead?.targetStageId)?.nome}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo do Retrocesso *</Label>
              <Textarea 
                value={retrocessoJustificativa} 
                onChange={e => setRetrocessoJustificativa(e.target.value)} 
                placeholder="Ex: Cliente solicitou nova cotação com dados diferentes..." 
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetrocessoLead(null)}>Cancelar</Button>
            <Button 
              onClick={handleRetrocesso} 
              disabled={savingRetrocesso || !retrocessoJustificativa.trim()}
              className="gap-1.5"
            >
              {savingRetrocesso ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Retrocesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
