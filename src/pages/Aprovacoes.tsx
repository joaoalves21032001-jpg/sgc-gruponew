import { useState, useEffect, useMemo } from 'react';
import { useMyPermissions, hasPermission } from '@/hooks/useSecurityProfiles';
import { useMyCargoPermissions, hasCargoPermission } from '@/hooks/useCargos';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLogAction } from '@/hooks/useAuditLog';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useTeamVendas, useUpdateVendaStatus, type Venda } from '@/hooks/useVendas';
import { useTeamAtividades, type Atividade } from '@/hooks/useAtividades';
import { useVendaDocumentos, getDocumentUrl } from '@/hooks/useVendaDocs';
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
  Shield, Search, CheckCircle2, Clock, Undo2, Pencil,
  ClipboardList, ShoppingCart, Users, UserPlus, Eye, XCircle, Trash2,
  Download, FileText, MessageSquareQuote, GitCompareArrows, KeyRound,
  CheckSquare, Square
} from 'lucide-react';
import { useCompanhias, useProdutos, useModalidades } from '@/hooks/useInventario';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { maskPhone } from '@/lib/masks';
import { dispatchNotification } from '@/hooks/useNotificationRules';
import { useMfaResetRequests, approveMfaReset, rejectMfaReset, type MfaResetRequest } from '@/hooks/useMfaResetRequests';
import { usePasswordResetRequests, resolvePasswordResetRequest, type PasswordResetRequest } from '@/hooks/usePasswordResetRequests';

/* ─── Cotacao type ─── */
interface Cotacao {
  id: string; nome: string; contato: string; email: string | null;
  companhia_nome: string | null; produto_nome: string | null;
  modalidade: string | null; quantidade_vidas: number; com_dental: boolean;
  co_participacao: string | null; consultor_recomendado_id: string | null;
  status: string; motivo_recusa: string | null; lead_id: string | null;
  created_at: string; updated_at: string;
}

function useCotacoes() {
  return useQuery({
    queryKey: ['cotacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cotacao[];
    },
  });
}

/* ─── Types ─── */
interface AccessRequest {
  id: string; nome: string; email: string; telefone: string | null;
  mensagem: string | null; cpf: string | null; rg: string | null;
  endereco: string | null; cargo: string | null; nivel_acesso: string | null;
  numero_emergencia_1: string | null; numero_emergencia_2: string | null;
  motivo_recusa: string | null; status: string; created_at: string;
  encrypted_password?: string;
  supervisor_id: string | null; gerente_id: string | null;
  data_admissao: string | null; data_nascimento: string | null;
}

const statusColors: Record<string, string> = {
  analise: 'bg-primary/10 text-primary border-primary/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  aprovado: 'bg-success/10 text-success border-success/20',
  resolvido: 'bg-success/10 text-success border-success/20',
  recusado: 'bg-destructive/10 text-destructive border-destructive/20',
  devolvido: 'bg-primary/10 text-primary border-primary/20',
  rejeitado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabel: Record<string, string> = {
  analise: 'Em Análise', pendente: 'Pendente', aprovado: 'Aprovado',
  resolvido: 'Aprovado', recusado: 'Recusado', devolvido: 'Devolvido',
  rejeitado: 'Rejeitado', solicitado: 'Solicitado',
};

/* ─── Hooks ─── */
function useCargosList() {
  return useQuery({
    queryKey: ['cargos-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cargos').select('id, nome, requires_leader');
      if (error) throw error;
      return (data as unknown || []) as { id: string, nome: string, requires_leader: boolean }[];
    }
  });
}

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

/* ─── Correction Requests Hook ─── */
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

function useCorrectionRequests() {
  return useQuery({
    queryKey: ['correction-requests'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('correction_requests').select('*').order('created_at', { ascending: false });
        if (error) { console.error('correction_requests query error:', error); return []; }
        return (data ?? []) as CorrectionRequest[];
      } catch (e) {
        console.error('correction_requests fetch failed:', e);
        return [] as CorrectionRequest[];
      }
    },
    retry: false,
    throwOnError: false,
  });
}

