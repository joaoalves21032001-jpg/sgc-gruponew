import { useState, useMemo } from 'react';
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
  Download, FileText, MessageSquareQuote, GitCompareArrows
} from 'lucide-react';
import { useCompanhias, useProdutos, useModalidades } from '@/hooks/useInventario';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { maskPhone } from '@/lib/masks';
import { notifySelf, notifyGlobalLeaders, notifyDirectLeadership } from '@/hooks/useNotifications';

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
  supervisor_id: string | null; gerente_id: string | null;
  data_admissao: string | null; data_nascimento: string | null;
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
  solicitado: 'Solicitado',
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
  });
}

/* ─── Venda Detail Dialog with docs ─── */
function VendaDetailDialog({ venda, onClose, getConsultorName, justificativa, setJustificativa, onAction }: {
  venda: Venda | null; onClose: () => void; getConsultorName: (id: string) => string;
  justificativa: string; setJustificativa: (v: string) => void;
  onAction: (v: Venda, action: 'aprovado' | 'devolvido') => void;
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
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Justificativa da Devolução <span className="text-destructive">*</span></label>
              <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Obrigatório para devolver..." rows={3} className="border-border/40" /></div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => onAction(venda, 'aprovado')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5" size="lg"><CheckCircle2 className="w-5 h-5" /> Aprovar</Button>
              <Button onClick={() => onAction(venda, 'devolvido')} variant="outline" className="flex-1 font-semibold gap-1.5 border-primary text-primary hover:bg-primary/10" size="lg"><Undo2 className="w-5 h-5" /> Devolver</Button>
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
  const { data: vendas = [], isLoading: loadingVendas } = useTeamVendas();
  const { data: atividades = [], isLoading: loadingAtiv } = useTeamAtividades();
  const { data: accessRequests = [], isLoading: loadingAccess } = useAccessRequests();
  const { data: cotacoes = [], isLoading: loadingCotacoes } = useCotacoes();
  const updateStatus = useUpdateVendaStatus();
  const queryClient = useQueryClient();
  const logAction = useLogAction();

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

  const filteredCotacoes = cotacoes.filter(c => {
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
        notifySelf(cotacao.consultor_recomendado_id, 'Novo Lead Atribuído', `A cotação de "${cotacao.nome}" foi aprovada e um lead foi criado para você.`, 'cotacao', '/crm');
      } else {
        notifyGlobalLeaders('', 'Cotação Aprovada — Lead Livre', `A cotação de "${cotacao.nome}" foi aprovada como lead livre.`, 'cotacao', '/crm');
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
        notifySelf(rejectCotacao.consultor_recomendado_id, 'Cotação Recusada', `A cotação de "${rejectCotacao.nome}" foi recusada: ${rejectCotacaoReason.trim()}`, 'cotacao', '/aprovacoes');
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
      const finalObs = action === 'devolvido' ? justificativa.trim() : obs;
      await updateStatus.mutateAsync({ id: venda.id, status: action, observacoes: finalObs });
      toast.success(`Venda ${action === 'aprovado' ? 'aprovada' : 'devolvida'} com sucesso!`);
      logAction(action === 'aprovado' ? 'aprovar_venda' : 'devolver_venda', 'venda', venda.id, { nome_titular: venda.nome_titular });
      // Notify the consultant
      if (action === 'devolvido') {
        notifySelf(venda.user_id, 'Venda Devolvida', `Sua venda de "${venda.nome_titular}" foi devolvida: ${justificativa.trim()}`, 'venda', '/minhas-acoes');
      } else {
        notifySelf(venda.user_id, 'Venda Aprovada', `Sua venda de "${venda.nome_titular}" foi aprovada!`, 'venda', '/minhas-acoes');
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
      const { error } = await supabase.from('atividades')
        .update({ status: action } as any)
        .eq('id', ativ.id);
      if (error) throw error;
      toast.success(`Atividade ${action === 'aprovado' ? 'aprovada' : 'devolvida'} com sucesso!`);
      logAction(action === 'aprovado' ? 'aprovar_atividade' : 'devolver_atividade', 'atividade', ativ.id, { user_id: ativ.user_id, data: ativ.data });
      // Notify the consultant
      if (action === 'devolvido') {
        notifySelf(ativ.user_id, 'Atividade Devolvida', `Sua atividade de ${ativ.data} foi devolvida: ${ativJustificativa.trim()}`, 'atividade', '/minhas-acoes');
      } else {
        notifySelf(ativ.user_id, 'Atividade Aprovada', `Sua atividade de ${ativ.data} foi aprovada!`, 'atividade', '/minhas-acoes');
      }
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
      // 1. Check for existing ACTIVE user with same email
      const { data: existing } = await supabase.from('profiles').select('id, disabled').eq('email', req.email).maybeSingle();
      if (existing && !existing.disabled) {
        toast.error(`Já existe usuário ativo com e-mail ${req.email}.`);
        setSavingAccess(false);
        return;
      }
      if (req.cpf) {
        const { data: cpfCheck } = await supabase.from('profiles').select('id').eq('cpf', req.cpf).maybeSingle();
        if (cpfCheck) { toast.error(`Já existe usuário com CPF ${req.cpf}.`); setSavingAccess(false); return; }
      }

      let userId: string;

      if (existing && existing.disabled) {
        // Reuse existing disabled profile
        userId = existing.id;
      } else {
        // Create auth user via signUp (doesn't require admin privileges)
        // Generate a secure random password — user will use "Forgot Password" to set their own
        const tempPassword = crypto.randomUUID() + 'A1!';
        const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
          email: req.email,
          password: tempPassword,
          options: {
            data: { full_name: req.nome },
          },
        });
        if (signUpError) {
          // If already exists in auth, try to find profile
          if (signUpError.message?.includes('already') || signUpError.message?.includes('User already registered')) {
            const { data: existProfile } = await supabase.from('profiles').select('id').eq('email', req.email).maybeSingle();
            if (existProfile) {
              userId = existProfile.id;
            } else {
              throw new Error(`Erro ao criar usuário: ${signUpError.message}`);
            }
          } else {
            throw new Error(`Erro ao criar usuário: ${signUpError.message}`);
          }
        } else if (signUpResult?.user) {
          userId = signUpResult.user.id;
        } else {
          throw new Error('Erro desconhecido ao criar usuário.');
        }
      }

      // 2. Wait a moment for the profile trigger to create the row (if new user)
      if (!existing) {
        await new Promise(r => setTimeout(r, 1500));
      }

      // 3. Check if profile already has a codigo
      const { data: currentProfile } = await supabase.from('profiles').select('codigo, disabled').eq('id', userId).maybeSingle();

      let nextCode = currentProfile?.codigo || null;

      // Only generate a new codigo if the profile doesn't have one yet
      if (!nextCode) {
        // Get all existing GN codes to find the max
        const { data: allCodes } = await supabase
          .from('profiles')
          .select('codigo')
          .not('codigo', 'is', null)
          .like('codigo', 'GN%')
          .order('codigo', { ascending: false })
          .limit(10);

        let maxNum = 0;
        if (allCodes) {
          for (const row of allCodes) {
            const match = row.codigo?.match(/^GN(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        nextCode = `GN${String(maxNum + 1).padStart(3, '0')}`;
      }

      // 4. Update profile with full data and ENABLE user
      const profilePayload: any = {
        nome_completo: req.nome,
        apelido: req.nome.split(' ')[0],
        celular: req.telefone || null,
        cpf: req.cpf || null,
        rg: req.rg || null,
        endereco: req.endereco || null,
        cargo: req.cargo || 'Consultor de Vendas',
        codigo: nextCode,
        supervisor_id: req.supervisor_id || null,
        gerente_id: req.gerente_id || null,
        numero_emergencia_1: req.numero_emergencia_1 || null,
        numero_emergencia_2: req.numero_emergencia_2 || null,
        data_admissao: req.data_admissao || null,
        data_nascimento: req.data_nascimento || null,
        disabled: false,
      };

      const { error: profileError } = await supabase.from('profiles').update(profilePayload).eq('id', userId);

      if (profileError) {
        // If codigo conflict, retry without setting codigo (keep existing)
        if (profileError.message?.includes('profiles_codigo_key')) {
          const { codigo, ...payloadWithoutCodigo } = profilePayload;
          const { error: retryError } = await supabase.from('profiles').update(payloadWithoutCodigo as any).eq('id', userId);
          if (retryError) throw new Error(`Erro ao atualizar perfil: ${retryError.message}`);
          // Fetch the actual codigo for the success message
          const { data: finalProfile } = await supabase.from('profiles').select('codigo').eq('id', userId).maybeSingle();
          nextCode = finalProfile?.codigo || nextCode;
        } else {
          throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
        }
      }

      // 4. Update role if not default 'consultor'
      const role = req.nivel_acesso || 'consultor';
      if (role !== 'consultor') {
        await supabase.from('user_roles').update({ role } as any).eq('user_id', userId);
      }

      // 5. Mark access request as approved
      const { error } = await supabase.from('access_requests').update({ status: 'aprovado' } as any).eq('id', req.id);
      if (error) throw error;

      toast.success(`Acesso aprovado e usuário criado para ${req.nome}! (Código: ${nextCode})`);
      logAction('aprovar_acesso', 'access_request', req.id, { nome: req.nome, email: req.email, codigo: nextCode });
      // Notify the new user that their access was approved
      if (userId) {
        notifySelf(userId, 'Acesso Aprovado', `Bem-vindo(a) ${req.nome}! Seu acesso ao sistema foi aprovado. Seu código é ${nextCode}.`, 'acesso', '/meu-progresso');
      }
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
    } catch (err: any) {
      console.error('Erro ao aprovar acesso:', err);
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
      try {
        await supabase.functions.invoke('send-notification', {
          body: { type: 'acesso_negado', data: { nome: rejectAccess.nome, email: rejectAccess.email, motivo: rejectReason.trim() } },
        });
      } catch (e) { console.error('Email error:', e); }
      logAction('rejeitar_acesso', 'access_request', rejectAccess.id, { nome: rejectAccess.nome, email: rejectAccess.email });
      // Notify leadership about the rejection for awareness
      notifyGlobalLeaders('', 'Solicitação de Acesso Recusada', `A solicitação de acesso de "${rejectAccess.nome}" (${rejectAccess.email}) foi recusada.`, 'acesso', '/aprovacoes');
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
  const handleApproveCR = async (cr: CorrectionRequest) => {
    setSavingCR(true);
    try {
      const payload = JSON.parse(cr.motivo);
      const alteracoes = payload.alteracoesPropostas || [];
      const updateObj: Record<string, any> = {};
      // Valid columns per table to avoid schema errors
      const ativCols = ['ligacoes', 'mensagens', 'cotacoes_enviadas', 'cotacoes_fechadas', 'follow_up', 'data', 'observacoes'];
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
      notifySelf(cr.user_id, 'Alteração Aprovada', `Sua solicitação de alteração de ${cr.tipo} foi aprovada e aplicada.`, cr.tipo, '/minhas-acoes');
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
      // Notify the consultant that their change request was rejected
      notifySelf(rejectCR.user_id, 'Alteração Recusada', `Sua solicitação de alteração de ${rejectCR.tipo} foi recusada: ${rejectCRReason.trim()}`, rejectCR.tipo, '/minhas-acoes');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      setRejectCR(null);
      setRejectCRReason('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingCR(false); }
  };

  // Filtered correction requests
  const filteredCR = useMemo(() => {
    return correctionRequests.filter(cr => {
      if (filterStatus !== 'todos' && cr.status !== filterStatus) return false;
      if (filterConsultor !== 'todos' && cr.user_id !== filterConsultor) return false;
      if (search) {
        const consultorName = getConsultorName(cr.user_id).toLowerCase();
        if (!consultorName.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [correctionRequests, filterStatus, filterConsultor, search, getConsultorName]);

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
          {isSupervisorUp && (
            <TabsTrigger value="acesso" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
              <UserPlus className="w-4 h-4" /> Acesso ({filteredAccess.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="alteracoes" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <GitCompareArrows className="w-4 h-4" /> Alterações ({filteredCR.length})
          </TabsTrigger>
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
                          <span>Cot.NResp: <strong>{(a as any).cotacoes_nao_respondidas ?? 0}</strong></span>
                          <span>Follow: <strong>{a.follow_up}</strong></span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleDateString('pt-BR')} — ID: {a.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {(ativStatus === 'pendente') && (
                          <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => { setSelectedAtiv(a); setAtivJustificativa(''); }}>
                            <Eye className="w-4 h-4" /> Analisar
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={async () => {
                            if (!confirm('Excluir esta atividade?')) return;
                            try {
                              const { error } = await supabase.from('atividades').delete().eq('id', a.id);
                              if (error) throw error;
                              toast.success('Atividade excluída!');
                              queryClient.invalidateQueries({ queryKey: ['team-atividades'] });
                            } catch (err: any) { toast.error(err.message); }
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
                          {v.valor && <><span>•</span><span>R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>}
                          <span>•</span>
                          <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">ID: {v.id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {isPending && (
                          <Button size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={() => { setSelectedVenda(v); setObs(v.observacoes || ''); setJustificativa(''); }}>
                            <Eye className="w-4 h-4" /> Analisar
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={async () => {
                            if (!confirm('Excluir esta venda?')) return;
                            try {
                              const { error } = await supabase.from('vendas').delete().eq('id', v.id);
                              if (error) throw error;
                              toast.success('Venda excluída!');
                              queryClient.invalidateQueries({ queryKey: ['team-vendas'] });
                            } catch (err: any) { toast.error(err.message); }
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
                  <div key={c.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
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
                      <div className="flex gap-1.5 shrink-0">
                        {c.status === 'pendente' && (
                          <>
                            <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground font-semibold" onClick={() => handleApproveCotacao(c)} disabled={savingCotacao}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1 font-semibold" onClick={() => { setRejectCotacao(c); setRejectCotacaoReason(''); }}>
                              <XCircle className="w-3.5 h-3.5" /> Recusar
                            </Button>
                          </>
                        )}
                        {isAdmin && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1 font-semibold" onClick={() => openEditCotacao(c)}>
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteCotacao(c)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
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
        {isSupervisorUp && (
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
                              <Button size="sm" variant="outline" className="gap-1 font-semibold" onClick={() => openEditAccess(req)}>
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </Button>
                              <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground font-semibold" onClick={() => handleApproveAccess(req)} disabled={savingAccess}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 font-semibold" onClick={() => { setRejectAccess(req); setRejectReason(''); }} disabled={savingAccess}>
                                <XCircle className="w-3.5 h-3.5" /> Recusar
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteAccess(req)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

        {/* ── Alterações Tab ── */}
        <TabsContent value="alteracoes">
          <div className="grid gap-3">
            {loadingCR ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredCR.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <GitCompareArrows className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de alteração encontrada.
              </div>
            ) : (
              filteredCR.map((cr) => {
                const sc = statusColors[cr.status] || statusColors.pendente;
                let parsed: any = {};
                try { parsed = JSON.parse(cr.motivo); } catch { }
                const alteracoes = parsed.alteracoesPropostas || [];
                return (
                  <div key={cr.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{getConsultorName(cr.user_id)}</p>
                          <Badge variant="outline" className={`text-[10px] ${sc}`}>{statusLabel[cr.status] || cr.status}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase bg-muted/40">{cr.tipo}</Badge>
                          <Badge variant="outline" className="text-[10px]">📅 {new Date(cr.created_at).toLocaleDateString('pt-BR')}</Badge>
                        </div>
                        {parsed.justificativa && <p className="text-xs text-muted-foreground mt-1 italic">📝 {parsed.justificativa}</p>}
                        <div className="mt-2 space-y-1">
                          {alteracoes.map((a: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground font-medium">{a.campo}:</span>
                              <span className="text-destructive line-through">{String(a.valorAntigo)}</span>
                              <span>→</span>
                              <span className="text-primary font-semibold">{String(a.valorNovo)}</span>
                            </div>
                          ))}
                        </div>
                        {cr.admin_resposta && <p className="text-xs text-muted-foreground mt-1">Resposta: {cr.admin_resposta}</p>}
                      </div>
                      {cr.status === 'pendente' && (
                        <div className="flex gap-1.5 shrink-0">
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleApproveCR(cr)} disabled={savingCR}>
                            <CheckCircle2 className="w-3 h-3" /> Aprovar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive" onClick={() => { setRejectCR(cr); setRejectCRReason(''); }}>
                            <XCircle className="w-3 h-3" /> Recusar
                          </Button>
                        </div>
                      )}
                      {isAdmin && (
                        <Button size="icon" variant="outline" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={async () => {
                          if (!confirm('Excluir esta solicitação de alteração?')) return;
                          try {
                            const { error } = await supabase.from('correction_requests').delete().eq('id', cr.id);
                            if (error) throw error;
                            toast.success('Solicitação excluída!');
                            queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
                          } catch (err: any) { toast.error(err.message); }
                        }}>
                          <Trash2 className="w-3 h-3" />
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
        onClose={() => setSelectedVenda(null)}
        getConsultorName={getConsultorName}
        justificativa={justificativa}
        setJustificativa={setJustificativa}
        onAction={handleVendaAction}
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
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Supervisor</span><p className="font-semibold mt-0.5">{viewAccess.supervisor_id ? (profiles.find(p => p.id === viewAccess.supervisor_id)?.nome_completo || viewAccess.supervisor_id.slice(0, 8)) : 'Nenhum'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Gerente</span><p className="font-semibold mt-0.5">{viewAccess.gerente_id ? (profiles.find(p => p.id === viewAccess.gerente_id)?.nome_completo || viewAccess.gerente_id.slice(0, 8)) : '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Data de Nascimento</span><p className="font-semibold mt-0.5">{viewAccess.data_nascimento ? new Date(viewAccess.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase font-semibold">Data de Admissão</span><p className="font-semibold mt-0.5">{viewAccess.data_admissao ? new Date(viewAccess.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
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
            <DialogTitle className="font-display text-lg text-destructive">Recusar Cotação</DialogTitle>
            <DialogDescription>Informe o motivo da recusa para a cotação de {rejectCotacao?.nome}.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectCotacaoReason} onChange={(e) => setRejectCotacaoReason(e.target.value)} placeholder="Motivo da recusa (obrigatório)..." rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectCotacao(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectCotacao} disabled={savingCotacao} className="gap-1">
              {savingCotacao ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><XCircle className="w-4 h-4" /> Recusar</>}
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
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nome <span className="text-destructive">*</span></label>
                <Input value={editAccessForm.nome || ''} onChange={e => setEditAccessForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">E-mail <span className="text-destructive">*</span></label>
                <Input value={editAccessForm.email || ''} onChange={e => setEditAccessForm(p => ({ ...p, email: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
                <Input value={editAccessForm.telefone || ''} onChange={e => setEditAccessForm(p => ({ ...p, telefone: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">CPF</label>
                <Input value={editAccessForm.cpf || ''} onChange={e => setEditAccessForm(p => ({ ...p, cpf: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">RG</label>
                <Input value={editAccessForm.rg || ''} onChange={e => setEditAccessForm(p => ({ ...p, rg: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Cargo</label>
                <Input value={editAccessForm.cargo || ''} onChange={e => setEditAccessForm(p => ({ ...p, cargo: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Endereço</label>
              <Input value={editAccessForm.endereco || ''} onChange={e => setEditAccessForm(p => ({ ...p, endereco: e.target.value }))} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nível de Acesso</label>
                <Select value={editAccessForm.nivel_acesso || 'consultor'} onValueChange={v => setEditAccessForm(p => ({ ...p, nivel_acesso: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Supervisor</label>
                <Select value={editAccessForm.supervisor_id || '__none__'} onValueChange={v => setEditAccessForm(p => ({ ...p, supervisor_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_completo || p.apelido}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Gerente</label>
                <Select value={editAccessForm.gerente_id || '__none__'} onValueChange={v => setEditAccessForm(p => ({ ...p, gerente_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_completo || p.apelido}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Data de Nascimento</label>
                <Input type="date" value={editAccessForm.data_nascimento || ''} onChange={e => setEditAccessForm(p => ({ ...p, data_nascimento: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Data de Admissão</label>
                <Input type="date" value={editAccessForm.data_admissao || ''} onChange={e => setEditAccessForm(p => ({ ...p, data_admissao: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Emergência 1</label>
                <Input value={editAccessForm.numero_emergencia_1 || ''} onChange={e => setEditAccessForm(p => ({ ...p, numero_emergencia_1: maskPhone(e.target.value) }))} className="h-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Emergência 2</label>
              <Input value={editAccessForm.numero_emergencia_2 || ''} onChange={e => setEditAccessForm(p => ({ ...p, numero_emergencia_2: maskPhone(e.target.value) }))} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Mensagem</label>
              <Textarea value={editAccessForm.mensagem || ''} onChange={e => setEditAccessForm(p => ({ ...p, mensagem: e.target.value }))} rows={3} />
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
    </div>
  );
};

export default Aprovacoes;

