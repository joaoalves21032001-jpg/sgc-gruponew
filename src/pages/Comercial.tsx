import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isToday, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, Info, Save, Send,
  ChevronRight, ChevronLeft, AlertCircle, CalendarIcon, DollarSign,
  ClipboardList, ShoppingCart, Trash2, Plus, TrendingUp,
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
import { useProfile, useSupervisorProfile, useUserRole } from '@/hooks/useProfile';
import { useCreateAtividade, useMyAtividades } from '@/hooks/useAtividades';
import { useCreateVenda, useMyVendas, uploadVendaDocumento } from '@/hooks/useVendas';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { maskPhone } from '@/lib/masks';
import { supabase } from '@/integrations/supabase/client';
import { notifyDirectLeadership } from '@/hooks/useNotifications';

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
  cotacoes_coletadas: string;
  cotacoes_enviadas: string;
  cotacoes_respondidas: string;
  cotacoes_nao_respondidas: string;
  follow_up: string;
  justificativa: string;
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
  const { data: myAtividades } = useMyAtividades();
  const { data: myVendas } = useMyVendas();
  const createAtividade = useCreateAtividade();
  const logAction = useLogAction();
  const navigate = useNavigate();
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [changeJustificativa, setChangeJustificativa] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AtividadesForm>({
    ligacoes: '', mensagens: '', cotacoes_coletadas: '', cotacoes_enviadas: '',
    cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '',
  });

  // Pre-fill form when editing an existing activity
  useEffect(() => {
    if (editAtividade) {
      setForm({
        ligacoes: String(editAtividade.ligacoes ?? ''),
        mensagens: String(editAtividade.mensagens ?? ''),
        cotacoes_coletadas: String(editAtividade.cotacoes_coletadas ?? 0),
        cotacoes_enviadas: String(editAtividade.cotacoes_enviadas ?? ''),
        cotacoes_respondidas: String(editAtividade.cotacoes_fechadas ?? ''),
        cotacoes_nao_respondidas: String(editAtividade.cotacoes_nao_respondidas ?? 0),
        follow_up: String(editAtividade.follow_up ?? ''),
        justificativa: '',
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
      { key: 'cotacoes_coletadas', formKey: 'cotacoes_coletadas', label: 'Cotações Coletadas' },
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
    { key: 'cotacoes_coletadas', label: 'Cotações Coletadas', icon: FileText, tooltip: 'Cotações recebidas de operadoras para apresentar ao cliente.' },
    { key: 'cotacoes_enviadas', label: 'Cotações Enviadas', icon: MessageCircle, tooltip: 'Propostas comerciais efetivamente enviadas ao cliente.' },
    { key: 'cotacoes_respondidas', label: 'Cotações Respondidas', icon: CheckCircle2, tooltip: 'Cotações que o cliente respondeu (positiva ou negativamente).' },
    { key: 'cotacoes_nao_respondidas', label: 'Cotações Não Respondidas', icon: XCircle, tooltip: 'Cotações enviadas que ainda não obtiveram retorno do cliente.' },
    { key: 'follow_up', label: 'Follow-up', icon: RotateCcw, tooltip: 'Retornos agendados com clientes.' },
  ];

  const metricKeys = metrics.map(m => m.key);
  const allFilled = metricKeys.every(k => form[k] !== '');
  const canSave = allFilled && (!isRetroativo || form.justificativa.trim().length > 0);

  const conversionRates = [
    { label: 'Ligações → Cotações Coletadas', value: calcRate(form.ligacoes, form.cotacoes_coletadas) },
    { label: 'Ligações → Cotações Enviadas', value: calcRate(form.ligacoes, form.cotacoes_enviadas) },
    { label: 'Cotações Enviadas → Respondidas', value: calcRate(form.cotacoes_enviadas, form.cotacoes_respondidas) },
    { label: 'Mensagens → Cotações Coletadas', value: calcRate(form.mensagens, form.cotacoes_coletadas) },
  ];

  const handleSave = () => {
    if (!canSave) { toast.error('Preencha todos os campos obrigatórios.'); return; }
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
      const structuredPayload = {
        registroId: editAtividade.id,
        statusAtual: (editAtividade as any).status || 'pendente',
        justificativa: changeJustificativa.trim(),
        alteracoesPropostas: changeRequestFields.map(a => ({
          campo: a.campo,
          valorAntigo: a.valorAntigo,
          valorNovo: a.valorNovo,
        })),
      };
      const { error } = await supabase.from('correction_requests').insert({
        user_id: user.id,
        tipo: 'atividade',
        registro_id: editAtividade.id,
        motivo: JSON.stringify(structuredPayload),
      } as any);
      if (error) throw error;
      toast.success('Solicitação de alteração enviada ao supervisor!');
      if (user) {
        notifyDirectLeadership(
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
        cotacoes_enviadas: parseInt(form.cotacoes_enviadas) || 0,
        cotacoes_fechadas: parseInt(form.cotacoes_respondidas) || 0,
        follow_up: parseInt(form.follow_up) || 0,
      });
      setShowConfirm(false);
      logAction('criar_atividade', 'atividade', undefined, { data: format(dataLancamento, 'yyyy-MM-dd') });
      toast.success('Atividades registradas com sucesso!');
      // Notify hierarchy
      if (user) {
        notifyDirectLeadership(
          user.id,
          'Nova Atividade Registrada',
          `${profile?.nome_completo || 'Consultor'} registrou atividades em ${format(dataLancamento, 'dd/MM/yyyy')}`,
          'atividade',
          '/aprovacoes'
        );
      }
      setForm({ ligacoes: '', mensagens: '', cotacoes_coletadas: '', cotacoes_enviadas: '', cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '' });
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
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <SectionHeader icon={CalendarIcon} title="Data de Lançamento" subtitle="Preenchida automaticamente com a data atual" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal h-11 border-border/40", !dataLancamento && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {dataLancamento ? format(dataLancamento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataLancamento} onSelect={(d) => d && setDataLancamento(d)} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {isRetroativo && (
          <div className="mt-4 p-4 bg-warning/8 border border-warning/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-sm font-medium text-foreground">Lançamento retroativo detectado</p>
            </div>
            <p className="text-xs text-muted-foreground">A justificativa é obrigatória e será enviada para o <strong>Supervisor</strong>, <strong>Gerente</strong> e <strong>Diretor</strong>.</p>
            <Textarea placeholder="Justifique o motivo do lançamento fora da data correta..." value={form.justificativa} onChange={(e) => update('justificativa', e.target.value)} rows={3} className="border-warning/30 focus:border-warning" />
          </div>
        )}
      </div>

      {/* ── Campos de Atividade ── */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <SectionHeader icon={ClipboardList} title="Atividades do Dia" subtitle="Todos os campos são obrigatórios, mesmo que o valor seja 0" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {metrics.map((m) => (
            <FieldWithTooltip key={m.key} label={m.label} tooltip={m.tooltip} required>
              <div className="relative">
                <m.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                <Input type="number" min={0} placeholder="0" value={form[m.key]} onChange={(e) => update(m.key, e.target.value)} className="pl-10 h-11 border-border/40 focus:border-primary bg-muted/30 focus:bg-card transition-all" />
              </div>
            </FieldWithTooltip>
          ))}
        </div>

        {allFilled && (
          <>
            <Separator className="my-6 bg-border/20" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-muted-foreground font-display uppercase tracking-[0.08em]">Desempenho do Dia</h3>
              </div>
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
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <SectionHeader icon={User} title="Líderes" subtitle="Notificação automática enviada ao supervisor e gerente" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/40 rounded-lg border border-border/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Supervisor</p>
            <p className="text-sm font-bold text-foreground">{supervisor?.nome_completo || '—'}</p>
            {supervisor?.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{supervisor.email}</div>}
          </div>
          <div className="p-4 bg-muted/40 rounded-lg border border-border/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Gerente</p>
            <p className="text-sm font-bold text-foreground">—</p>
          </div>
        </div>
      </div>

      {/* ── Floating Register Button ── */}
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
            {isRetroativo && (
              <div className="p-2.5 bg-warning/10 rounded-lg border border-warning/20">
                <p className="text-xs text-muted-foreground mb-1">Justificativa (retroativo)</p>
                <p className="text-xs text-foreground">{form.justificativa}</p>
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
import EvolucaoTab from '@/components/EvolucaoTab';

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

  return (
    <div className="max-w-5xl space-y-6 page-enter">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Registro de Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">Atividades diárias e registro de vendas</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="atividades" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
            <ClipboardList className="w-4 h-4" /> Atividades
          </TabsTrigger>
          <TabsTrigger value="nova-venda" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
            <ShoppingCart className="w-4 h-4" /> Nova Venda
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
            <TrendingUp className="w-4 h-4" /> Evolução
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atividades"><AtividadesTab editAtividade={editAtividade} /></TabsContent>
        <TabsContent value="nova-venda"><NovaVendaTab /></TabsContent>
        <TabsContent value="evolucao"><EvolucaoTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Comercial;