/* ─── Venda Detail Dialog with docs ─── */
function VendaDetailDialog({ venda, onClose, getConsultorName, justificativa, setJustificativa, onAction, onReject, canEdit, canDelete, onDelete }: {
  venda: Venda | null; onClose: () => void; getConsultorName: (id: string) => string;
  justificativa: string; setJustificativa: (v: string) => void;
  onAction: (v: Venda, action: 'aprovado' | 'devolvido') => void;
  onReject: (v: Venda) => void;
  canEdit: boolean; canDelete: boolean;
  onDelete: (venda: Venda) => void;
}) {
  const { data: docs = [] } = useVendaDocumentos(venda?.id || null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const handleDownload = async (filePath: string) => {
    setDownloadingDoc(filePath);
    try { const url = await getDocumentUrl(filePath); if (url) window.open(url, '_blank'); else toast.error('Link indisponível.'); }
    catch { toast.error('Erro ao baixar.'); } finally { setDownloadingDoc(null); }
  };

  // Parse extended data
  let ext: any = {};
  try { if ((venda as any)?.dados_completos) ext = JSON.parse((venda as any).dados_completos); } catch { /* */ }

  return (
    <Dialog open={!!venda} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-lg">Detalhes Completos da Venda</DialogTitle></DialogHeader>
        {venda && (<div className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Titular</span><p className="font-semibold mt-0.5">{venda.nome_titular}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Modalidade</span><p className="font-semibold mt-0.5">{venda.modalidade}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Consultor</span><p className="font-semibold mt-0.5">{getConsultorName(venda.user_id)}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Vidas</span><p className="font-semibold mt-0.5">{venda.vidas}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Valor</span><p className="font-semibold mt-0.5">{venda.valor ? `R$ ${venda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Status</span><p className="font-semibold mt-0.5">{venda.status}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Data de Lançamento</span><p className="font-semibold mt-0.5">{(venda as any).data_lancamento ? new Date((venda as any).data_lancamento + 'T12:00:00').toLocaleDateString('pt-BR') : new Date(venda.created_at).toLocaleDateString('pt-BR')}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Criado em</span><p className="font-semibold mt-0.5">{new Date(venda.created_at).toLocaleDateString('pt-BR')}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">ID</span><p className="font-semibold mt-0.5 font-mono text-xs">{venda.id.slice(0, 12)}...</p></div>
            {(venda as any).justificativa_retroativo && <div className="col-span-full"><span className="text-[10px] text-muted-foreground uppercase font-semibold">Justificativa Retroativo</span><p className="font-semibold mt-0.5 text-warning">{(venda as any).justificativa_retroativo}</p></div>}
          </div>

          {/* Extended data from dados_completos */}
          {Object.keys(ext).length > 0 && (
            <div className="border border-border/30 rounded-lg p-4 space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Dados Completos do Formulário</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {ext.companhia_nome && <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Companhia</span><p className="font-semibold mt-0.5">{ext.companhia_nome}</p></div>}
                {ext.data_vigencia && <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Data de Vigência</span><p className="font-semibold mt-0.5">{new Date(ext.data_vigencia + 'T12:00:00').toLocaleDateString('pt-BR')}</p></div>}
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Venda c/ Dental</span><p className="font-semibold mt-0.5">{ext.venda_dental ? 'Sim' : 'Não'}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Co-Participação</span><p className="font-semibold mt-0.5">{ext.co_participacao === 'sem' ? 'Sem Co-Participação' : ext.co_participacao === 'parcial' ? 'Co-Participação Parcial' : ext.co_participacao === 'total' ? 'Co-Participação Total' : ext.co_participacao || 'Sem'}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Estagiários</span><p className="font-semibold mt-0.5">{ext.estagiarios ? `Sim (${ext.qtd_estagiarios || 0})` : 'Não'}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Aproveitamento</span><p className="font-semibold mt-0.5">{ext.possui_aproveitamento ? 'Sim' : 'Não'}</p></div>
                {ext.lead_nome && <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Lead/Responsável</span><p className="font-semibold mt-0.5">{ext.lead_nome}</p></div>}
              </div>

              {/* Titulares */}
              {ext.titulares && ext.titulares.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Titulares ({ext.titulares.length})</p>
                  <div className="space-y-1.5">
                    {ext.titulares.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg text-sm">
                        <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="font-semibold flex-1">{t.nome || '—'}</span>
                        {t.idade && <span className="text-muted-foreground text-xs">{t.idade} anos</span>}
                        {t.produto_nome && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{t.produto_nome}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependentes */}
              {ext.dependentes && ext.dependentes.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Dependentes ({ext.dependentes.length})</p>
                  <div className="space-y-1.5">
                    {ext.dependentes.map((d: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg text-sm">
                        <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="font-semibold flex-1">{d.nome || '—'}</span>
                        {d.idade && <span className="text-muted-foreground text-xs">{d.idade} anos</span>}
                        {d.produto_nome && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{d.produto_nome}</span>}
                        {d.descricao && <span className="text-xs text-muted-foreground">{d.descricao}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {venda.observacoes && <div className="p-3 bg-muted/30 rounded-lg"><p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Observações</p><p className="text-sm whitespace-pre-wrap">{venda.observacoes}</p></div>}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Documentos ({docs.length})</p>
            {docs.length === 0 ? <p className="text-xs text-muted-foreground italic">Nenhum documento.</p> : (
              <div className="space-y-2">{docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-muted/10">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{doc.nome}</p><p className="text-[10px] text-muted-foreground">{doc.tipo}{doc.file_size ? ` • ${(doc.file_size / 1024).toFixed(0)} KB` : ''}</p></div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => handleDownload(doc.file_path)} disabled={downloadingDoc === doc.file_path}><Download className="w-3.5 h-3.5" /> Baixar</Button>
                </div>
              ))}</div>
            )}
          </div>
          <div className="space-y-3 pt-2 border-t border-border/20">
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Justificativa (Devolução/Rejeição) <span className="text-destructive">*</span></label>
              <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Obrigatório para devolver ou rejeitar..." rows={3} className="border-border/40" /></div>
            <div className="flex gap-2 flex-wrap">
              {canEdit && (
                <>
                  <Button onClick={() => onAction(venda, 'aprovado')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg"><CheckCircle2 className="w-5 h-5" /> Aprovar</Button>
                  <Button onClick={() => onAction(venda, 'devolvido')} variant="outline" className="flex-1 font-semibold gap-1.5 border-primary text-primary hover:bg-primary/10" size="lg"><Undo2 className="w-5 h-5" /> Devolver</Button>
                  <Button onClick={() => onReject(venda)} variant="outline" className="flex-1 font-semibold gap-1.5 border-orange-500 text-orange-500 hover:bg-orange-500/10" size="lg"><XCircle className="w-5 h-5" /> Rejeitar</Button>
                  <Button onClick={() => toast.info('Use o botão Editar no card para editar.')} variant="outline" className="flex-1 font-semibold gap-1.5 border-muted-foreground text-foreground hover:bg-muted" size="lg"><Pencil className="w-5 h-5" /> Editar</Button>
                </>
              )}
              {canDelete && (
                <Button variant="destructive" className="flex-1 font-semibold gap-1.5" size="lg" onClick={() => onDelete(venda)}><Trash2 className="w-5 h-5" /> Excluir</Button>
              )}
            </div>
          </div>
        </div>)}
      </DialogContent>
    </Dialog>
  );
}

const Aprovacoes = () => {
  const { data: role } = useUserRole();
  const { data: profiles = [] } = useTeamProfiles();
  const { user } = useAuth(); // Import user for hierarchy matching

  // Helper flags
  const isSuperAdmin = role === 'administrador'; // Or check a specific admin flag

  const { data: vendas = [], isLoading: loadingVendas } = useTeamVendas();
  const { data: atividades = [], isLoading: loadingAtiv } = useTeamAtividades();
  const { data: accessRequests = [], isLoading: loadingAccess } = useAccessRequests();
  const { data: cotacoes = [], isLoading: loadingCotacoes } = useCotacoes();
  const updateStatus = useUpdateVendaStatus();
  const queryClient = useQueryClient();
  const logAction = useLogAction();
  const { data: myPermissions } = useMyPermissions();
  const { data: myCargoPerms } = useMyCargoPermissions();
  const { data: cargos = [] } = useCargosList();

  const supervisores = useMemo(() => profiles.filter(p => p.cargo === 'Supervisor'), [profiles]);
  const gerentes = useMemo(() => profiles.filter(p => ['Gerente', 'Diretor'].includes(p.cargo || '')), [profiles]);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterConsultor, setFilterConsultor] = useState('todos');
  const [filterDate, setFilterDate] = useState('');

  // Venda dialog
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [obs, setObs] = useState('');
  const [justificativa, setJustificativa] = useState('');

  // Bulk Actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const toggleItemSelection = (id: string, tab: string) => {
    if (bulkActionTab !== tab) {
      setBulkActionTab(tab as any);
      setSelectedItems(new Set([id]));
      return;
    }
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleSelectAll = (ids: string[], tab: string) => {
    setBulkActionTab(tab as any);
    if (selectedItems.size === ids.length && ids.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(ids));
    }
  };

  // Bulk Modals
  const [bulkActionType, setBulkActionType] = useState<null | 'aprovar' | 'devolver' | 'rejeitar' | 'excluir'>(null);
  const [bulkActionTab, setBulkActionTab] = useState<null | 'atividades' | 'vendas' | 'cotacoes' | 'acesso' | 'alteracoes' | 'mfa' | 'senhas'>(null);
  const [bulkMotivo, setBulkMotivo] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Atividade dialog
  const [selectedAtiv, setSelectedAtiv] = useState<Atividade | null>(null);
  const [ativJustificativa, setAtivJustificativa] = useState('');
  const [savingAtiv, setSavingAtiv] = useState(false);
  
  // Edit Atividade
  const [editAtiv, setEditAtiv] = useState<Atividade | null>(null);
  const [editForm, setEditForm] = useState({ ligacoes: '', mensagens: '', cotacoes_enviadas: '', cotacoes_fechadas: '', cotacoes_nao_respondidas: '', follow_up: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Devolver/Delete dialogs (no window.prompt)
  const [devolverAtiv, setDevolverAtiv] = useState<Atividade | null>(null);
  const [devolverAtivMotivo, setDevolverAtivMotivo] = useState('');
  const [isRejectingAtiv, setIsRejectingAtiv] = useState(false);
  const [devolverVenda, setDevolverVenda] = useState<Venda | null>(null);
  const [devolverVendaMotivo, setDevolverVendaMotivo] = useState('');
  const [isRejectingVenda, setIsRejectingVenda] = useState(false);
  const [confirmDeleteAtiv, setConfirmDeleteAtiv] = useState<Atividade | null>(null);
  const [confirmDeleteVenda, setConfirmDeleteVenda] = useState<Venda | null>(null);
  const [deletingAtiv, setDeletingAtiv] = useState(false);
  const [deletingVenda, setDeletingVenda] = useState(false);

  // Access dialog
  const [viewAccess, setViewAccess] = useState<AccessRequest | null>(null);
  const [rejectAccess, setRejectAccess] = useState<AccessRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);
  const [deleteAccess, setDeleteAccess] = useState<AccessRequest | null>(null);

  // Cotação dialog
  const [viewCotacao, setViewCotacao] = useState<Cotacao | null>(null);
  const [rejectCotacao, setRejectCotacao] = useState<Cotacao | null>(null);
  const [rejectCotacaoReason, setRejectCotacaoReason] = useState('');
  const [savingCotacao, setSavingCotacao] = useState(false);
  const [editCotacao, setEditCotacao] = useState<Cotacao | null>(null);
  const [deleteCotacao, setDeleteCotacao] = useState<Cotacao | null>(null);
  const [cotacaoForm, setCotacaoForm] = useState({ nome: '', contato: '', email: '', modalidade: '', companhia_nome: '', produto_nome: '', quantidade_vidas: '', com_dental: false, co_participacao: 'sem' });

  // Edit access
  const [editAccessReq, setEditAccessReq] = useState<AccessRequest | null>(null);
  const [editAccessForm, setEditAccessForm] = useState<Record<string, any>>({});

  // Inventário data for cotação edit
  const { data: companhiasList = [] } = useCompanhias();
  const { data: produtosList = [] } = useProdutos();
  const { data: modalidadesList = [] } = useModalidades();

  // Correction Requests
  const { data: correctionRequests = [], isLoading: loadingCR } = useCorrectionRequests();
  const [selectedCR, setSelectedCR] = useState<CorrectionRequest | null>(null);
  const [rejectCR, setRejectCR] = useState<CorrectionRequest | null>(null);
  const [rejectCRReason, setRejectCRReason] = useState('');
  const [savingCR, setSavingCR] = useState(false);

  // MFA Reset Requests — fully defensive
  const mfaQuery = useMfaResetRequests();
  const mfaResetReqs = mfaQuery?.data ?? [];
  const loadingMfaReset = mfaQuery?.isLoading ?? false;
  const [rejectMfaReq, setRejectMfaReq] = useState<MfaResetRequest | null>(null);
  const [rejectMfaReason, setRejectMfaReason] = useState('');
  const [savingMfaReset, setSavingMfaReset] = useState(false);
  const [viewMfaReq, setViewMfaReq] = useState<MfaResetRequest | null>(null);

  // Password Reset Requests
  const pwdQuery = usePasswordResetRequests();
  const pwdResetReqs = pwdQuery?.data ?? [];
  const loadingPwdReset = pwdQuery?.isLoading ?? false;
  const [rejectPwdReq, setRejectPwdReq] = useState<PasswordResetRequest | null>(null);
  const [rejectPwdReason, setRejectPwdReason] = useState('');
  const [savingPwdReset, setSavingPwdReset] = useState(false);
  const [viewPwdReq, setViewPwdReq] = useState<PasswordResetRequest | null>(null);

  // Check base permission (has ANY permission in aprovacoes.*)
  const canViewAnyAprovacao =
    hasPermission(myPermissions, 'aprovacoes.atividades', 'analyze') ||
    hasPermission(myPermissions, 'aprovacoes.vendas', 'analyze') ||
    hasPermission(myPermissions, 'aprovacoes.cotacoes', 'analyze') ||
    hasPermission(myPermissions, 'aprovacoes.alteracoes', 'analyze') ||
    hasPermission(myPermissions, 'aprovacoes.mfa', 'approve') ||
    hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'aprovar') ||
    isSuperAdmin;

  if (!canViewAnyAprovacao) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta página. Verifique seu perfil de segurança.</p>
        </div>
      </div>
    );
  }

  // Hierarchy Validation Helper
  const isDirectSuperior = (requesterId: string) => {
    if (isSuperAdmin) return true; // Admins see everything
    if (!user) return false;
    if (requesterId === user.id) return false; // Cannot approve own requests

    const p = profiles.find(x => x.id === requesterId);
    if (!p) {
      return false;
    }
    // Is current user the direct supervisor OR direct manager of the requester?
    return p.supervisor_id === user.id || p.gerente_id === user.id;
  };

  const getConsultorName = (userId: string) => {
    const p = profiles.find(c => c.id === userId);
    return p?.apelido || p?.nome_completo?.split(' ')[0] || '—';
  };

  /* ─── Filters ─── */
  // Build set of registro_ids that have pending correction requests (3.5 — duplicate control)
  const pendingCRRegistroIds = new Set(
    correctionRequests.filter(cr => cr.status === 'pendente').map(cr => cr.registro_id)
  );

  const filteredVendas = vendas.filter(v => {
    if (!isDirectSuperior(v.user_id)) return false; // Hierarchy Check
    if (pendingCRRegistroIds.has(v.id)) return false; // exclude records with pending CR
    const matchesSearch = !search || v.nome_titular.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || v.status === filterStatus;
    const matchesConsultor = filterConsultor === 'todos' || v.user_id === filterConsultor;
    const matchesDate = !filterDate || v.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesConsultor && matchesDate;
  });

  const filteredAtividades = atividades.filter(a => {
    if (!isDirectSuperior(a.user_id)) return false; // Hierarchy Check
    if (pendingCRRegistroIds.has(a.id)) return false; // exclude records with pending CR
    const name = getConsultorName(a.user_id);
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || a.data.includes(search);
    const ativStatus = (a as any).status || 'pendente';
    const matchesStatus = filterStatus === 'todos' || ativStatus === filterStatus;
    const matchesConsultor = filterConsultor === 'todos' || a.user_id === filterConsultor;
    const matchesDate = !filterDate || a.data === filterDate;
    return matchesSearch && matchesStatus && matchesConsultor && matchesDate;
  });

  const filteredAccess = accessRequests.filter(r => {
    if (!isSuperAdmin) {
      // For access requests, they might not have a profile, but they map their intended supervisor/gerente in the request
      if (r.supervisor_id !== user?.id && r.gerente_id !== user?.id) return false;
    }
    const matchesSearch = !search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchesDate = !filterDate || r.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredCotacoes = cotacoes.filter(c => {
    // Exception: Cotações depend purely on matrix permission ('aprovacoes.cotacoes'), no hierarchy required!
    const matchesSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || (c.contato && c.contato.includes(search));
    const matchesStatus = filterStatus === 'todos' || c.status === filterStatus;
    const matchesDate = !filterDate || c.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pendingVendas = vendas.filter(v => v.status === 'analise' || v.status === 'pendente').length;
  const pendingAtiv = atividades.filter(a => (a as any).status === 'pendente' || !(a as any).status).length;
  const pendingAccess = accessRequests.filter(r => r.status === 'pendente').length;
  const pendingCotacoes = cotacoes.filter(c => c.status === 'pendente').length;
  const totalPending = pendingVendas + pendingAtiv + pendingAccess + pendingCotacoes;

  /* ─── Cotação Actions ─── */
  const handleApproveCotacao = async (cotacao: Cotacao) => {
    setSavingCotacao(true);
    try {
      // Determine tipo based on modalidade - must match leads_tipo_check constraint
      const tipo = cotacao.modalidade || 'PF';

      // Get first stage
      const { data: firstStage } = await supabase
        .from('lead_stages')
        .select('id')
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Build extended data JSON so lead preserves cotação info
      const extendedData = JSON.stringify({
        companhia_nome: cotacao.companhia_nome || null,
        produto: cotacao.produto_nome || null,
        quantidade_vidas: cotacao.quantidade_vidas || null,
        vendaDental: cotacao.com_dental || false,
        coParticipacao: cotacao.co_participacao || 'sem',
        plano_anterior: false,
        origemLandingPage: true,
      });

      // Create lead
      const { data: newLead, error: leadError } = await supabase.from('leads').insert({
        nome: cotacao.nome,
        contato: cotacao.contato,
        email: cotacao.email || null,
        tipo,
        origem: extendedData,
        livre: !cotacao.consultor_recomendado_id,
        stage_id: firstStage?.id || null,
        created_by: cotacao.consultor_recomendado_id || null,
      } as any).select('id').single();

      if (leadError) throw leadError;

      // Update cotacao status
      await supabase.from('cotacoes').update({
        status: 'aprovado',
        lead_id: newLead.id,
      } as any).eq('id', cotacao.id);

      logAction('aprovar_cotacao', 'cotacao', cotacao.id, { nome: cotacao.nome, lead_id: newLead.id });
      toast.success(`Cotação aprovada! Lead "${cotacao.nome}" criado${cotacao.consultor_recomendado_id ? ' e vinculado ao consultor recomendado' : ' como lead livre'}.`);
      // Notify the recommended consultant, or all leaders if no consultant assigned
      if (cotacao.consultor_recomendado_id) {
        dispatchNotification('cotacao_aprovada', cotacao.consultor_recomendado_id, 'Novo Lead Atribuído', `A cotação de "${cotacao.nome}" foi aprovada e um lead foi criado para você.`, 'cotacao', '/crm');
      } else {
        dispatchNotification('cotacao_aprovada', '', 'Cotação Aprovada — Lead Livre', `A cotação de "${cotacao.nome}" foi aprovada como lead livre.`, 'cotacao', '/crm');
      }
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setViewCotacao(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar cotação.');
    } finally {
      setSavingCotacao(false);
    }
  };

  const handleRejectCotacao = async () => {
    if (!rejectCotacao) return;
    if (!rejectCotacaoReason.trim()) { toast.error('Informe o motivo da recusa.'); return; }
    setSavingCotacao(true);
    try {
      await supabase.from('cotacoes').update({
        status: 'rejeitado',
        motivo_recusa: rejectCotacaoReason.trim(),
      } as any).eq('id', rejectCotacao.id);
      logAction('rejeitar_cotacao', 'cotacao', rejectCotacao.id, { nome: rejectCotacao.nome });
      toast.success('Cotação recusada.');
      // Notify recommended consultant if exists
      if (rejectCotacao.consultor_recomendado_id) {
        dispatchNotification('cotacao_reprovada', rejectCotacao.consultor_recomendado_id, 'Cotação Recusada', `A cotação de "${rejectCotacao.nome}" foi recusada: ${rejectCotacaoReason.trim()}`, 'cotacao', '/aprovacoes');
      }
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      setRejectCotacao(null); setRejectCotacaoReason('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao recusar.');
    } finally {
      setSavingCotacao(false);
    }
  };

  const handleDeleteCotacao = async () => {
    if (!deleteCotacao) return;
    setSavingCotacao(true);
    try {
      const { error } = await supabase.from('cotacoes').delete().eq('id', deleteCotacao.id);
      if (error) throw error;
      logAction('excluir_cotacao', 'cotacao', deleteCotacao.id, { nome: deleteCotacao.nome });
      toast.success('Cotação excluída!');
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      setDeleteCotacao(null);
    } catch (err: any) { toast.error(err.message || 'Erro ao excluir.'); }
    finally { setSavingCotacao(false); }
  };

  const openEditCotacao = (c: Cotacao) => {
    setCotacaoForm({
      nome: c.nome, contato: c.contato, email: c.email || '',
      modalidade: c.modalidade || '', companhia_nome: c.companhia_nome || '',
      produto_nome: c.produto_nome || '', quantidade_vidas: String(c.quantidade_vidas || ''),
      com_dental: c.com_dental, co_participacao: c.co_participacao || 'sem',
    });
    setEditCotacao(c);
  };

  const handleSaveCotacao = async () => {
    if (!editCotacao) return;
    if (!cotacaoForm.nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSavingCotacao(true);
    try {
      const { error } = await supabase.from('cotacoes').update({
        nome: cotacaoForm.nome.trim(),
        contato: cotacaoForm.contato,
        email: cotacaoForm.email || null,
        modalidade: cotacaoForm.modalidade || null,
        companhia_nome: cotacaoForm.companhia_nome || null,
        produto_nome: cotacaoForm.produto_nome || null,
        quantidade_vidas: parseInt(cotacaoForm.quantidade_vidas) || 1,
        com_dental: cotacaoForm.com_dental,
        co_participacao: cotacaoForm.co_participacao || null,
      } as any).eq('id', editCotacao.id);
      if (error) throw error;
      logAction('editar_cotacao', 'cotacao', editCotacao.id, { nome: cotacaoForm.nome });
      toast.success('Cotação atualizada!');
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      setEditCotacao(null);
    } catch (err: any) { toast.error(err.message || 'Erro ao salvar.'); }
    finally { setSavingCotacao(false); }
  };

  const openEditAccess = (req: AccessRequest) => {
    setEditAccessForm({
      nome: req.nome, email: req.email, telefone: req.telefone || '',
      cpf: req.cpf || '', rg: req.rg || '', endereco: req.endereco || '',
      cargo: req.cargo || 'Consultor de Vendas', nivel_acesso: req.nivel_acesso || 'consultor',
      supervisor_id: req.supervisor_id || '', gerente_id: req.gerente_id || '',
      data_admissao: req.data_admissao || '', data_nascimento: req.data_nascimento || '',
      numero_emergencia_1: maskPhone(req.numero_emergencia_1 || ''),
      numero_emergencia_2: maskPhone(req.numero_emergencia_2 || ''),
      mensagem: req.mensagem || '',
    });
    setEditAccessReq(req);
  };

  const handleSaveAccessReq = async () => {
    if (!editAccessReq) return;
    if (!editAccessForm.nome?.trim() || !editAccessForm.email?.trim()) { toast.error('Nome e email são obrigatórios.'); return; }
    setSavingAccess(true);
    try {
      const { error } = await supabase.from('access_requests').update({
        nome: editAccessForm.nome.trim(),
        email: editAccessForm.email.trim(),
        telefone: editAccessForm.telefone || null,
        cpf: editAccessForm.cpf || null,
        rg: editAccessForm.rg || null,
        endereco: editAccessForm.endereco || null,
        cargo: editAccessForm.cargo || null,
        nivel_acesso: editAccessForm.nivel_acesso || null,
        supervisor_id: editAccessForm.supervisor_id || null,
        gerente_id: editAccessForm.gerente_id || null,
        data_admissao: editAccessForm.data_admissao || null,
        data_nascimento: editAccessForm.data_nascimento || null,
        numero_emergencia_1: editAccessForm.numero_emergencia_1 || null,
        numero_emergencia_2: editAccessForm.numero_emergencia_2 || null,
        mensagem: editAccessForm.mensagem || null,
      } as any).eq('id', editAccessReq.id);
      if (error) throw error;
      logAction('editar_acesso', 'access_request', editAccessReq.id, { nome: editAccessForm.nome });
      toast.success('Solicitação de acesso atualizada!');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setEditAccessReq(null);
    } catch (err: any) { toast.error(err.message || 'Erro ao salvar.'); }
    finally { setSavingAccess(false); }
  };

  /* ─── Venda Actions ─── */
  const handleVendaAction = async (venda: Venda, action: 'aprovado' | 'devolvido') => {
    if (action === 'devolvido' && !justificativa.trim()) {
      toast.error('Informe a justificativa para a devolução.');
      return;
    }
    try {
      const isDevolvido = action === 'devolvido';
      await updateStatus.mutateAsync({ id: venda.id, status: action, observacoes: obs, motivo_recusa: isDevolvido ? justificativa.trim() : null });
      toast.success(`Venda ${action === 'aprovado' ? 'aprovada' : 'devolvida'} com sucesso!`);
      logAction(action === 'aprovado' ? 'aprovar_venda' : 'devolver_venda', 'venda', venda.id, { nome_titular: venda.nome_titular });
      // Notify the consultant
      if (action === 'devolvido') {
        dispatchNotification('venda_devolvida', venda.user_id, 'Venda Devolvida', `Sua venda de "${venda.nome_titular}" foi devolvida: ${justificativa.trim()}`, 'venda', '/minhas-acoes');
      } else {
        dispatchNotification('venda_aprovada', venda.user_id, 'Venda Aprovada', `Sua venda de "${venda.nome_titular}" foi aprovada!`, 'venda', '/minhas-acoes');
      }
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
      const isDevolvido = action === 'devolvido';
      const { error } = await supabase.from('atividades')
        .update({ status: action, motivo_recusa: isDevolvido ? ativJustificativa.trim() : null } as any)
        .eq('id', ativ.id);
      if (error) throw error;
      toast.success(`Atividade ${action === 'aprovado' ? 'aprovada' : 'devolvida'} com sucesso!`);
      logAction(action === 'aprovado' ? 'aprovar_atividade' : 'devolver_atividade', 'atividade', ativ.id, { user_id: ativ.user_id, data: ativ.data });
      // Notify the consultant
      if (action === 'devolvido') {
        dispatchNotification('atividade_devolvida', ativ.user_id, 'Atividade Devolvida', `Sua atividade de ${ativ.data} foi devolvida: ${ativJustificativa.trim()}`, 'atividade', '/minhas-acoes');
      } else {
        dispatchNotification('atividade_aprovada', ativ.user_id, 'Atividade Aprovada', `Sua atividade de ${ativ.data} foi aprovada!`, 'atividade', '/minhas-acoes');
      }
      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      setSelectedAtiv(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setSavingAtiv(false);
    }
  };

  const handleSaveEditAtiv = async () => {
    if (!editAtiv) return;
    setEditSaving(true);
    try {
      const { error } = await supabase.from('atividades').update({
        ligacoes: parseInt(editForm.ligacoes) || 0,
        mensagens: parseInt(editForm.mensagens) || 0,
        cotacoes_enviadas: parseInt(editForm.cotacoes_enviadas) || 0,
        cotacoes_fechadas: parseInt(editForm.cotacoes_fechadas) || 0,
        cotacoes_nao_respondidas: parseInt(editForm.cotacoes_nao_respondidas) || 0,
        follow_up: parseInt(editForm.follow_up) || 0,
      } as any).eq('id', editAtiv.id);
      
      if (error) throw error;
      
      logAction('editar_atividade', 'atividade', editAtiv.id, { data: editAtiv.data });
      toast.success('Atividade atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      setEditAtiv(null);
      setSelectedAtiv(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setEditSaving(false);
    }
  };

  /* ─── Access Actions ─── */
  const handleApproveAccess = async (req: AccessRequest) => {
    setSavingAccess(true);
    try {
      const { data: createResult, error: createError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: req.email,
          nome_completo: req.nome,
          celular: req.telefone,
          cpf: req.cpf,
          rg: req.rg,
          endereco: req.endereco,
          cargo: req.cargo,
          role: req.nivel_acesso,
          supervisor_id: req.supervisor_id,
          gerente_id: req.gerente_id,
          numero_emergencia_1: req.numero_emergencia_1,
          numero_emergencia_2: req.numero_emergencia_2,
          data_admissao: req.data_admissao,
          data_nascimento: req.data_nascimento,
          encrypted_password: req.encrypted_password,
        }
      });

      if (createError) throw new Error(createError.message);
      if (createResult?.error) throw new Error(createResult.error);

      const userId = createResult.user_id;
      const nextCode = createResult.codigo;

      // Mark access request as approved
      const { error } = await supabase.from('access_requests').update({ status: 'aprovado' } as any).eq('id', req.id);
      if (error) throw error;

      toast.success(`Acesso aprovado e usuário criado para ${req.nome}! (Código: ${nextCode})`);
      await logAction('aprovar_acesso', 'access_request', req.id, { nome: req.nome, email: req.email, codigo: nextCode });
      
      // Notify the new user
      if (userId) {
        await dispatchNotification('acesso_aprovado', userId, 'Acesso Aprovado', `Bem-vindo(a) ${req.nome}! Seu acesso ao sistema foi aprovado. Seu código é ${nextCode}.`, 'acesso');
      }
      
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar acesso.');
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
      logAction('rejeitar_acesso', 'access_request', rejectAccess.id, { nome: rejectAccess.nome, email: rejectAccess.email });
      // Notify leadership about
      dispatchNotification('acesso_rejeitado', '', 'Solicitação de Acesso Recusada', `A solicitação de acesso de "${rejectAccess.nome}" (${rejectAccess.email}) foi recusada.`, 'acesso', '/aprovacoes');
      toast.success('Solicitação recusada.');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setRejectAccess(null); setRejectReason('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao recusar.');
    } finally {
      setSavingAccess(false);
    }
  };

  // ─── Correction Request Actions ───
  const handleViewAlteracao = async (cr: CorrectionRequest) => {
    try {
      const table = cr.tipo === 'atividade' ? 'atividades' : 'vendas';
      const { data, error } = await supabase.from(table).select('*').eq('id', cr.registro_id).single();
      if (error || !data) throw new Error('Registro original não encontrado no banco.');
      if (cr.tipo === 'venda') {
        setSelectedVenda(data as Venda);
      } else {
        setSelectedAtiv(data as Atividade);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApproveCR = async (cr: CorrectionRequest) => {
    setSavingCR(true);
    try {
      const payload = JSON.parse(cr.motivo);
      const alteracoes = payload.alteracoesPropostas || [];
      const updateObj: Record<string, any> = {};
      // Valid columns per table to avoid schema errors
      const ativCols = ['ligacoes', 'mensagens', 'cotacoes_enviadas', 'cotacoes_fechadas', 'cotacoes_nao_respondidas', 'follow_up', 'data', 'observacoes'];
      const vendaCols = ['nome_titular', 'modalidade', 'vidas', 'valor', 'observacoes', 'data_lancamento', 'justificativa_retroativo'];
      const validCols = cr.tipo === 'atividade' ? ativCols : vendaCols;
      for (const a of alteracoes) {
        if (!validCols.includes(a.campo)) continue; // skip unknown columns
        let val: any = a.valorNovo;
        if (['ligacoes', 'mensagens', 'cotacoes_enviadas', 'cotacoes_fechadas', 'follow_up', 'vidas'].includes(a.campo)) {
          val = parseInt(val) || 0;
        }
        if (a.campo === 'valor') {
          val = parseFloat(val) || 0;
        }
        updateObj[a.campo] = val;
      }
      const table = cr.tipo === 'atividade' ? 'atividades' : 'vendas';
      // When approving a correction: apply the changes and put the record back into the approval queue
      const resetStatus = cr.tipo === 'atividade' ? 'pendente' : 'analise';
      updateObj.status = resetStatus;
      if (Object.keys(updateObj).length > 0) {
        const { error: updateError } = await supabase.from(table).update(updateObj as any).eq('id', cr.registro_id);
        if (updateError) throw updateError;
      }
      const { error } = await supabase.from('correction_requests').update({ status: 'resolvido' } as any).eq('id', cr.id);
      if (error) throw error;
      toast.success('Alteração aprovada e aplicada! O registro voltou para a fila.');
      // Notify the consultant that their change request was approved
      dispatchNotification('alteracao_aprovada', cr.user_id, 'Alteração Aprovada', `Sua solicitação de alteração de ${cr.tipo} foi aprovada e aplicada.`, cr.tipo, '/minhas-acoes');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      queryClient.invalidateQueries({ queryKey: [cr.tipo === 'atividade' ? 'atividades' : 'vendas'] });
      queryClient.invalidateQueries({ queryKey: [cr.tipo === 'atividade' ? 'team-atividades' : 'team-vendas'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingCR(false); }
  };

  const handleRejectCR = async () => {
    if (!rejectCR || !rejectCRReason.trim()) { toast.error('Informe o motivo da recusa.'); return; }
    setSavingCR(true);
    try {
      const { error } = await supabase.from('correction_requests').update({
        status: 'rejeitado',
        admin_resposta: rejectCRReason.trim(),
      } as any).eq('id', rejectCR.id);
      if (error) throw error;
      toast.success('Solicitação recusada.');
      // Notify the
      dispatchNotification('alteracao_recusada', rejectCR.user_id, 'Alteração Recusada', `Sua solicitação de alteração de ${rejectCR.tipo} foi recusada: ${rejectCRReason.trim()}`, rejectCR.tipo, '/minhas-acoes');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      setRejectCR(null);
      setRejectCRReason('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingCR(false); }
  };

  // Filtered correction requests
  const filteredCR = correctionRequests.filter(cr => {
    if (!isDirectSuperior(cr.user_id)) return false; // Hierarchy check
    if (filterStatus !== 'todos' && cr.status !== filterStatus) return false;
    if (filterConsultor !== 'todos' && cr.user_id !== filterConsultor) return false;
    if (search) {
      const consultorName = getConsultorName(cr.user_id).toLowerCase();
      if (!consultorName.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // MFA and Passwords needs to be visible to those who have permission to see it
  const filteredMfa = mfaResetReqs;
  const filteredPwd = pwdResetReqs;

  const handleBulkActionExecute = async () => {
    if (!bulkActionType || !bulkActionTab || selectedItems.size === 0) return;
    if ((bulkActionType === 'devolver' || bulkActionType === 'rejeitar') && !bulkMotivo.trim()) {
      toast.error('Informe o motivo para continuar.');
      return;
    }

    setIsProcessingBulk(true);
    const ids = Array.from(selectedItems);
    let successCount = 0;
    let failCount = 0;

    try {
      if (bulkActionTab === 'atividades') {
        const selectedDatas = filteredAtividades.filter(a => ids.includes(a.id));
        for (const ativ of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar' || bulkActionType === 'devolver' || bulkActionType === 'rejeitar') {
              const status = bulkActionType === 'devolver' ? 'devolvido' : bulkActionType === 'rejeitar' ? 'rejeitado' : 'aprovado';
              const { error } = await supabase.from('atividades')
                .update({ status, motivo_recusa: (bulkActionType === 'devolver' || bulkActionType === 'rejeitar') ? bulkMotivo.trim() : null } as any)
                .eq('id', ativ.id);
              if (error) throw error;
              logAction(`bulk_${bulkActionType}_atividade`, 'atividade', ativ.id, { user_id: ativ.user_id });
              
              if (status !== 'aprovado') {
                dispatchNotification(`atividade_${status}`, ativ.user_id, `Atividade ${status === 'rejeitado' ? 'Rejeitada' : 'Devolvida'}`, `Sua atividade foi ${status === 'rejeitado' ? 'rejeitada' : 'devolvida'}: ${bulkMotivo.trim()}`, 'atividade', '/minhas-acoes');
              } else {
                dispatchNotification('atividade_aprovada', ativ.user_id, 'Atividade Aprovada', `Sua atividade foi aprovada!`, 'atividade', '/minhas-acoes');
              }
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('atividades').delete().eq('id', ativ.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
        queryClient.invalidateQueries({ queryKey: ['atividades'] });
      }

      if (bulkActionTab === 'vendas') {
        const selectedDatas = filteredVendas.filter(v => ids.includes(v.id));
        for (const venda of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar' || bulkActionType === 'devolver' || bulkActionType === 'rejeitar') {
              const status = bulkActionType === 'devolver' ? 'devolvido' : bulkActionType === 'rejeitar' ? 'rejeitado' : 'aprovado';
              await updateStatus.mutateAsync({ id: venda.id, status, observacoes: venda.observacoes, motivo_recusa: (bulkActionType === 'devolver' || bulkActionType === 'rejeitar') ? bulkMotivo.trim() : null });
              logAction(`bulk_${bulkActionType}_venda`, 'venda', venda.id, { user_id: venda.user_id });
              
              if (status !== 'aprovado') {
                dispatchNotification(`venda_${status}`, venda.user_id, `Venda ${status === 'rejeitado' ? 'Rejeitada' : 'Devolvida'}`, `Sua venda de "${venda.nome_titular}" foi ${status === 'rejeitado' ? 'rejeitada' : 'devolvida'}: ${bulkMotivo.trim()}`, 'venda', '/minhas-acoes');
              } else {
                dispatchNotification('venda_aprovada', venda.user_id, 'Venda Aprovada', `Sua venda de "${venda.nome_titular}" foi aprovada!`, 'venda', '/minhas-acoes');
              }
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('vendas').delete().eq('id', venda.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['team-vendas'] });
      }

      if (bulkActionTab === 'cotacoes') {
        const selectedDatas = filteredCotacoes.filter(c => ids.includes(c.id));
        
        let firstStageId: string | null = null;
        if (bulkActionType === 'aprovar') {
          const { data: firstStage } = await supabase.from('lead_stages').select('id').order('ordem', { ascending: true }).limit(1).maybeSingle();
          firstStageId = firstStage?.id || null;
        }

        for (const cotacao of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar') {
              const tipo = cotacao.modalidade || 'PF';
              const extendedData = JSON.stringify({
                companhia_nome: cotacao.companhia_nome || null,
                produto: cotacao.produto_nome || null,
                quantidade_vidas: cotacao.quantidade_vidas || null,
                vendaDental: cotacao.com_dental || false,
                coParticipacao: cotacao.co_participacao || 'sem',
                plano_anterior: false,
                origemLandingPage: true,
              });

              const { data: newLead, error: leadError } = await supabase.from('leads').insert({
                nome: cotacao.nome,
                contato: cotacao.contato,
                email: cotacao.email || null,
                tipo,
                origem: extendedData,
                livre: !cotacao.consultor_recomendado_id,
                stage_id: firstStageId,
                created_by: cotacao.consultor_recomendado_id || null,
              } as any).select('id').single();

              if (leadError) throw leadError;

              const { error } = await supabase.from('cotacoes').update({
                status: 'aprovado',
                lead_id: newLead.id,
              } as any).eq('id', cotacao.id);
              if (error) throw error;

              logAction('bulk_aprovar_cotacao', 'cotacao', cotacao.id, { nome: cotacao.nome, lead_id: newLead.id });
              if (cotacao.consultor_recomendado_id) {
                dispatchNotification('cotacao_aprovada', cotacao.consultor_recomendado_id, 'Novo Lead Atribuído', `A cotação de "${cotacao.nome}" foi aprovada e um lead foi criado para você.`, 'cotacao', '/crm');
              } else {
                dispatchNotification('cotacao_aprovada', '', 'Cotação Aprovada — Lead Livre', `A cotação de "${cotacao.nome}" foi aprovada como lead livre.`, 'cotacao', '/crm');
              }
              successCount++;
            } else if (bulkActionType === 'rejeitar') {
              const { error } = await supabase.from('cotacoes').update({
                status: 'rejeitado',
                motivo_recusa: bulkMotivo.trim(),
              } as any).eq('id', cotacao.id);
              if (error) throw error;
              logAction('bulk_rejeitar_cotacao', 'cotacao', cotacao.id, { nome: cotacao.nome });
              if (cotacao.consultor_recomendado_id) {
                dispatchNotification('cotacao_reprovada', cotacao.consultor_recomendado_id, 'Cotação Recusada', `A cotação de "${cotacao.nome}" foi recusada: ${bulkMotivo.trim()}`, 'cotacao', '/aprovacoes');
              }
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('cotacoes').delete().eq('id', cotacao.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }

      if (bulkActionTab === 'acesso') {
        const selectedDatas = filteredAccess.filter(r => ids.includes(r.id));
        for (const req of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar') {
              const { data: createResult, error: createError } = await supabase.functions.invoke('admin-create-user', {
                body: {
                  email: req.email, nome_completo: req.nome, celular: req.telefone, cpf: req.cpf, rg: req.rg,
                  endereco: req.endereco, cargo: req.cargo, role: req.nivel_acesso, supervisor_id: req.supervisor_id,
                  gerente_id: req.gerente_id, numero_emergencia_1: req.numero_emergencia_1, numero_emergencia_2: req.numero_emergencia_2,
                  data_admissao: req.data_admissao, data_nascimento: req.data_nascimento, encrypted_password: req.encrypted_password,
                }
              });
              if (createError) throw new Error(createError.message);
              if (createResult?.error) throw new Error(createResult.error);
              
              const { error } = await supabase.from('access_requests').update({ status: 'aprovado' } as any).eq('id', req.id);
              if (error) throw error;

              logAction('bulk_aprovar_acesso', 'access_request', req.id, { nome: req.nome, email: req.email });
              if (createResult.user_id) {
                dispatchNotification('acesso_aprovado', createResult.user_id, 'Acesso Aprovado', `Bem-vindo(a) ${req.nome}! Seu acesso ao sistema foi aprovado. Seu código é ${createResult.codigo}.`, 'acesso');
              }
              successCount++;
            } else if (bulkActionType === 'rejeitar') {
              const { error } = await supabase.from('access_requests').update({ status: 'rejeitado', motivo_recusa: bulkMotivo.trim() } as any).eq('id', req.id);
              if (error) throw error;
              logAction('bulk_rejeitar_acesso', 'access_request', req.id, { nome: req.nome, email: req.email });
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('access_requests').delete().eq('id', req.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['access-requests'] });
        queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
      }

      if (bulkActionTab === 'alteracoes') {
        const selectedDatas = filteredCR.filter(c => ids.includes(c.id));
        for (const cr of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar') {
              const payload = JSON.parse(cr.motivo);
              const alteracoes = payload.alteracoesPropostas || [];
              const updateObj: Record<string, any> = {};
              const ativCols = ['ligacoes', 'mensagens', 'cotacoes_enviadas', 'cotacoes_fechadas', 'cotacoes_nao_respondidas', 'follow_up', 'data', 'observacoes'];
              const vendaCols = ['nome_titular', 'modalidade', 'vidas', 'valor', 'observacoes', 'data_lancamento', 'justificativa_retroativo'];
              const validCols = cr.tipo === 'atividade' ? ativCols : vendaCols;
              
              for (const a of alteracoes) {
                if (!validCols.includes(a.campo)) continue;
                let val: any = a.valorNovo;
                if (['ligacoes', 'mensagens', 'cotacoes_enviadas', 'cotacoes_fechadas', 'follow_up', 'vidas'].includes(a.campo)) val = parseInt(val) || 0;
                if (a.campo === 'valor') val = parseFloat(val) || 0;
                updateObj[a.campo] = val;
              }
              
              const resetStatus = cr.tipo === 'atividade' ? 'pendente' : 'analise';
              updateObj.status = resetStatus;
              
              const table = cr.tipo === 'atividade' ? 'atividades' : 'vendas';
              if (Object.keys(updateObj).length > 0) {
                const { error: updateError } = await supabase.from(table).update(updateObj as any).eq('id', cr.registro_id);
                if (updateError) throw updateError;
              }
              
              const { error } = await supabase.from('correction_requests').update({ status: 'resolvido' } as any).eq('id', cr.id);
              if (error) throw error;
              
              dispatchNotification('alteracao_aprovada', cr.user_id, 'Alteração Aprovada', `Sua solicitação de alteração de ${cr.tipo} foi aprovada e aplicada.`, cr.tipo, '/minhas-acoes');
              successCount++;
            } else if (bulkActionType === 'rejeitar') {
              const { error } = await supabase.from('correction_requests').update({ status: 'rejeitado', admin_resposta: bulkMotivo.trim() } as any).eq('id', cr.id);
              if (error) throw error;
              dispatchNotification('alteracao_recusada', cr.user_id, 'Alteração Recusada', `Sua solicitação de alteração de ${cr.tipo} foi recusada: ${bulkMotivo.trim()}`, cr.tipo, '/minhas-acoes');
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('correction_requests').delete().eq('id', cr.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
        queryClient.invalidateQueries({ queryKey: ['atividades', 'vendas', 'team-atividades', 'team-vendas'] });
      }

      if (bulkActionTab === 'mfa') {
        const selectedDatas = filteredMfa.filter(m => ids.includes(m.id));
        const { user } = (await supabase.auth.getUser()).data;
        for (const req of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar') {
              await approveMfaReset(req.id, user!.id);
              dispatchNotification('mfa_resetado', req.user_id, 'MFA Resetado', 'Seu MFA foi resetado. Configure novamente no próximo login.', 'mfa', '/');
              successCount++;
            } else if (bulkActionType === 'rejeitar') {
              const { error } = await supabase.from('mfa_reset_requests' as any).update({ status: 'rejeitado', admin_resposta: bulkMotivo.trim(), handled_by: user!.id, handled_at: new Date().toISOString() } as any).eq('id', req.id);
              if (error) throw error;
              dispatchNotification('mfa_rejeitado', req.user_id, 'MFA Recusado', `Sua solicitação de reset de MFA foi recusada: ${bulkMotivo.trim()}`, 'mfa', '/');
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('mfa_reset_requests' as any).delete().eq('id', req.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['mfa-reset-requests'] });
      }

      if (bulkActionTab === 'senhas') {
        const selectedDatas = filteredPwd.filter(p => ids.includes(p.id));
        for (const req of selectedDatas) {
          try {
            if (bulkActionType === 'aprovar') {
              await resolvePasswordResetRequest(req.id, 'aprovado');
              dispatchNotification('senha_resetada', req.user_id, 'Senha Atualizada', 'Sua nova senha foi aprovada e já pode ser utilizada.', 'seguranca', '/');
              successCount++;
            } else if (bulkActionType === 'devolver') {
              const { error } = await supabase.from('password_reset_requests' as any).update({ status: 'devolvido' } as any).eq('id', req.id);
              if (error) throw error;
              dispatchNotification('senha_devolvida', req.user_id, 'Solicitação Devolvida', 'Sua solicitação de reset de senha foi devolvida para revisão.', 'seguranca', '/');
              successCount++;
            } else if (bulkActionType === 'rejeitar') {
              const { error } = await supabase.from('password_reset_requests' as any).update({ status: 'rejeitado' } as any).eq('id', req.id);
              if (error) throw error;
              successCount++;
            } else if (bulkActionType === 'excluir') {
              const { error } = await supabase.from('password_reset_requests' as any).delete().eq('id', req.id);
              if (error) throw error;
              successCount++;
            }
          } catch { failCount++; }
        }
        queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
      }

      if (successCount > 0) toast.success(`Ação concluída: ${successCount} sucesso(s)${failCount > 0 ? `, ${failCount} falha(s)` : ''}`);
      else toast.error(`Ação falhou para todos os ${failCount} registros.`);

      setSelectedItems(new Set());
      setBulkActionType(null);
      setBulkMotivo('');
    } finally {
      setIsProcessingBulk(false);
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
          <TabsTrigger value="cotacoes" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <MessageSquareQuote className="w-4 h-4" /> Cotações ({filteredCotacoes.length})
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="acesso" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
              <UserPlus className="w-4 h-4" /> Acesso ({filteredAccess.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="mfa" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <KeyRound className="w-4 h-4" /> MFA ({filteredMfa.filter(r => r.status === 'pendente').length})
          </TabsTrigger>
          <TabsTrigger value="senhas" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Shield className="w-4 h-4" /> Senhas ({filteredPwd.filter(r => r.status === 'pendente').length})
          </TabsTrigger>
        </TabsList>

        {/* ── Atividades Tab ── */}
        <TabsContent value="atividades">
          {selectedItems.size > 0 && bulkActionTab === 'atividades' && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between animate-fade-in gap-3 flex-wrap shadow-sm">
              <span className="text-sm font-semibold text-primary">{selectedItems.size} selecionado(s)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 text-success hover:bg-success/10 border-success/30" onClick={() => {setBulkActionType('aprovar'); setBulkMotivo('');}}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-primary hover:bg-primary/10 border-primary/30" onClick={() => {setBulkActionType('devolver'); setBulkMotivo('');}}>
                  <Undo2 className="w-4 h-4" /> Devolver
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => {setBulkActionType('rejeitar'); setBulkMotivo('');}}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
                {hasCargoPermission(myCargoPerms, 'aprovacao_atividades', 'aprovar') && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => {setBulkActionType('excluir'); setBulkMotivo('');}}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Cancelar</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button onClick={() => handleSelectAll(filteredAtividades.map(a => a.id), 'atividades')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {selectedItems.size === filteredAtividades.length && filteredAtividades.length > 0 && bulkActionTab === 'atividades' ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              <span>Selecionar Todos</span>
            </button>
          </div>
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
                  <div key={a.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-3 relative">
                    <div className="absolute top-4 left-4 z-10">
                      <button onClick={() => toggleItemSelection(a.id, 'atividades')} className="text-muted-foreground hover:text-primary transition-colors">
                        {selectedItems.has(a.id) && bulkActionTab === 'atividades' ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-3 pl-8">
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
                          <span>Cot.NResp: <strong>{(a as any).cotacoes_nao_respondidas ?? 0}</strong></span>
                          <span>Follow: <strong>{a.follow_up}</strong></span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleDateString('pt-BR')} — ID: {a.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => { setSelectedAtiv(a); setAtivJustificativa(''); }}>
                          <Eye className="w-4 h-4" /> Analisar
                        </Button>
                        {hasPermission(myPermissions, 'aprovacoes', 'edit') && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-success hover:bg-success/10 border-success/30" disabled={ativStatus !== 'pendente'} onClick={() => handleAtivAction(a, 'aprovado')}>
                              <CheckCircle2 className="w-4 h-4" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-primary hover:bg-primary/10 border-primary/30" disabled={ativStatus !== 'pendente'} onClick={() => { setIsRejectingAtiv(false); setDevolverAtiv(a); setDevolverAtivMotivo(''); }}>
                              <Undo2 className="w-4 h-4" /> Devolver
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => { setEditAtiv(a); setEditForm({ ligacoes: String(a.ligacoes), mensagens: String(a.mensagens), cotacoes_enviadas: String(a.cotacoes_enviadas), cotacoes_fechadas: String(a.cotacoes_fechadas), cotacoes_nao_respondidas: String((a as any).cotacoes_nao_respondidas ?? 0), follow_up: String(a.follow_up) }); }}>
                              <Pencil className="w-4 h-4" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-orange-500 hover:bg-orange-500/10 border-orange-500/30" disabled={ativStatus !== 'pendente'} onClick={() => { setIsRejectingAtiv(true); setDevolverAtiv(a); setDevolverAtivMotivo(''); }}>
                              <XCircle className="w-4 h-4" /> Rejeitar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setConfirmDeleteAtiv(a)}>
                              <Trash2 className="w-4 h-4" /> Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Vendas Tab ── */}
        <TabsContent value="vendas">
          {selectedItems.size > 0 && bulkActionTab === 'vendas' && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between animate-fade-in gap-3 flex-wrap shadow-sm">
              <span className="text-sm font-semibold text-primary">{selectedItems.size} selecionado(s)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 text-success hover:bg-success/10 border-success/30" onClick={() => {setBulkActionType('aprovar'); setBulkMotivo('');}}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-primary hover:bg-primary/10 border-primary/30" onClick={() => {setBulkActionType('devolver'); setBulkMotivo('');}}>
                  <Undo2 className="w-4 h-4" /> Devolver
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => {setBulkActionType('rejeitar'); setBulkMotivo('');}}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
                {hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => {setBulkActionType('excluir'); setBulkMotivo('');}}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Cancelar</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button onClick={() => handleSelectAll(filteredVendas.map(v => v.id), 'vendas')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {selectedItems.size === filteredVendas.length && filteredVendas.length > 0 && bulkActionTab === 'vendas' ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              <span>Selecionar Todos</span>
            </button>
          </div>
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
                  <div key={v.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-3 relative">
                    <div className="absolute top-4 left-4 z-10">
                      <button onClick={() => toggleItemSelection(v.id, 'vendas')} className="text-muted-foreground hover:text-primary transition-colors">
                        {selectedItems.has(v.id) && bulkActionTab === 'vendas' ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-3 pl-8">
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
                          {v.valor && <><span>•</span><span>R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>}
                          <span>•</span>
                          <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">ID: {v.id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => { setSelectedVenda(v); setObs(v.observacoes || ''); setJustificativa(''); }}>
                          <Eye className="w-4 h-4" /> Analisar
                        </Button>
                        {hasPermission(myPermissions, 'aprovacoes', 'edit') && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-success hover:bg-success/10 border-success/30" disabled={!isPending} onClick={() => handleVendaAction(v, 'aprovado')}>
                              <CheckCircle2 className="w-4 h-4" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-primary hover:bg-primary/10 border-primary/30" disabled={!isPending} onClick={() => { setIsRejectingVenda(false); setDevolverVenda(v); setDevolverVendaMotivo(''); }}>
                              <Undo2 className="w-4 h-4" /> Devolver
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => { setSelectedVenda(v); setObs(v.observacoes || ''); setJustificativa(''); }}>
                              <Pencil className="w-4 h-4" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-orange-500 hover:bg-orange-500/10 border-orange-500/30" disabled={!isPending} onClick={() => { setIsRejectingVenda(true); setDevolverVenda(v); setDevolverVendaMotivo(''); }}>
                              <XCircle className="w-4 h-4" /> Rejeitar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setConfirmDeleteVenda(v)}>
                              <Trash2 className="w-4 h-4" /> Excluir
                            </Button>
                          </>
                        )}
                      </div>
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

        {/* ── Cotações Tab ── */}
        <TabsContent value="cotacoes">
          {selectedItems.size > 0 && bulkActionTab === 'cotacoes' && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between animate-fade-in gap-3 flex-wrap shadow-sm">
              <span className="text-sm font-semibold text-primary">{selectedItems.size} selecionado(s)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 text-success hover:bg-success/10 border-success/30" onClick={() => {setBulkActionType('aprovar'); setBulkMotivo('');}}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => {setBulkActionType('rejeitar'); setBulkMotivo('');}}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
                {hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => {setBulkActionType('excluir'); setBulkMotivo('');}}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Cancelar</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button onClick={() => handleSelectAll(filteredCotacoes.map(c => c.id), 'cotacoes')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {selectedItems.size === filteredCotacoes.length && filteredCotacoes.length > 0 && bulkActionTab === 'cotacoes' ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              <span>Selecionar Todos</span>
            </button>
          </div>
          <div className="grid gap-3">
            {loadingCotacoes ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredCotacoes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquareQuote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma cotação encontrada.
              </div>
            ) : (
              filteredCotacoes.map((c) => {
                const sc = statusColors[c.status] || statusColors.pendente;
                const consultorName = c.consultor_recomendado_id ? (profiles.find(p => p.id === c.consultor_recomendado_id)?.nome_completo || '—') : null;
                return (
                  <div key={c.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-3 relative">
                    <div className="absolute top-4 left-4 z-10">
                      <button onClick={() => toggleItemSelection(c.id, 'cotacoes')} className="text-muted-foreground hover:text-primary transition-colors">
                        {selectedItems.has(c.id) && bulkActionTab === 'cotacoes' ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-3 pl-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                          <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[c.status] || c.status}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">Cotação</Badge>
                          {c.companhia_nome && <Badge variant="outline" className="text-[10px]">{c.companhia_nome}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>{c.contato}</span>
                          {c.email && <><span>•</span><span>{c.email}</span></>}
                          {c.modalidade && <><span>•</span><span>{c.modalidade}</span></>}
                          <span>•</span><span>{c.quantidade_vidas} vida(s)</span>
                          {consultorName && <><span>•</span><span>Indicação: <strong>{consultorName}</strong></span></>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(c.created_at).toLocaleDateString('pt-BR')} — Origem: Landing Page
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => setViewCotacao(c)}>
                          <Eye className="w-4 h-4" /> Analisar
                        </Button>
                        {c.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'aprovar') && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-success hover:bg-success/10 border-success/30" onClick={() => handleApproveCotacao(c)} disabled={savingCotacao}>
                              <CheckCircle2 className="w-4 h-4" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => openEditCotacao(c)}>
                              <Pencil className="w-4 h-4" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => { setRejectCotacao(c); setRejectCotacaoReason(''); }}>
                              <XCircle className="w-4 h-4" /> Rejeitar
                            </Button>
                          </>
                        )}
                        {hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteCotacao(c)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {c.lead_id && <Badge className="bg-success/10 text-success text-[10px]">Lead criado</Badge>}
                      </div>
                    </div>
                    {c.motivo_recusa && (
                      <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                        <p className="text-xs text-muted-foreground mb-1">Motivo da recusa:</p>
                        <p className="text-sm text-foreground">{c.motivo_recusa}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Acesso Tab (Supervisor+) ── */}
        {isSuperAdmin && (
          <TabsContent value="acesso">
            {selectedItems.size > 0 && bulkActionTab === 'acesso' && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between animate-fade-in gap-3 flex-wrap shadow-sm">
                <span className="text-sm font-semibold text-primary">{selectedItems.size} selecionado(s)</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1.5 text-success hover:bg-success/10 border-success/30" onClick={() => {setBulkActionType('aprovar'); setBulkMotivo('');}}>
                    <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => {setBulkActionType('rejeitar'); setBulkMotivo('');}}>
                    <XCircle className="w-4 h-4" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => {setBulkActionType('excluir'); setBulkMotivo('');}}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Cancelar</Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-3 px-1">
              <button onClick={() => handleSelectAll(filteredAccess.map(r => r.id), 'acesso')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {selectedItems.size === filteredAccess.length && filteredAccess.length > 0 && bulkActionTab === 'acesso' ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                <span>Selecionar Todos</span>
              </button>
            </div>
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
                    <div key={req.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-3 relative">
                      <div className="absolute top-4 left-4 z-10">
                        <button onClick={() => toggleItemSelection(req.id, 'acesso')} className="text-muted-foreground hover:text-primary transition-colors">
                          {selectedItems.has(req.id) && bulkActionTab === 'acesso' ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="flex items-start justify-between gap-3 pl-8">
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
                        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                          <Button variant="outline" size="sm" className="gap-1.5 font-semibold" onClick={() => setViewAccess(req)}>
                            <Eye className="w-4 h-4" /> Analisar
                          </Button>
                          {req.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'aprovar') && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-success hover:bg-success/10 border-success/30" onClick={() => handleApproveAccess(req)} disabled={savingAccess}>
                                <CheckCircle2 className="w-4 h-4" /> Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => openEditAccess(req)}>
                                <Pencil className="w-4 h-4" /> Editar
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => { setRejectAccess(req); setRejectReason(''); }}>
                                <XCircle className="w-4 h-4" /> Rejeitar
                              </Button>
                            </>
                          )}
                          {hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteAccess(req)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

        {/* ── MFA Tab Content ── */}
        <TabsContent value="mfa">
          {selectedItems.size > 0 && bulkActionTab === 'mfa' && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between animate-fade-in gap-3 flex-wrap shadow-sm">
              <span className="text-sm font-semibold text-primary">{selectedItems.size} selecionado(s)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 text-success hover:bg-success/10 border-success/30" onClick={() => {setBulkActionType('aprovar'); setBulkMotivo('');}}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => {setBulkActionType('rejeitar'); setBulkMotivo('');}}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
                {hasCargoPermission(myCargoPerms, 'aprovacao_admin_mfa', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => {setBulkActionType('excluir'); setBulkMotivo('');}}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Cancelar</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button onClick={() => handleSelectAll(filteredMfa.map(m => m.id), 'mfa')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {selectedItems.size === filteredMfa.length && filteredMfa.length > 0 && bulkActionTab === 'mfa' ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              <span>Selecionar Todos</span>
            </button>
          </div>
          <div className="grid gap-3">
            {loadingMfaReset ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredMfa.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <KeyRound className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de reset MFA.
              </div>
            ) : (
              filteredMfa.map((req) => {
                const sc = req.status === 'pendente' ? statusColors.pendente : req.status === 'aprovado' ? statusColors.aprovado : statusColors.devolvido;
                return (
                  <div key={req.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-3 relative">
                    <div className="absolute top-4 left-4 z-10">
                      <button onClick={() => toggleItemSelection(req.id, 'mfa')} className="text-muted-foreground hover:text-primary transition-colors">
                        {selectedItems.has(req.id) && bulkActionTab === 'mfa' ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-3 pl-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{getConsultorName(req.user_id)}</p>
                          <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[req.status] || req.status}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">Reset MFA</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Motivo</p>
                      <p className="text-sm whitespace-pre-wrap">{req.motivo}</p>
                    </div>
                    {req.admin_resposta && (
                      <div className="p-3 bg-destructive/5 rounded-lg">
                        <p className="text-[10px] text-destructive uppercase font-semibold mb-1">Resposta do Aprovador</p>
                        <p className="text-sm whitespace-pre-wrap">{req.admin_resposta}</p>
                      </div>
                    )}
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end mt-2">
                      <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => setViewMfaReq(req)}>
                        <Eye className="w-4 h-4" /> Analisar
                      </Button>
                      {req.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_admin_mfa', 'aprovar') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 font-semibold text-success hover:bg-success/10 border-success/30"
                            disabled={savingMfaReset}
                            onClick={async () => {
                              setSavingMfaReset(true);
                              try {
                                const { user } = (await supabase.auth.getUser()).data;
                                await approveMfaReset(req.id, user!.id);
                                toast.success('MFA resetado com sucesso! O usuário verá o QR Code no próximo login.');
                                dispatchNotification('mfa_resetado', req.user_id, 'MFA Resetado', 'Seu MFA foi resetado. Configure novamente no próximo login.', 'mfa', '/');
                                queryClient.invalidateQueries({ queryKey: ['mfa-reset-requests'] });
                              } catch (err: any) { toast.error(err.message); }
                              finally { setSavingMfaReset(false); }
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => { setRejectMfaReq(req); setRejectMfaReason(''); }}
                          >
                            <XCircle className="w-4 h-4" /> Recusar
                          </Button>
                        </>
                      )}
                      {hasCargoPermission(myCargoPerms, 'aprovacao_admin_mfa', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={async () => {
                          if (!confirm('Excluir esta solicitação?')) return;
                          try {
                            const { error } = await supabase.from('mfa_reset_requests' as any).delete().eq('id', req.id);
                            if (error) throw error;
                            toast.success('Solicitação excluída!');
                            queryClient.invalidateQueries({ queryKey: ['mfa-reset-requests'] });
                          } catch (err: any) { toast.error(err.message); }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Senhas Tab Content ── */}
        <TabsContent value="senhas">
          {selectedItems.size > 0 && bulkActionTab === 'senhas' && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between animate-fade-in gap-3 flex-wrap shadow-sm">
              <span className="text-sm font-semibold text-primary">{selectedItems.size} selecionado(s)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 text-success hover:bg-success/10 border-success/30" onClick={() => {setBulkActionType('aprovar'); setBulkMotivo('');}}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-primary hover:bg-primary/10 border-primary/30" onClick={() => {setBulkActionType('devolver'); setBulkMotivo('');}}>
                  <Undo2 className="w-4 h-4" /> Devolver
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:bg-orange-500/10 border-orange-500/30" onClick={() => {setBulkActionType('rejeitar'); setBulkMotivo('');}}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
                {hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => {setBulkActionType('excluir'); setBulkMotivo('');}}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>Cancelar</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button onClick={() => handleSelectAll(filteredPwd.map(p => p.id), 'senhas')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {selectedItems.size === filteredPwd.length && filteredPwd.length > 0 && bulkActionTab === 'senhas' ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              <span>Selecionar Todos</span>
            </button>
          </div>
          <div className="grid gap-3">
            {loadingPwdReset ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredPwd.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de alteração de senha.
              </div>
            ) : (
              filteredPwd.map((req) => {
                const sc = req.status === 'pendente' ? statusColors.pendente : req.status === 'aprovado' ? statusColors.aprovado : statusColors.devolvido;
                const reqName = req.profiles?.nome_completo || getConsultorName(req.user_id);
                return (
                  <div key={req.id} className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 space-y-3 relative">
                    <div className="absolute top-4 left-4 z-10">
                      <button onClick={() => toggleItemSelection(req.id, 'senhas')} className="text-muted-foreground hover:text-primary transition-colors">
                        {selectedItems.has(req.id) && bulkActionTab === 'senhas' ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-3 pl-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{reqName}</p>
                          <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[req.status] || req.status}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">Reset Senha</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(req.requested_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Motivo</p>
                      <p className="text-sm whitespace-pre-wrap">{req.motivo}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Nova Senha Solicitada</p>
                        <p className="text-sm text-foreground font-mono">•••••••• (Criptografada)</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end mt-2">
                      {hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'aprovar') && (
                        <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => setViewPwdReq(req)}>
                          <Eye className="w-4 h-4" /> Analisar
                        </Button>
                      )}
                      
                      {req.status === 'pendente' && (
                        <>
                          {hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'aprovar') && (
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-success hover:bg-success/10 border-success/30"
                              disabled={savingPwdReset}
                              onClick={async () => {
                                setSavingPwdReset(true);
                                try {
                                  await resolvePasswordResetRequest(req.id, 'aprovado');
                                  toast.success('Senha atualizada com sucesso!');
                                  dispatchNotification('senha_resetada', req.user_id, 'Senha Atualizada', 'Sua nova senha foi aprovada e já pode ser utilizada.', 'seguranca', '/');
                                  queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
                                } catch (err: any) { toast.error(err.message); }
                                finally { setSavingPwdReset(false); }
                              }}
                            >
                             <CheckCircle2 className="w-4 h-4" /> Aprovar e Aplicar Senha
                            </Button>
                          )}
                          
                          {hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'aprovar') && (
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-primary hover:bg-primary/10 border-primary/30"
                              disabled={savingPwdReset}
                              onClick={async () => {
                                setSavingPwdReset(true);
                                try {
                                  const { error } = await supabase.from('password_reset_requests' as any)
                                    .update({ status: 'devolvido' } as any)
                                    .eq('id', req.id);
                                  if (error) throw error;
                                  toast.success('Solicitação devolvida ao usuário.');
                                  dispatchNotification('senha_devolvida', req.user_id, 'Solicitação Devolvida', 'Sua solicitação de reset de senha foi devolvida para revisão.', 'seguranca', '/');
                                  queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
                                } catch (err: any) { toast.error(err.message); }
                                finally { setSavingPwdReset(false); }
                              }}
                            >
                             <Undo2 className="w-4 h-4" /> Devolver
                            </Button>
                          )}

                          {hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'aprovar') && (
                            <Button size="sm" variant="outline" className="gap-1.5 font-semibold text-orange-500 hover:bg-orange-500/10 border-orange-500/30"
                              onClick={() => { setRejectPwdReq(req); setRejectPwdReason(''); }}
                            >
                             <XCircle className="w-4 h-4" /> Rejeitar
                            </Button>
                          )}
                        </>
                      )}
                      {hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={async () => {
                          if (!confirm('Excluir esta solicitação de senha?')) return;
                          try {
                            const { error } = await supabase.from('password_reset_requests' as any).delete().eq('id', req.id);
                            if (error) throw error;
                            toast.success('Solicitação excluída!');
                            queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
                          } catch (err: any) { toast.error(err.message); }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* ── Venda Detail Dialog ── */}
      <VendaDetailDialog
        venda={selectedVenda}
        onClose={() => { setSelectedVenda(null); setJustificativa(''); }}
        getConsultorName={getConsultorName}
        justificativa={justificativa}
        setJustificativa={setJustificativa}
        onAction={handleVendaAction}
        onReject={(v: Venda) => { setSelectedVenda(null); setIsRejectingVenda(true); setDevolverVenda(v); setDevolverVendaMotivo(justificativa); }}
        canEdit={hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'aprovar')}
        canDelete={hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'excluir')}
        onDelete={async (v: Venda) => {
          if (!confirm('Excluir esta venda?')) return;
          try {
            const { error, data } = await supabase.from('vendas').delete().eq('id', v.id).select();
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Não foi possível excluir a venda. Valide suas permissões.');
            toast.success('Venda excluída!');
            queryClient.invalidateQueries({ queryKey: ['team-vendas'] });
            setSelectedVenda(null);
          } catch (err: any) { toast.error(err.message); }
        }}
      />

      {/* ── Atividade Detail Dialog ── */}
      <Dialog open={!!selectedAtiv} onOpenChange={() => setSelectedAtiv(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detalhes da Atividade</DialogTitle>
          </DialogHeader>
          {selectedAtiv && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Consultor</span><p className="font-semibold text-foreground mt-0.5">{getConsultorName(selectedAtiv.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Data</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.data.split('-').reverse().join('/')}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Ligações</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.ligacoes}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Mensagens</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.mensagens}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Cot. Enviadas</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.cotacoes_enviadas}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Cot. Fechadas</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.cotacoes_fechadas}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Cot. Não Resp.</span><p className="font-semibold text-foreground mt-0.5">{(selectedAtiv as any).cotacoes_nao_respondidas ?? 0}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Follow-up</span><p className="font-semibold text-foreground mt-0.5">{selectedAtiv.follow_up}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Criado em</span><p className="font-semibold text-foreground mt-0.5">{new Date(selectedAtiv.created_at).toLocaleDateString('pt-BR')}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">ID</span><p className="font-semibold text-foreground mt-0.5 font-mono text-xs">{selectedAtiv.id.slice(0, 12)}...</p></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Justificativa da Devolução <span className="text-destructive">*</span></label>
                <Textarea value={ativJustificativa} onChange={(e) => setAtivJustificativa(e.target.value)} placeholder="Obrigatório para devolver. Explique o motivo..." rows={3} className="border-border/40" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {hasCargoPermission(myCargoPerms, 'aprovacao_atividades', 'aprovar') && (
                  <>
                    <Button onClick={() => handleAtivAction(selectedAtiv, 'aprovado')} disabled={savingAtiv} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                      <CheckCircle2 className="w-5 h-5" /> Aprovar
                    </Button>
                    <Button onClick={() => handleAtivAction(selectedAtiv, 'devolvido')} disabled={savingAtiv} variant="outline" className="flex-1 font-semibold gap-1.5 border-primary text-primary hover:bg-primary/10" size="lg">
                      <Undo2 className="w-5 h-5" /> Devolver
                    </Button>
                    <Button onClick={() => { setIsRejectingAtiv(true); setDevolverAtiv(selectedAtiv); setDevolverAtivMotivo(ativJustificativa); setSelectedAtiv(null); }} disabled={savingAtiv} variant="outline" className="flex-1 font-semibold gap-1.5 border-orange-500 text-orange-500 hover:bg-orange-500/10" size="lg">
                      <XCircle className="w-5 h-5" /> Rejeitar
                    </Button>
                    <Button onClick={() => {
                        setEditAtiv(selectedAtiv);
                        setEditForm({
                          ligacoes: String(selectedAtiv.ligacoes),
                          mensagens: String(selectedAtiv.mensagens),
                          cotacoes_enviadas: String(selectedAtiv.cotacoes_enviadas),
                          cotacoes_fechadas: String(selectedAtiv.cotacoes_fechadas),
                          cotacoes_nao_respondidas: String((selectedAtiv as any).cotacoes_nao_respondidas ?? 0),
                          follow_up: String(selectedAtiv.follow_up),
                        });
                      }} variant="outline" className="flex-1 font-semibold gap-1.5 border-muted-foreground text-foreground hover:bg-muted" size="lg">
                      <Pencil className="w-5 h-5" /> Editar
                    </Button>
                  </>
                )}
                {hasCargoPermission(myCargoPerms, 'aprovacao_atividades', 'excluir') && (
<Button variant="destructive" className="flex-1 font-semibold gap-1.5" size="lg" onClick={async () => {
                    if (!confirm('Excluir esta atividade?')) return;
                    try {
                      const { error, data } = await supabase.from('atividades').delete().eq('id', selectedAtiv.id).select();
                      if (error) throw error;
                      if (!data || data.length === 0) throw new Error('Não foi possível excluir. Sem permissão no banco de dados ou registro inexistente.');
                      toast.success('Atividade excluída!');
                      queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
                      setSelectedAtiv(null);
                    } catch (err: any) { toast.error(err.message); }
                  }}>
                    <Trash2 className="w-5 h-5" /> Excluir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Atividade Dialog ── */}
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
              { key: 'cotacoes_nao_respondidas', label: 'Cot. Não Respondidas' },
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
            <Button onClick={handleSaveEditAtiv} disabled={editSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {editSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Access Dialog ── */}
      <Dialog open={!!viewAccess} onOpenChange={(v) => { if (!v) setViewAccess(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detalhes da Solicitação de Acesso</DialogTitle>
          </DialogHeader>
          {viewAccess && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome da equipe ou consultor</label>
                  <Input value={viewAccess.nome || ''} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">E-mail corporativo</label>
                  <Input value={viewAccess.email || ''} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Celular com WhatsApp</label>
                  <Input value={viewAccess.telefone || ''} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">CPF</label>
                  <Input value={viewAccess.cpf || ''} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">RG</label>
                  <Input value={viewAccess.rg || ''} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Cargo Oficial</label>
                  <Input value={viewAccess.cargo || ''} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Endereço Completo</label>
                <Input value={viewAccess.endereco || ''} disabled className="h-10 bg-muted/50" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome do seu Supervisor Diário</label>
                  <Input value={viewAccess.supervisor_id ? (profiles.find(p => p.id === viewAccess.supervisor_id)?.nome_completo || viewAccess.supervisor_id) : 'Nenhum'} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome do seu Gerente Comercial</label>
                  <Input value={viewAccess.gerente_id ? (profiles.find(p => p.id === viewAccess.gerente_id)?.nome_completo || viewAccess.gerente_id) : 'Nenhum'} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Data de Nascimento</label>
                  <Input type="date" value={viewAccess.data_nascimento || ''} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Data de Admissão na Corretora</label>
                  <Input type="date" value={viewAccess.data_admissao || ''} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone de Emergência 1</label>
                  <Input value={viewAccess.numero_emergencia_1 || ''} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Telefone de Emergência 2</label>
                <Input value={viewAccess.numero_emergencia_2 || ''} disabled className="h-10 bg-muted/50" />
              </div>
              {viewAccess.mensagem && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Adicione suas observações abaixo</label>
                  <Textarea value={viewAccess.mensagem || ''} disabled rows={3} className="bg-muted/50" />
                </div>
              )}
              <div className="flex gap-2 flex-wrap pt-4">
                {viewAccess.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'aprovar') && (
                  <>
                    <Button onClick={() => { handleApproveAccess(viewAccess); setViewAccess(null); }} disabled={savingAccess} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                      <CheckCircle2 className="w-5 h-5" /> Aprovar
                    </Button>
                    <Button onClick={() => { setRejectAccess(viewAccess); setRejectReason(''); setViewAccess(null); }} variant="outline" className="flex-1 font-semibold gap-1.5 border-orange-500 text-orange-500 hover:bg-orange-500/10" size="lg">
                      <XCircle className="w-5 h-5" /> Rejeitar
                    </Button>
                    <Button onClick={() => { openEditAccess(viewAccess); setViewAccess(null); }} variant="outline" className="flex-1 font-semibold gap-1.5 border-muted-foreground text-foreground hover:bg-muted" size="lg">
                      <Pencil className="w-5 h-5" /> Editar
                    </Button>
                  </>
                )}
                {hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'excluir') && (
<Button variant="destructive" className="flex-1 font-semibold gap-1.5" size="lg" onClick={() => { setDeleteAccess(viewAccess); setViewAccess(null); }}>
                    <Trash2 className="w-5 h-5" /> Excluir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Access Dialog ── */}
      <Dialog open={!!rejectAccess} onOpenChange={(v) => { if (!v) setRejectAccess(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-orange-500">Rejeitar Solicitação</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição. O solicitante será notificado: {rejectAccess?.nome}.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da recusa (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectAccess(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectAccess} disabled={savingAccess} className="gap-1">
              {savingAccess ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Rejeitar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Access Dialog ── */}
      <Dialog open={!!deleteAccess} onOpenChange={(v) => { if (!v) setDeleteAccess(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Solicitação</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir a solicitação de <strong>{deleteAccess?.nome}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAccess(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (!deleteAccess) return;
              setSavingAccess(true);
              try {
                const { error } = await supabase.from('access_requests').delete().eq('id', deleteAccess.id);
                if (error) throw error;
                toast.success('Solicitação excluída!');
                queryClient.invalidateQueries({ queryKey: ['access-requests'] });
                setDeleteAccess(null);
              } catch (err: any) { toast.error(err.message); }
              finally { setSavingAccess(false); }
            }} disabled={savingAccess} className="gap-1">
              {savingAccess ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Cotação Dialog ── */}
      <Dialog open={!!rejectCotacao} onOpenChange={(v) => { if (!v) setRejectCotacao(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-orange-500">Rejeitar Cotação</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição para a cotação de {rejectCotacao?.nome}.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectCotacaoReason} onChange={(e) => setRejectCotacaoReason(e.target.value)} placeholder="Motivo da rejeição (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectCotacao(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectCotacao} disabled={savingCotacao} className="gap-1">
              {savingCotacao ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Rejeitar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Cotação Dialog ── */}
      <Dialog open={!!editCotacao} onOpenChange={(v) => { if (!v) setEditCotacao(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Editar Cotação</DialogTitle>
            <DialogDescription>Edite os dados da cotação. Isso é equivalente a editar um Lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome <span className="text-destructive">*</span></label>
              <Input value={cotacaoForm.nome} onChange={e => setCotacaoForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Contato</label>
                <Input value={cotacaoForm.contato} onChange={e => setCotacaoForm(p => ({ ...p, contato: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
                <Input value={cotacaoForm.email} onChange={e => setCotacaoForm(p => ({ ...p, email: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Modalidade</label>
              <Select value={cotacaoForm.modalidade || '__none__'} onValueChange={v => setCotacaoForm(p => ({ ...p, modalidade: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {modalidadesList.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Companhia</label>
                <Select value={cotacaoForm.companhia_nome || '__none__'} onValueChange={v => setCotacaoForm(p => ({ ...p, companhia_nome: v === '__none__' ? '' : v, produto_nome: '' }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {companhiasList.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Produto</label>
                <Select value={cotacaoForm.produto_nome || '__none__'} onValueChange={v => setCotacaoForm(p => ({ ...p, produto_nome: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {(() => {
                      const comp = companhiasList.find(c => c.nome === cotacaoForm.companhia_nome);
                      const filtered = comp ? produtosList.filter(p => p.companhia_id === comp.id) : produtosList;
                      return filtered.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Quantidade de Vidas</label>
              <Input type="number" min={1} value={cotacaoForm.quantidade_vidas} onChange={e => setCotacaoForm(p => ({ ...p, quantidade_vidas: e.target.value }))} className="h-10" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
              <Switch checked={cotacaoForm.com_dental} onCheckedChange={v => setCotacaoForm(p => ({ ...p, com_dental: v }))} />
              <Label className="text-sm text-foreground">Venda c/ Dental</Label>
              <span className="text-xs text-muted-foreground ml-auto">{cotacaoForm.com_dental ? 'Sim' : 'Não'}</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Co-Participação</label>
              <Select value={cotacaoForm.co_participacao} onValueChange={v => setCotacaoForm(p => ({ ...p, co_participacao: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem">Sem Co-Participação</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="completa">Completa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditCotacao(null)}>Cancelar</Button>
            <Button onClick={handleSaveCotacao} disabled={savingCotacao} className="gap-1">
              {savingCotacao ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Cotação Dialog (Identical to New Lead Form) ── */}
      <Dialog open={!!viewCotacao} onOpenChange={(v) => { if (!v) setViewCotacao(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Analisar Cotação</DialogTitle>
          </DialogHeader>
          {viewCotacao && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nome <span className="text-destructive">*</span></label>
                <Input value={viewCotacao.nome} disabled className="h-10 bg-muted/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
                  <Input value={viewCotacao.contato || ''} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
                  <Input value={viewCotacao.email || ''} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Modalidade</label>
                <Input value={viewCotacao.modalidade || '—'} disabled className="h-10 bg-muted/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Companhia</label>
                  <Input value={viewCotacao.companhia_nome || '—'} disabled className="h-10 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Produto</label>
                  <Input value={viewCotacao.produto_nome || '—'} disabled className="h-10 bg-muted/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Quantidade de Vidas</label>
                <Input value={viewCotacao.quantidade_vidas || ''} disabled className="h-10 bg-muted/50" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                <Switch checked={viewCotacao.com_dental} disabled />
                <Label className="text-sm text-foreground">Venda c/ Dental</Label>
                <span className="text-xs text-muted-foreground ml-auto">{viewCotacao.com_dental ? 'Sim' : 'Não'}</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Co-Participação</label>
                <Input value={viewCotacao.co_participacao === 'sem' ? 'Sem Co-Participação' : viewCotacao.co_participacao === 'parcial' ? 'Parcial' : viewCotacao.co_participacao === 'completa' ? 'Completa' : (viewCotacao.co_participacao || '—')} disabled className="h-10 bg-muted/50" />
              </div>
              {viewCotacao.consultor_recomendado_id && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Consultor Recomendado</label>
                  <Input value={profiles.find(p => p.id === viewCotacao.consultor_recomendado_id)?.nome_completo || '—'} disabled className="h-10 bg-muted/50" />
                </div>
              )}
              <div className="flex gap-2 flex-wrap pt-4">
                {viewCotacao.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'aprovar') && (
                  <>
                    <Button onClick={() => { handleApproveCotacao(viewCotacao); setViewCotacao(null); }} disabled={savingCotacao} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                      <CheckCircle2 className="w-5 h-5" /> Aprovar
                    </Button>
                    <Button onClick={() => { setRejectCotacao(viewCotacao); setRejectCotacaoReason(''); setViewCotacao(null); }} variant="outline" className="flex-1 font-semibold gap-1.5 border-orange-500 text-orange-500 hover:bg-orange-500/10" size="lg">
                      <XCircle className="w-5 h-5" /> Rejeitar
                    </Button>
                    <Button onClick={() => { openEditCotacao(viewCotacao); setViewCotacao(null); }} variant="outline" className="flex-1 font-semibold gap-1.5 border-muted-foreground text-foreground hover:bg-muted" size="lg">
                      <Pencil className="w-5 h-5" /> Editar
                    </Button>
                  </>
                )}
                {hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'aprovar') && (
                  <Button variant="destructive" className="flex-1 font-semibold gap-1.5" size="lg" onClick={() => { setDeleteCotacao(viewCotacao); setViewCotacao(null); }}>
                    <Trash2 className="w-5 h-5" /> Excluir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Cotação Dialog ── */}
      <Dialog open={!!deleteCotacao} onOpenChange={(v) => { if (!v) setDeleteCotacao(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Cotação</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir a cotação de <strong>{deleteCotacao?.nome}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCotacao(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteCotacao} disabled={savingCotacao} className="gap-1">
              {savingCotacao ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Access Request Dialog ── */}
      <Dialog open={!!editAccessReq} onOpenChange={(v) => { if (!v) setEditAccessReq(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Editar Solicitação de Acesso</DialogTitle>
            <DialogDescription>Edite os dados antes de aprovar ou recusar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Dados Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Completo <span className="text-destructive">*</span></label>
                  <Input value={editAccessForm.nome || ''} onChange={e => setEditAccessForm(p => ({ ...p, nome: e.target.value }))} placeholder="Seu nome completo" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail <span className="text-destructive">*</span></label>
                  <Input type="email" value={editAccessForm.email || ''} onChange={e => setEditAccessForm(p => ({ ...p, email: e.target.value }))} placeholder="seu.email@gmail.com" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Celular</label>
                  <Input value={editAccessForm.telefone || ''} onChange={e => setEditAccessForm(p => ({ ...p, telefone: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPF</label>
                  <Input value={editAccessForm.cpf || ''} onChange={e => setEditAccessForm(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RG</label>
                  <Input value={editAccessForm.rg || ''} onChange={e => setEditAccessForm(p => ({ ...p, rg: e.target.value }))} placeholder="00.000.000-0" className="h-10" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</label>
                  <Input value={editAccessForm.endereco || ''} onChange={e => setEditAccessForm(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade - UF" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Nascimento</label>
                  <Input type="date" value={editAccessForm.data_nascimento || ''} onChange={e => setEditAccessForm(p => ({ ...p, data_nascimento: e.target.value }))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Admissão</label>
                  <Input type="date" value={editAccessForm.data_admissao || ''} onChange={e => setEditAccessForm(p => ({ ...p, data_admissao: e.target.value }))} className="h-10" />
                </div>
              </div>
            </div>

            {/* Contatos de Emergência */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Contatos de Emergência</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergência 1 (Opcional)</label>
                    <Input value={editAccessForm.numero_emergencia_1 || ''} onChange={e => setEditAccessForm(p => ({ ...p, numero_emergencia_1: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergência 2 (Opcional)</label>
                    <Input value={editAccessForm.numero_emergencia_2 || ''} onChange={e => setEditAccessForm(p => ({ ...p, numero_emergencia_2: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Cargo & Acesso */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Cargo & Acesso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</label>
                  <Select value={editAccessForm.cargo || '__none__'} onValueChange={v => setEditAccessForm(p => ({ ...p, cargo: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione um cargo..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {cargos.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Líderes */}
            {(() => {
                const selectedObj = cargos.find(c => c.nome === editAccessForm.cargo);
                const requiresLeader = selectedObj ? selectedObj.requires_leader !== false : true;
                const isManagerOrDirector = (editAccessForm.cargo || '').toLowerCase().includes('gerente') || (editAccessForm.cargo || '').toLowerCase().includes('diretor');
                return requiresLeader && !isManagerOrDirector;
            })() && (
              <div>
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Líderes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!['Supervisor'].includes(editAccessForm.cargo || '') && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervisor</label>
                      <Select value={editAccessForm.supervisor_id || '__none__'} onValueChange={v => setEditAccessForm(p => ({ ...p, supervisor_id: v === '__none__' ? null : v }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum (responde ao Gerente)</SelectItem>
                          {supervisores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_completo || p.apelido}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gerente</label>
                    <Select value={editAccessForm.gerente_id || '__none__'} onValueChange={v => setEditAccessForm(p => ({ ...p, gerente_id: v === '__none__' ? null : v }))}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {gerentes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_completo || p.apelido}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagem (Opcional)</label>
              <Textarea value={editAccessForm.mensagem || ''} onChange={e => setEditAccessForm(p => ({ ...p, mensagem: e.target.value }))} placeholder="Informações adicionais..." rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditAccessReq(null)}>Cancelar</Button>
            <Button onClick={handleSaveAccessReq} disabled={savingAccess} className="gap-1">
              {savingAccess ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Correction Request Dialog ── */}
      <Dialog open={!!rejectCR} onOpenChange={(v) => { if (!v) setRejectCR(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Recusar Alteração</DialogTitle>
            <DialogDescription>Informe o motivo da recusa para esta solicitação de alteração.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectCRReason} onChange={(e) => setRejectCRReason(e.target.value)} placeholder="Motivo da recusa (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectCR(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectCR} disabled={savingCR} className="gap-1">
              {savingCR ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Recusar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Reject MFA Reset Dialog ── */}
      <Dialog open={!!rejectMfaReq} onOpenChange={(v) => { if (!v) setRejectMfaReq(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Recusar Reset MFA</DialogTitle>
            <DialogDescription>Informe o motivo da recusa para esta solicitação de reset MFA.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectMfaReason} onChange={(e) => setRejectMfaReason(e.target.value)} placeholder="Motivo da recusa (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectMfaReq(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={savingMfaReset}
              className="gap-1"
              onClick={async () => {
                if (!rejectMfaReq || !rejectMfaReason.trim()) { toast.error('Informe o motivo da recusa.'); return; }
                setSavingMfaReset(true);
                try {
                  const { user } = (await supabase.auth.getUser()).data;
                  await rejectMfaReset(rejectMfaReq.id, user!.id, rejectMfaReason.trim());
                  toast.success('Solicitação de reset MFA recusada.');
                  dispatchNotification('mfa_reset_recusado', rejectMfaReq.user_id, 'Reset MFA Recusado', `Sua solicitação de reset MFA foi recusada: ${rejectMfaReason.trim()}`, 'mfa', '/');
                  queryClient.invalidateQueries({ queryKey: ['mfa-reset-requests'] });
                  setRejectMfaReq(null);
                  setRejectMfaReason('');
                } catch (err: any) { toast.error(err.message); }
                finally { setSavingMfaReset(false); }
              }}
            >
              {savingMfaReset ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Recusar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Devolver Atividade Dialog ── */}
      <Dialog open={!!devolverAtiv} onOpenChange={(v) => { if (!v) setDevolverAtiv(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={`font-display text-lg ${isRejectingAtiv ? 'text-orange-500' : 'text-primary'}`}>
              {isRejectingAtiv ? 'Rejeitar Atividade' : 'Devolver Atividade'}
            </DialogTitle>
            <DialogDescription>
              {isRejectingAtiv ? 'Informe o motivo da rejeição desta atividade.' : 'Informe o motivo da devolução para correção.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={devolverAtivMotivo}
            onChange={(e) => setDevolverAtivMotivo(e.target.value)}
            placeholder="Motivo obrigatório..."
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDevolverAtiv(null)}>Cancelar</Button>
            <Button
              variant={isRejectingAtiv ? 'destructive' : 'default'}
              className="gap-1.5"
              disabled={!devolverAtivMotivo.trim() || savingAtiv}
              onClick={async () => {
                if (!devolverAtiv || !devolverAtivMotivo.trim()) return;
                setSavingAtiv(true);
                try {
                  const status = isRejectingAtiv ? 'rejeitado' : 'devolvido';
                  const { error } = await supabase.from('atividades')
                    .update({ status, motivo_recusa: devolverAtivMotivo.trim() } as any)
                    .eq('id', devolverAtiv.id);
                  if (error) throw error;
                  toast.success(`Atividade ${isRejectingAtiv ? 'rejeitada' : 'devolvida'} com sucesso!`);
                  dispatchNotification(
                    isRejectingAtiv ? 'atividade_rejeitada' : 'atividade_devolvida',
                    devolverAtiv.user_id,
                    isRejectingAtiv ? 'Atividade Rejeitada' : 'Atividade Devolvida',
                    `Sua atividade de ${devolverAtiv.data} foi ${isRejectingAtiv ? 'rejeitada' : 'devolvida'}: ${devolverAtivMotivo.trim()}`,
                    'atividade', '/minhas-acoes'
                  );
                  queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
                  queryClient.invalidateQueries({ queryKey: ['atividades'] });
                  setDevolverAtiv(null);
                } catch (err: any) { toast.error(err.message); }
                finally { setSavingAtiv(false); }
              }}
            >
              {isRejectingAtiv ? <><XCircle className="w-4 h-4" /> Rejeitar</> : <><Undo2 className="w-4 h-4" /> Devolver</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Devolver Venda Dialog ── */}
      <Dialog open={!!devolverVenda} onOpenChange={(v) => { if (!v) setDevolverVenda(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={`font-display text-lg ${isRejectingVenda ? 'text-orange-500' : 'text-primary'}`}>
              {isRejectingVenda ? 'Rejeitar Venda' : 'Devolver Venda'}
            </DialogTitle>
            <DialogDescription>
              {isRejectingVenda ? 'Informe o motivo da rejeição desta venda.' : 'Informe o motivo da devolução para correção.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={devolverVendaMotivo}
            onChange={(e) => setDevolverVendaMotivo(e.target.value)}
            placeholder="Motivo obrigatório..."
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDevolverVenda(null)}>Cancelar</Button>
            <Button
              variant={isRejectingVenda ? 'destructive' : 'default'}
              className="gap-1.5"
              disabled={!devolverVendaMotivo.trim()}
              onClick={async () => {
                if (!devolverVenda || !devolverVendaMotivo.trim()) return;
                try {
                  const status = isRejectingVenda ? 'rejeitado' : 'devolvido';
                  await updateStatus.mutateAsync({ id: devolverVenda.id, status, observacoes: devolverVenda.observacoes, motivo_recusa: devolverVendaMotivo.trim() });
                  toast.success(`Venda ${isRejectingVenda ? 'rejeitada' : 'devolvida'}!`);
                  dispatchNotification(
                    'venda_devolvida',
                    devolverVenda.user_id,
                    isRejectingVenda ? 'Venda Rejeitada' : 'Venda Devolvida',
                    `Sua venda de "${devolverVenda.nome_titular}" foi ${isRejectingVenda ? 'rejeitada' : 'devolvida'}: ${devolverVendaMotivo.trim()}`,
                    'venda', '/minhas-acoes'
                  );
                  setDevolverVenda(null);
                } catch (err: any) { toast.error(err.message); }
              }}
            >
              {isRejectingVenda ? <><XCircle className="w-4 h-4" /> Rejeitar</> : <><Undo2 className="w-4 h-4" /> Devolver</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Atividade ── */}
      <Dialog open={!!confirmDeleteAtiv} onOpenChange={(v) => { if (!v) setConfirmDeleteAtiv(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Atividade</DialogTitle>
            <DialogDescription>Esta ação é irreversível. A atividade será permanentemente removida.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteAtiv(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deletingAtiv} className="gap-1.5" onClick={async () => {
              if (!confirmDeleteAtiv) return;
              setDeletingAtiv(true);
              try {
                const { error, data } = await supabase.from('atividades').delete().eq('id', confirmDeleteAtiv.id).select();
                if (error) throw error;
                if (!data || data.length === 0) throw new Error('Sem permissão para excluir.');
                toast.success('Atividade excluída!');
                queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
                setConfirmDeleteAtiv(null);
              } catch (err: any) { toast.error(err.message); }
              finally { setDeletingAtiv(false); }
            }}>
              {deletingAtiv ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Venda ── */}
      <Dialog open={!!confirmDeleteVenda} onOpenChange={(v) => { if (!v) setConfirmDeleteVenda(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Venda</DialogTitle>
            <DialogDescription>Esta ação é irreversível. A venda será permanentemente removida.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteVenda(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deletingVenda} className="gap-1.5" onClick={async () => {
              if (!confirmDeleteVenda) return;
              setDeletingVenda(true);
              try {
                const { error, data } = await supabase.from('vendas').delete().eq('id', confirmDeleteVenda.id).select();
                if (error) throw error;
                if (!data || data.length === 0) throw new Error('Sem permissão para excluir.');
                toast.success('Venda excluída!');
                queryClient.invalidateQueries({ queryKey: ['team-vendas'] });
                setConfirmDeleteVenda(null);
              } catch (err: any) { toast.error(err.message); }
              finally { setDeletingVenda(false); }
            }}>
              {deletingVenda ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View MFA Reset Dialog (Analisar) ── */}
      <Dialog open={!!viewMfaReq} onOpenChange={(v) => { if (!v) setViewMfaReq(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Analisar Reset MFA</DialogTitle>
            <DialogDescription>Detalhes completos da solicitação de reset de MFA.</DialogDescription>
          </DialogHeader>
          {viewMfaReq && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Usuário</span><p className="font-semibold mt-0.5">{getConsultorName(viewMfaReq.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Status</span><p className="font-semibold mt-0.5">{statusLabel[viewMfaReq.status] || viewMfaReq.status}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Solicitado em</span><p className="font-semibold mt-0.5">{new Date(viewMfaReq.created_at).toLocaleString('pt-BR')}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">ID</span><p className="font-semibold mt-0.5 font-mono text-xs">{viewMfaReq.id.slice(0, 12)}...</p></div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Motivo</p>
                <p className="text-sm whitespace-pre-wrap">{viewMfaReq.motivo}</p>
              </div>
              {viewMfaReq.admin_resposta && (
                <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                  <p className="text-[10px] text-destructive uppercase font-semibold mb-1">Resposta do Aprovador</p>
                  <p className="text-sm whitespace-pre-wrap">{viewMfaReq.admin_resposta}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap pt-2">
                {viewMfaReq.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_admin_mfa', 'aprovar') && (
                  <>
                    <Button onClick={async () => {
                      setSavingMfaReset(true);
                      try {
                        const { user } = (await supabase.auth.getUser()).data;
                        await approveMfaReset(viewMfaReq.id, user!.id);
                        toast.success('MFA resetado! O usuário verá o QR Code no próximo login.');
                        dispatchNotification('mfa_resetado', viewMfaReq.user_id, 'MFA Resetado', 'Seu MFA foi resetado. Configure novamente no próximo login.', 'mfa', '/');
                        queryClient.invalidateQueries({ queryKey: ['mfa-reset-requests'] });
                        setViewMfaReq(null);
                      } catch (err: any) { toast.error(err.message); }
                      finally { setSavingMfaReset(false); }
                    }} disabled={savingMfaReset} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                      <CheckCircle2 className="w-5 h-5" /> Aprovar
                    </Button>
                    <Button onClick={() => { setRejectMfaReq(viewMfaReq); setRejectMfaReason(''); setViewMfaReq(null); }} variant="outline" className="flex-1 font-semibold gap-1.5 border-orange-500 text-orange-500 hover:bg-orange-500/10" size="lg">
                      <XCircle className="w-5 h-5" /> Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Password Reset Dialog (Analisar) ── */}
      <Dialog open={!!viewPwdReq} onOpenChange={(v) => { if (!v) setViewPwdReq(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Analisar Reset de Senha</DialogTitle>
            <DialogDescription>Detalhes completos da solicitação de troca de senha.</DialogDescription>
          </DialogHeader>
          {viewPwdReq && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Usuário</span><p className="font-semibold mt-0.5">{viewPwdReq.profiles?.nome_completo || getConsultorName(viewPwdReq.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Status</span><p className="font-semibold mt-0.5">{statusLabel[viewPwdReq.status] || viewPwdReq.status}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Solicitado em</span><p className="font-semibold mt-0.5">{new Date(viewPwdReq.requested_at).toLocaleString('pt-BR')}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">ID</span><p className="font-semibold mt-0.5 font-mono text-xs">{viewPwdReq.id.slice(0, 12)}...</p></div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Motivo</p>
                <p className="text-sm whitespace-pre-wrap">{viewPwdReq.motivo}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Nova Senha Solicitada</p>
                  <p className="text-sm text-foreground font-mono">•••••••• (Criptografada)</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap pt-2">
                {viewPwdReq.status === 'pendente' && hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'aprovar') && (
                  <>
                    <Button onClick={async () => {
                      setSavingPwdReset(true);
                      try {
                        await resolvePasswordResetRequest(viewPwdReq.id, 'aprovado');
                        toast.success('Senha atualizada com sucesso!');
                        dispatchNotification('senha_resetada', viewPwdReq.user_id, 'Senha Atualizada', 'Sua nova senha foi aprovada e já pode ser utilizada.', 'seguranca', '/');
                        queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
                        setViewPwdReq(null);
                      } catch (err: any) { toast.error(err.message); }
                      finally { setSavingPwdReset(false); }
                    }} disabled={savingPwdReset} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg">
                      <CheckCircle2 className="w-5 h-5" /> Aprovar e Aplicar
                    </Button>
                    <Button onClick={async () => {
                      setSavingPwdReset(true);
                      try {
                        const { error } = await supabase.from('password_reset_requests' as any).update({ status: 'devolvido' } as any).eq('id', viewPwdReq.id);
                        if (error) throw error;
                        toast.success('Solicitação devolvida ao usuário.');
                        dispatchNotification('senha_devolvida', viewPwdReq.user_id, 'Solicitação Devolvida', 'Sua solicitação de reset de senha foi devolvida para revisão.', 'seguranca', '/');
                        queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
                        setViewPwdReq(null);
                      } catch (err: any) { toast.error(err.message); }
                      finally { setSavingPwdReset(false); }
                    }} disabled={savingPwdReset} variant="outline" className="flex-1 font-semibold gap-1.5 border-primary text-primary hover:bg-primary/10" size="lg">
                      <Undo2 className="w-5 h-5" /> Devolver
                    </Button>
                    <Button onClick={() => { setRejectPwdReq(viewPwdReq); setRejectPwdReason(''); setViewPwdReq(null); }} variant="outline" className="flex-1 font-semibold gap-1.5 border-orange-500 text-orange-500 hover:bg-orange-500/10" size="lg">
                      <XCircle className="w-5 h-5" /> Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Action Motivo Confirmation Modal ── */}
      <Dialog open={!!bulkActionType && (bulkActionType === 'devolver' || bulkActionType === 'rejeitar' || bulkActionType === 'excluir' || bulkActionType === 'aprovar')} onOpenChange={(v) => { if (!v) { setBulkActionType(null); setBulkMotivo(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={`font-display text-lg ${bulkActionType === 'excluir' ? 'text-destructive' : bulkActionType === 'rejeitar' ? 'text-orange-500' : bulkActionType === 'devolver' ? 'text-primary' : 'text-success'}`}>
              {bulkActionType === 'aprovar' ? 'Aprovar Selecionados' : bulkActionType === 'devolver' ? 'Devolver Selecionados' : bulkActionType === 'rejeitar' ? 'Rejeitar Selecionados' : 'Excluir Selecionados'}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === 'excluir'
                ? `Tem certeza que deseja excluir ${selectedItems.size} registro(s)? Esta ação é irreversível.`
                : bulkActionType === 'aprovar'
                  ? `Aprovar ${selectedItems.size} registro(s) selecionados?`
                  : `Informe o motivo para ${bulkActionType === 'devolver' ? 'devolver' : 'rejeitar'} ${selectedItems.size} registro(s).`}
            </DialogDescription>
          </DialogHeader>
          {(bulkActionType === 'devolver' || bulkActionType === 'rejeitar') && (
            <Textarea
              value={bulkMotivo}
              onChange={(e) => setBulkMotivo(e.target.value)}
              placeholder="Motivo obrigatório..."
              rows={3}
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBulkActionType(null); setBulkMotivo(''); }}>Cancelar</Button>
            <Button
              variant={bulkActionType === 'excluir' || bulkActionType === 'rejeitar' ? 'destructive' : 'default'}
              disabled={isProcessingBulk || ((bulkActionType === 'devolver' || bulkActionType === 'rejeitar') && !bulkMotivo.trim())}
              onClick={handleBulkActionExecute}
              className="gap-1.5"
            >
              {isProcessingBulk ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                bulkActionType === 'aprovar' ? <><CheckCircle2 className="w-4 h-4" /> Confirmar Aprovação</> :
                bulkActionType === 'devolver' ? <><Undo2 className="w-4 h-4" /> Confirmar Devolução</> :
                bulkActionType === 'rejeitar' ? <><XCircle className="w-4 h-4" /> Confirmar Rejeição</> :
                <><Trash2 className="w-4 h-4" /> Confirmar Exclusão</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Aprovacoes;
