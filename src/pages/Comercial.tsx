import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isToday, parse, isValid, parseISO, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, Info, Save, Send,
  ChevronRight, ChevronLeft, AlertCircle, CalendarIcon, DollarSign,
  ClipboardList, ShoppingCart, Trash2, Plus, Calculator,
  Mail, User, XCircle, MessageCircle, BarChart3, Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProfile, useSupervisorProfile, useGerenteProfile, useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useCreateAtividade, useMyAtividades } from '@/hooks/useAtividades';
import { useLeads } from '@/hooks/useInventario';
import { useCreateVenda, useMyVendas, uploadVendaDocumento } from '@/hooks/useVendas';
import { useSubmitCorrectionRequest } from '@/hooks/useCorrectionRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { maskPhone } from '@/lib/masks';
import { supabase } from '@/integrations/supabase/client';
import { dispatchNotification } from '@/hooks/useNotificationRules';
import { useMyPermissions, hasPermission } from '@/hooks/useSecurityProfiles';
import { useMyCargoPermissions, hasCargoPermission } from '@/hooks/useCargos';
import { getDailyFraseMotivacional, getPerformanceTierInfo } from '@/lib/gamification';
import confetti from 'canvas-confetti';

/* ─── Shared Components ─── */
function FieldWithTooltip({ label, tooltip, required, children }: { label: string; tooltip: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
        {required && <span className="text-destructive text-xs font-bold">*</span>}
        <Tooltip>
          <TooltipTrigger tabIndex={-1}>
            <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-primary transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground font-display">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}



/* ═══════════════════════════════════════════════ */
/*              TAB: ATIVIDADES                    */
/* ═══════════════════════════════════════════════ */

interface AtividadesForm {
  ligacoes: string;
  mensagens: string;
  cotacoes_realizadas: string;
  cotacoes_enviadas: string;
  cotacoes_respondidas: string;
  cotacoes_nao_respondidas: string;
  follow_up: string; // Agendado (readonly display)
  follow_up_realizado: string; // Manual input
  justificativa: string; // Cenários A + retroativo
  justificativa_nao_resposta: string; // Cenário B
  justificativa_atraso: string; // Cenário C
  justificativa_baixa_resposta: string; // Cenário D
}

function calcRate(a: string, b: string): string {
  const numA = parseInt(a) || 0;
  const numB = parseInt(b) || 0;
  if (numA === 0) return '0.0%';
  return `${((numB / numA) * 100).toFixed(1)}%`;
}

function AtividadesTab({ editAtividade }: { editAtividade?: any }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const { data: gerente } = useGerenteProfile(profile?.gerente_id);
  const { data: allProfiles = [] } = useTeamProfiles();

  // Prefer FK-joined data from profile, fallback to separate hooks, then allProfiles
  const resolvedSupervisor = (profile as any)?._supervisor || supervisor || (profile?.supervisor_id ? allProfiles.find(p => p.id === profile.supervisor_id) : null);
  const resolvedGerente = (profile as any)?._gerente || gerente || (profile?.gerente_id ? allProfiles.find(p => p.id === profile.gerente_id) : null);
  const { data: myAtividades } = useMyAtividades();
  const { data: leads } = useLeads();
  
  const followUpAgendado = useMemo(() => {
    if (!leads || !user) return 0;
    return leads.filter((l: any) => {
      if (l.created_by !== user.id) return false;
      // Excluir leads em estágios finais (RN-03)
      const stage = l._stage_name?.toLowerCase() || '';
      if (stage.includes('venda realizada') || stage.includes('implantada')) return false;

      if (!l.tempo_follow_up_dias || !l.data_ultimo_contato) return false;
      const lastContact = parseISO(l.data_ultimo_contato);
      const dueDate = addDays(lastContact, l.tempo_follow_up_dias);
      return isPast(dueDate);
    }).length;
  }, [leads, user]);

  const { data: myVendas } = useMyVendas();
  const createAtividade = useCreateAtividade();
  const logAction = useLogAction();
  const navigate = useNavigate();
  const { data: myPermissions } = useMyPermissions();
  const { data: cargoPermissions } = useMyCargoPermissions();
  const canEdit = hasPermission(myPermissions, 'atividades', 'edit') && hasCargoPermission(cargoPermissions, 'atividades.atividades', 'edit');
  const submitCR = useSubmitCorrectionRequest();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [changeJustificativa, setChangeJustificativa] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Session Storage key (per-user draft, not for edit mode) ──
  const DRAFT_KEY = `atividades_draft_${user?.id ?? 'anon'}`;

  const getInitialForm = (): AtividadesForm => {
    if (!editAtividade) {
      try {
        const saved = sessionStorage.getItem(DRAFT_KEY);
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return { ligacoes: '', mensagens: '', cotacoes_realizadas: '', cotacoes_enviadas: '',
      cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', follow_up_realizado: '', justificativa: '', justificativa_nao_resposta: '', justificativa_atraso: '' };
  };

  const [form, setForm] = useState<AtividadesForm>(getInitialForm);
  const [dataLancamento, setDataLancamento] = useState<Date>(() => {
    if (!editAtividade) {
      try {
        const saved = sessionStorage.getItem(`${DRAFT_KEY}_date`);
        if (saved) return new Date(saved);
      } catch { /* ignore */ }
    }
    return new Date();
  });

  // Persist draft to sessionStorage whenever form changes (only for new registrations, not edits)
  useEffect(() => {
    if (editAtividade) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      sessionStorage.setItem(`${DRAFT_KEY}_date`, dataLancamento.toISOString());
    } catch { /* ignore */ }
  }, [form, dataLancamento, editAtividade]);



  // Pre-fill form when editing an existing activity
  useEffect(() => {
    if (editAtividade) {
      setForm({
        ligacoes: String(editAtividade.ligacoes ?? ''),
        mensagens: String(editAtividade.mensagens ?? ''),
        cotacoes_realizadas: String((editAtividade as any).cotacoes_realizadas ?? ''),
        cotacoes_enviadas: String(editAtividade.cotacoes_enviadas ?? ''),
        cotacoes_respondidas: String(editAtividade.cotacoes_fechadas ?? ''),
        cotacoes_nao_respondidas: String((editAtividade as any).cotacoes_nao_respondidas ?? 0),
        follow_up: String(editAtividade.follow_up ?? ''),
        follow_up_realizado: String((editAtividade as any).follow_up_realizado ?? ''),
        justificativa: '',
        justificativa_nao_resposta: '',
        justificativa_atraso: '',
        justificativa_baixa_resposta: '',
      });
      try {
        const d = parse(editAtividade.data, 'yyyy-MM-dd', new Date());
        if (isValid(d)) setDataLancamento(d);
      } catch { /* keep today */ }
    }
  }, [editAtividade]);

  // Compute changes for correction request
  const changeRequestFields = useMemo(() => {
    if (!editAtividade) return [];
    const mapping = [
      { key: 'ligacoes', formKey: 'ligacoes', label: 'Ligações Realizadas' },
      { key: 'mensagens', formKey: 'mensagens', label: 'Mensagens Enviadas' },
      { key: 'cotacoes_realizadas', formKey: 'cotacoes_realizadas', label: 'Cotações Realizadas' },
      { key: 'cotacoes_enviadas', formKey: 'cotacoes_enviadas', label: 'Cotações Enviadas' },
      { key: 'cotacoes_fechadas', formKey: 'cotacoes_respondidas', label: 'Cotações Respondidas' },
      { key: 'cotacoes_nao_respondidas', formKey: 'cotacoes_nao_respondidas', label: 'Cotações Não Respondidas' },
      { key: 'follow_up', formKey: 'follow_up', label: 'Follow-up' },
    ];
    return mapping.filter(m => {
      const original = String(editAtividade[m.key] ?? 0);
      const novo = form[m.formKey as keyof AtividadesForm] ?? '';
      return original !== novo;
    }).map(m => ({
      campo: m.key,
      label: m.label,
      valorAntigo: editAtividade[m.key] ?? 0,
      valorNovo: form[m.formKey as keyof AtividadesForm],
    }));
  }, [editAtividade, form]);

  const isRetroativo = !isToday(dataLancamento);

  const metrics: { key: keyof AtividadesForm; label: string; icon: React.ElementType; tooltip: string }[] = [
    { key: 'ligacoes', label: 'Ligações Realizadas', icon: Phone, tooltip: 'Total de ligações de prospecção e follow-up realizadas no dia selecionado.' },
    { key: 'mensagens', label: 'Mensagens Enviadas', icon: MessageSquare, tooltip: 'WhatsApp, e-mails e mensagens enviadas a clientes e leads no dia.' },
    { key: 'cotacoes_realizadas', label: 'Cotações Realizadas', icon: Calculator, tooltip: 'Quantidade de cotações precificadas no dia.' },
    { key: 'cotacoes_enviadas', label: 'Cotações Enviadas', icon: MessageCircle, tooltip: 'Propostas comerciais efetivamente enviadas ao cliente.' },
    { key: 'cotacoes_respondidas', label: 'Cotações Respondidas', icon: CheckCircle2, tooltip: 'Cotações que o cliente respondeu (positiva ou negativamente).' },
    { key: 'cotacoes_nao_respondidas', label: 'Cotações Não Respondidas', icon: XCircle, tooltip: 'Cotações enviadas que ainda não obtiveram retorno do cliente.' },
  ];

  const metricKeys = metrics.map(m => m.key);
  const allFilled = metricKeys.every(k => form[k] !== '') && form.follow_up_realizado !== '';

  const validations = useMemo(() => {
    const lig = parseInt(form.ligacoes) || 0;
    const msg = parseInt(form.mensagens) || 0;
    const cotRealizadas = parseInt(form.cotacoes_realizadas) || 0;
    const cotEnviadas = parseInt(form.cotacoes_enviadas) || 0;
    const cotRespondidas = parseInt(form.cotacoes_respondidas) || 0;
    const cotNaoRespondidas = parseInt(form.cotacoes_nao_respondidas) || 0;
    const followUpRealizado = parseInt(form.follow_up_realizado) || 0;

    // Cenário A: retroativo ou < 10% ou Enviadas < Realizadas
    let cenarioA = false;
    let cenarioAReason = '';
    if (isRetroativo) {
      cenarioA = true;
      cenarioAReason = 'A justificativa é obrigatória para lançamentos fora da data atual e será enviada à diretoria.';
    } else if ((lig + msg) > 0 && cotRealizadas < Math.ceil((lig + msg) * 0.1)) {
      cenarioA = true;
      cenarioAReason = 'A taxa de cotações realizadas está abaixo do mínimo (10% dos contatos). Justifique o rendimento para liberar o registro.';
    } else if (cotRealizadas > 0 && cotEnviadas < cotRealizadas) {
      cenarioA = true;
      cenarioAReason = 'Cotações Enviadas deve ser igual a Cotações Realizadas (meta 100%). Justifique o motivo de não ter enviado todas as cotações.';
    }

    // Cenário B: Cotações Não Respondidas > 0
    const cenarioB = cotNaoRespondidas > 0;
    const cenarioBReason = 'Há cotações não respondidas. Descreva o motivo para acompanhamento.';

    // Cenário C: Follow-up Realizado < Follow-up Agendado
    const cenarioC = followUpAgendado > 0 && followUpRealizado < followUpAgendado;
    const cenarioCReason = `Você realizou ${followUpRealizado} follow-up(s), mas havia ${followUpAgendado} agendado(s). Justifique os atrasos.`;

    // Cenário D: Respondidas < 50% das Enviadas (Meta 50%)
    const cenarioD = cotEnviadas > 0 && cotRespondidas < Math.ceil(cotEnviadas * 0.5);
    const cenarioDReason = 'A sua taxa de resposta está abaixo de 50%. Por favor, justifique o motivo da baixa conversão para enviar as atividades.';

    return { cenarioA, cenarioAReason, cenarioB, cenarioBReason, cenarioC, cenarioCReason, cenarioD, cenarioDReason, showRespondidosAlert: cenarioD };
  }, [isRetroativo, form.ligacoes, form.mensagens, form.cotacoes_realizadas, form.cotacoes_enviadas, form.cotacoes_respondidas, form.cotacoes_nao_respondidas, form.follow_up_realizado, followUpAgendado]);

  const canSave = useMemo(() => {
    if (!allFilled) return false;
    if (validations.cenarioA && !form.justificativa.trim()) return false;
    if (validations.cenarioB && !form.justificativa_nao_resposta.trim()) return false;
    if (validations.cenarioC && !form.justificativa_atraso.trim()) return false;
    if (validations.cenarioD && !form.justificativa_baixa_resposta.trim()) return false;
    return true;
  }, [allFilled, validations, form.justificativa, form.justificativa_nao_resposta, form.justificativa_atraso, form.justificativa_baixa_resposta]);

  const conversionRates = [
    { label: 'Ligações → Cotações Enviadas', value: calcRate(form.ligacoes, form.cotacoes_enviadas) },
    { label: 'Cotações Enviadas → Respondidas', value: calcRate(form.cotacoes_enviadas, form.cotacoes_respondidas) },
  ];

  const handleSave = () => {
    if (!canSave) { 
      const needsJustification = validations.cenarioA || validations.cenarioB || validations.cenarioC;
      const missingJustification = 
        (validations.cenarioA && !form.justificativa.trim()) ||
        (validations.cenarioB && !form.justificativa_nao_resposta.trim()) ||
        (validations.cenarioC && !form.justificativa_atraso.trim()) ||
        (validations.cenarioD && !form.justificativa_baixa_resposta.trim());

      toast.error(needsJustification && missingJustification 
        ? 'A justificativa é obrigatória para os cenários atípicos (retroativo, metas baixas ou atrasos).' 
        : 'Preencha todos os campos obrigatórios.');
      return; 
    }
    if (editAtividade) {
      // Show change request confirmation instead
      if (changeRequestFields.length === 0) {
        toast.info('Nenhum campo foi alterado. Modifique pelo menos um campo para solicitar alteração.');
        return;
      }
      setShowChangeConfirm(true);
      return;
    }
    setShowConfirm(true);
  };

  const confirmChangeRequest = async () => {
    if (!changeJustificativa.trim()) {
      toast.error('Informe a justificativa para a alteração.');
      return;
    }
    setSaving(true);
    try {
      if (!user) throw new Error('Não autenticado');

      const payload = await submitCR.mutateAsync({
        registroId: editAtividade.id,
        tipo: 'atividade',
        statusAtual: (editAtividade as any).status || 'pendente',
        justificativa: changeJustificativa.trim(),
        alteracoesPropostas: changeRequestFields.map(a => ({
          campo: a.campo,
          valorAntigo: a.valorAntigo,
          valorNovo: a.valorNovo,
        })),
      });

      if (!payload.autoApproved && user) {
        dispatchNotification(
          'atividade_alteracao',
          user.id,
          'Solicitação de Alteração',
          `${profile?.nome_completo || 'Consultor'} solicitou alteração na atividade de ${editAtividade.data?.split('-').reverse().join('/')}`,
          'atividade',
          '/aprovacoes'
        );
      }
      setShowChangeConfirm(false);
      navigate('/minhas-acoes');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      await createAtividade.mutateAsync({
        data: format(dataLancamento, 'yyyy-MM-dd'),
        ligacoes: parseInt(form.ligacoes) || 0,
        mensagens: parseInt(form.mensagens) || 0,
        cotacoes_realizadas: parseInt(form.cotacoes_realizadas) || 0,
        cotacoes_enviadas: parseInt(form.cotacoes_enviadas) || 0,
        cotacoes_fechadas: parseInt(form.cotacoes_respondidas) || 0,
        cotacoes_nao_respondidas: parseInt(form.cotacoes_nao_respondidas) || 0,
        follow_up: parseInt(form.follow_up_realizado) || 0,
        follow_up_realizado: parseInt(form.follow_up_realizado) || 0,
        justificativa: form.justificativa || null,
        justificativa_nao_resposta: form.justificativa_nao_resposta || null,
        justificativa_atraso: form.justificativa_atraso || null,
        justificativa_baixa_resposta: form.justificativa_baixa_resposta || null,
      } as any);
      
      // Clear session draft after successful save
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(`${DRAFT_KEY}_date`);
      } catch { /* ignore */ }
      
      setShowConfirm(false);
      logAction('criar_atividade', 'atividade', undefined, { data: format(dataLancamento, 'yyyy-MM-dd') });

      
      const totalVolume = (parseInt(form.ligacoes) || 0) + (parseInt(form.mensagens) || 0);
      const frase = getDailyFraseMotivacional(totalVolume);
      const tierInfo = getPerformanceTierInfo(totalVolume);

      const metaFaturamento = profile?.meta_faturamento ?? 75000;
      const faturamentoAtual = (myVendas || []).filter(v => v.status === 'aprovado').reduce((sum, v) => sum + (v.valor ?? 0), 0);
      const percentMeta = metaFaturamento > 0 ? Math.round((faturamentoAtual / metaFaturamento) * 100) : 0;

      if (percentMeta >= 100) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      toast.success(
        <div className="flex flex-col gap-1.5">
          <span className="font-bold">Atividades registradas!</span>
          <div className="flex items-center gap-1.5 mt-1" style={{ color: tierInfo.color }}>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: tierInfo.color + '20' }}>
              {tierInfo.name}
            </span>
            <span className="text-xs italic leading-tight">{frase}</span>
          </div>
        </div>,
        { duration: 6000 }
      );
      // Notify hierarchy
      if (user) {
        dispatchNotification(
          'atividade_registrada',
          user.id,
          'Nova Atividade Registrada',
          `${profile?.nome_completo || 'Consultor'} registrou atividades em ${format(dataLancamento, 'dd/MM/yyyy')}`,
          'atividade',
          '/aprovacoes'
        );
      }
      setForm({ ligacoes: '', mensagens: '', cotacoes_realizadas: '', cotacoes_enviadas: '', cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '', justificativa_nao_resposta: '', justificativa_atraso: '', justificativa_baixa_resposta: '' });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar atividades.');
    } finally {
      setSaving(false);
    }
  };




  const update = (key: keyof AtividadesForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6 pb-24">
      {/* ── Data ── */}
      <div className="bg-card rounded-2xl p-6 shadow-elevated hover-lift border border-border/40">
        <SectionHeader icon={CalendarIcon} title="Data de Lançamento" subtitle="Preenchida automaticamente com a data atual" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={!canEdit} className={cn("w-[260px] justify-start text-left font-normal h-11 border-border/40", !dataLancamento && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {dataLancamento ? format(dataLancamento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataLancamento} onSelect={(d) => d && setDataLancamento(d)} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Cenário A: Retroativo / 10% / Enviadas */}
        {validations.cenarioA && (
          <div className="mt-4 p-4 bg-warning/8 border border-warning/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-sm font-medium text-foreground">
                {isRetroativo ? 'Lançamento retroativo detectado' : 'Atenção: Ações atípicas identificadas'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{validations.cenarioAReason}</p>
            <Textarea placeholder="Descreva o motivo..." value={form.justificativa} onChange={(e) => update('justificativa', e.target.value)} rows={3} disabled={!canEdit} className="border-warning/30 focus:border-warning disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>
        )}
      </div>

      {/* ── Campos de Atividade ── */}
      <div className="bg-card rounded-2xl p-6 shadow-elevated hover-lift border border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <SectionHeader icon={ClipboardList} title="Atividades do Dia" subtitle="Todos os campos são obrigatórios, mesmo que o valor seja 0" />
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 flex items-center gap-3 w-fit shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-primary font-bold" />
            </div>
            <div className="pr-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Agendados hoje</p>
              <p className="text-xl font-black text-primary font-display leading-tight">{followUpAgendado}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {metrics.map((m) => (
            <FieldWithTooltip key={m.key} label={m.label} tooltip={m.tooltip} required>
              <div className="relative">
                <m.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                <Input type="number" min={0} placeholder="0" value={form[m.key]} onChange={(e) => update(m.key, e.target.value)} disabled={!canEdit} className={cn("pl-10 h-11 border-border/40 focus:border-primary bg-muted/30 focus:bg-card transition-all", !canEdit && "opacity-60 cursor-not-allowed")} />
              </div>
              {/* Visual alert: Respondidas < 50% das Enviadas */}
              {m.key === 'cotacoes_respondidas' && validations.showRespondidosAlert && form.cotacoes_respondidas !== '' && (
                <p className="text-[11px] text-amber-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Taxa de resposta abaixo de 50% da meta ideal
                </p>
              )}
            </FieldWithTooltip>
          ))}

          {/* Follow-up Agendado (read-only) */}
          <FieldWithTooltip label="Follow-ups Agendados" tooltip="Follow-ups agendados para hoje com base nos leads com status 'Aguardando retorno' ou 'Declinado'." required={false}>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input type="number" value={followUpAgendado} readOnly disabled className="pl-10 h-11 bg-muted/50 border-border/20 text-muted-foreground cursor-not-allowed opacity-70" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Calculado automaticamente</p>
          </FieldWithTooltip>

          {/* Follow-up Realizado (manual) */}
          <FieldWithTooltip label="Follow-ups Realizados" tooltip="Quantidade de follow-ups que você efetivamente realizou hoje." required>
            <div className="relative">
              <RotateCcw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
              <Input type="number" min={0} placeholder="0" value={form.follow_up_realizado} onChange={(e) => update('follow_up_realizado', e.target.value)} disabled={!canEdit} className={cn("pl-10 h-11 border-border/40 focus:border-primary bg-muted/30 focus:bg-card transition-all", !canEdit && "opacity-60 cursor-not-allowed")} />
            </div>
          </FieldWithTooltip>
        </div>

        {/* Cenário B: Cotações Não Respondidas */}
        {allFilled && validations.cenarioB && (
          <div className="mt-5 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-medium text-foreground">Justificativa de Não Resposta (obrigatória)</p>
            </div>
            <p className="text-xs text-muted-foreground">{validations.cenarioBReason}</p>
            <Textarea placeholder="Explique por que essas cotações ainda não receberam resposta..." value={form.justificativa_nao_resposta} onChange={(e) => update('justificativa_nao_resposta', e.target.value)} rows={3} disabled={!canEdit} className="border-orange-200 focus:border-orange-400 disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>
        )}

        {/* Cenário C: Follow-up Realizado < Agendado */}
        {allFilled && validations.cenarioC && (
          <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-sm font-medium text-foreground">Justificativa de Atraso de Follow-up (obrigatória)</p>
            </div>
            <p className="text-xs text-muted-foreground">{validations.cenarioCReason}</p>
            <Textarea placeholder="Explique o motivo de não ter realizado todos os follow-ups agendados..." value={form.justificativa_atraso} onChange={(e) => update('justificativa_atraso', e.target.value)} rows={3} disabled={!canEdit} className="border-blue-200 focus:border-blue-400 disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>
        )}
        
        {/* Cenário D: Baixa Taxa de Resposta */}
        {allFilled && validations.cenarioD && (
          <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-foreground">Justificativa de Baixa Taxa de Resposta (obrigatória)</p>
            </div>
            <p className="text-xs text-muted-foreground">{validations.cenarioDReason}</p>
            <Textarea placeholder="Explique por que os clientes não estão respondendo às cotações enviadas..." value={form.justificativa_baixa_resposta} onChange={(e) => update('justificativa_baixa_resposta', e.target.value)} rows={3} disabled={!canEdit} className="border-amber-200 focus:border-amber-400 disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>
        )}

        {allFilled && (
          <>
            <Separator className="my-6 bg-border/20" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-muted-foreground font-display uppercase tracking-[0.08em]">Resumo de Performance e Gamificação</h3>
              </div>
              
              {/* Performance Tier & Phrase Summary */}
              {(() => {
                const totalVol = (parseInt(form.ligacoes) || 0) + (parseInt(form.mensagens) || 0);
                const tier = getPerformanceTierInfo(totalVol);
                const frase = getDailyFraseMotivacional(totalVol);
                return (
                  <div className="mb-4 p-4 rounded-xl border border-border/40 bg-muted/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ backgroundColor: tier.color }}>
                        <Flag className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold font-display uppercase tracking-widest" style={{ color: tier.color }}>{tier.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-card/50">{totalVol} contatos</Badge>
                        </div>
                        <p className="text-xs italic text-muted-foreground leading-relaxed">"{frase}"</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {conversionRates.map((r) => (
                  <div key={r.label} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/20">
                    <span className="text-[11px] text-muted-foreground leading-tight">{r.label}</span>
                    <span className="text-sm font-bold text-primary font-display ml-3">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}


      </div>


      {/* ── Líderes ── */}
      <div className="bg-card rounded-2xl p-6 shadow-elevated hover-lift border border-border/40">
        <SectionHeader icon={User} title="Líderes" subtitle="Notificação automática enviada ao supervisor e gerente" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/40 rounded-lg border border-border/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Supervisor</p>
            <p className="text-sm font-bold text-foreground">{resolvedSupervisor?.nome_completo || '—'}</p>
            {resolvedSupervisor?.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{resolvedSupervisor.email}</div>}
          </div>
          <div className="p-4 bg-muted/40 rounded-lg border border-border/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Gerente</p>
            <p className="text-sm font-bold text-foreground">{resolvedGerente?.nome_completo || '—'}</p>
            {resolvedGerente?.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{resolvedGerente.email}</div>}
          </div>
        </div>
      </div>

      {/* ── Floating Register Button ── */}
      {canEdit && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={handleSave}
            disabled={editAtividade ? changeRequestFields.length === 0 : !canSave}
            size="lg"
            className="gradient-hero text-white font-bold px-8 h-14 shadow-brand text-sm tracking-wide rounded-full hover:scale-105 transition-all duration-300 fab-animated disabled:animate-none"
          >
            {editAtividade ? (<><Send className="w-5 h-5 mr-2" /> SOLICITAR ALTERAÇÃO</>) : (<><Save className="w-5 h-5 mr-2" /> REGISTRAR ATIVIDADES</>)}
          </Button>
        </div>
      )}

      {!canEdit && (
        <div className="p-4 bg-warning/8 border border-warning/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-muted-foreground">Você possui permissão apenas para <strong>visualizar</strong> esta página. Edição desabilitada pelo seu perfil de segurança.</p>
        </div>
      )}

      {/* Modal de Confirmação - Manual */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Registro</DialogTitle>
            <DialogDescription>Revise o resumo antes de confirmar. Supervisor e gerente serão notificados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2 max-h-[50vh] overflow-y-auto">
            <div className="flex justify-between p-2.5 bg-muted/40 rounded-lg">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium text-foreground">{format(dataLancamento, "dd/MM/yyyy")}</span>
            </div>
            {metrics.map(m => (
              <div key={m.key} className="flex justify-between p-2.5 bg-muted/40 rounded-lg">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-medium text-foreground">{form[m.key] || '0'}</span>
              </div>
            ))}
            {(validations.cenarioA || validations.cenarioB || validations.cenarioC) && (
              <div className="pt-2 border-t border-border/20 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Justificativas</p>
                {validations.cenarioA && form.justificativa && <p className="text-xs text-foreground bg-warning/10 p-2 rounded border border-warning/20">{form.justificativa}</p>}
                {validations.cenarioB && form.justificativa_nao_resposta && <p className="text-xs text-foreground bg-warning/10 p-2 rounded border border-warning/20">{form.justificativa_nao_resposta}</p>}
                {validations.cenarioC && form.justificativa_atraso && <p className="text-xs text-foreground bg-warning/10 p-2 rounded border border-warning/20">{form.justificativa_atraso}</p>}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-[120px]">
              {saving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Request Confirmation Dialog */}
      <Dialog open={showChangeConfirm} onOpenChange={setShowChangeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Solicitar Alteração</DialogTitle>
            <DialogDescription>Deseja solicitar a alteração do envio desta atividade? As mudanças serão enviadas para aprovação do seu superior.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
            {changeRequestFields.map(a => (
              <div key={a.campo} className="flex justify-between p-2.5 bg-muted/40 rounded-lg">
                <span className="text-sm text-muted-foreground">{a.label}</span>
                <span className="text-sm">
                  <span className="text-destructive line-through mr-1">{String(a.valorAntigo)}</span>
                  →
                  <span className="text-primary font-semibold ml-1">{a.valorNovo}</span>
                </span>
              </div>
            ))}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-muted-foreground">Justificativa <span className="text-destructive">*</span></label>
              <Textarea value={changeJustificativa} onChange={e => setChangeJustificativa(e.target.value)} placeholder="Explique o motivo da alteração..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangeConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmChangeRequest} disabled={saving || !changeJustificativa.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-[120px]">
              {saving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Enviando...</> : <><Send className="w-4 h-4 mr-1" /> Enviar Solicitação</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*       TAB: NOVA VENDA (uses SalesWizard)        */
/* ═══════════════════════════════════════════════ */
import SalesWizard from '@/components/SalesWizard';


function NovaVendaTab() {
  return <SalesWizard />;
}

/* ═══════════════════════════════════════════════ */
/*              PÁGINA COMERCIAL                   */
/* ═══════════════════════════════════════════════ */
const Comercial = () => {
  const location = useLocation();
  const editVenda = (location.state as any)?.editVenda;
  const prefillLead = (location.state as any)?.prefillLead;
  const editAtividade = (location.state as any)?.editAtividade;
  const defaultTab = (editVenda || prefillLead) ? 'nova-venda' : 'atividades';
  const { data: myPermissions } = useMyPermissions();
  const { data: cargoPermissions } = useMyCargoPermissions();

  const canViewAtividades = hasPermission(myPermissions, 'atividades', 'view') && hasCargoPermission(cargoPermissions, 'atividades.atividades', 'view');
  const canViewNovaVenda = hasPermission(myPermissions, 'atividades', 'view') && hasCargoPermission(cargoPermissions, 'atividades.vendas', 'view');
  
  const canEditAtividades = hasPermission(myPermissions, 'atividades', 'edit') && hasCargoPermission(cargoPermissions, 'atividades.atividades', 'edit');


  return (
    <div className="max-w-5xl space-y-6 page-enter">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Registro de Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">Atividades diárias e registro de vendas</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-card border border-border/40 shadow-elevated p-1 h-auto rounded-xl">
          {canViewAtividades && (
            <TabsTrigger value="atividades" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
              <ClipboardList className="w-4 h-4" /> Atividades
            </TabsTrigger>
          )}
          {canViewNovaVenda && (
            <TabsTrigger value="nova-venda" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
              <ShoppingCart className="w-4 h-4" /> Nova Venda
            </TabsTrigger>
          )}

        </TabsList>

        {canViewAtividades && <TabsContent value="atividades"><AtividadesTab editAtividade={editAtividade} /></TabsContent>}
        {canViewNovaVenda && <TabsContent value="nova-venda"><NovaVendaTab /></TabsContent>}

      </Tabs>
    </div>
  );
};

export default Comercial;
