import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, MapPin, Info, Save,
  ChevronRight, ChevronLeft, Upload, AlertCircle, CalendarIcon, DollarSign,
  ClipboardList, ShoppingCart, FileUp, Trash2, Plus, TrendingUp, Download,
  Mail, User, XCircle, MessageCircle, BarChart3
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
import { useProfile, useSupervisorProfile } from '@/hooks/useProfile';
import { useCreateAtividade } from '@/hooks/useAtividades';
import { useCreateVenda, uploadVendaDocumento } from '@/hooks/useVendas';
import { useAuth } from '@/contexts/AuthContext';

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

function AtividadesTab() {
  const { data: profile } = useProfile();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const createAtividade = useCreateAtividade();
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState<AtividadesForm>({
    ligacoes: '', mensagens: '', cotacoes_coletadas: '', cotacoes_enviadas: '',
    cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '',
  });

  const isRetroativo = !isToday(dataLancamento);

  const metrics: { key: keyof AtividadesForm; label: string; icon: React.ElementType; tooltip: string }[] = [
    { key: 'ligacoes', label: 'Ligações Realizadas', icon: Phone, tooltip: 'Total de ligações de prospecção e follow-up realizadas no dia selecionado.' },
    { key: 'mensagens', label: 'Mensagens Enviadas', icon: MessageSquare, tooltip: 'WhatsApp, e-mails e mensagens enviadas a clientes e leads no dia.' },
    { key: 'cotacoes_coletadas', label: 'Cotações Coletadas', icon: FileText, tooltip: 'Cotações recebidas de operadoras para apresentar ao cliente.' },
    { key: 'cotacoes_enviadas', label: 'Cotações Enviadas', icon: MessageCircle, tooltip: 'Propostas comerciais efetivamente enviadas ao cliente.' },
    { key: 'cotacoes_respondidas', label: 'Cotações Respondidas', icon: CheckCircle2, tooltip: 'Cotações que o cliente respondeu (positiva ou negativamente).' },
    { key: 'cotacoes_nao_respondidas', label: 'Cotações Não Respondidas', icon: XCircle, tooltip: 'Cotações enviadas que ainda não obtiveram retorno do cliente.' },
    { key: 'follow_up', label: 'Follow-up', icon: RotateCcw, tooltip: 'Retornos agendados com clientes. Tempo pré-estabelecido para retorno.' },
  ];

  const metricKeys = metrics.map(m => m.key);
  const allFilled = metricKeys.every(k => form[k] !== '');
  const canSave = allFilled && (!isRetroativo || form.justificativa.trim().length > 0);

  const conversionRates = [
    { label: 'Ligações → Cotações Coletadas', value: calcRate(form.ligacoes, form.cotacoes_coletadas) },
    { label: 'Ligações → Cotações Enviadas', value: calcRate(form.ligacoes, form.cotacoes_enviadas) },
    { label: 'Ligações → Respondidas', value: calcRate(form.ligacoes, form.cotacoes_respondidas) },
    { label: 'Mensagens → Cotações Coletadas', value: calcRate(form.mensagens, form.cotacoes_coletadas) },
    { label: 'Mensagens → Cotações Enviadas', value: calcRate(form.mensagens, form.cotacoes_enviadas) },
    { label: 'Mensagens → Respondidas', value: calcRate(form.mensagens, form.cotacoes_respondidas) },
    { label: 'Cotações Coletadas → Enviadas', value: calcRate(form.cotacoes_coletadas, form.cotacoes_enviadas) },
    { label: 'Cotações Enviadas → Respondidas', value: calcRate(form.cotacoes_enviadas, form.cotacoes_respondidas) },
  ];

  const handleSave = () => {
    if (!canSave) { toast.error('Preencha todos os campos obrigatórios.'); return; }
    setShowConfirm(true);
  };

  const confirmSave = async () => {
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
      toast.success('Atividades registradas com sucesso!');
      setForm({ ligacoes: '', mensagens: '', cotacoes_coletadas: '', cotacoes_enviadas: '', cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '' });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar atividades.');
    }
  };

  const update = (key: keyof AtividadesForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
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
            <Calendar
              mode="single"
              selected={dataLancamento}
              onSelect={(d) => d && setDataLancamento(d)}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {isRetroativo && (
          <div className="mt-4 p-4 bg-warning/8 border border-warning/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-sm font-medium text-foreground">Lançamento retroativo detectado</p>
            </div>
            <p className="text-xs text-muted-foreground">A justificativa é obrigatória e será enviada automaticamente para <strong>{supervisor?.nome_completo || 'Supervisor'}</strong>.</p>
            <Textarea
              placeholder="Justifique o motivo do lançamento fora da data correta..."
              value={form.justificativa}
              onChange={(e) => update('justificativa', e.target.value)}
              rows={3}
              className="border-warning/30 focus:border-warning"
            />
          </div>
        )}
      </div>

      {/* ── Campos de Atividade ── */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <SectionHeader icon={ClipboardList} title="Registrar Atividades" subtitle="Todos os campos são obrigatórios, mesmo que o valor seja 0" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {metrics.map((m) => (
            <FieldWithTooltip key={m.key} label={m.label} tooltip={m.tooltip} required>
              <div className="relative">
                <m.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form[m.key]}
                  onChange={(e) => update(m.key, e.target.value)}
                  className="pl-10 h-11 border-border/40 focus:border-primary bg-muted/30 focus:bg-card transition-all"
                />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {/* Import planilha inline */}
        <Separator className="my-6 bg-border/20" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/40 rounded-lg border border-border/20">
          <FileUp className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Importar atividades em massa</p>
            <p className="text-xs text-muted-foreground mt-0.5">Preencha o modelo de planilha e faça o upload para registrar múltiplos dias de uma vez.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40">
              <Download className="w-3.5 h-3.5" /> Modelo
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40">
              <Upload className="w-3.5 h-3.5" /> Upload
            </Button>
          </div>
        </div>
      </div>

      {/* ── Hierarquia ── */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <SectionHeader icon={User} title="Hierarquia" subtitle="Informações de envio automático — não editável" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/40 rounded-lg border border-border/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Supervisor</p>
            <p className="text-sm font-bold text-foreground">{supervisor?.nome_completo || '—'}</p>
            {supervisor?.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                {supervisor.email}
              </div>
            )}
          </div>
          <div className="p-4 bg-muted/40 rounded-lg border border-border/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Gerente</p>
            <p className="text-sm font-bold text-foreground">—</p>
          </div>
        </div>
      </div>

      {/* Botão Registrar - mais proeminente */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!canSave}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 h-12 shadow-brand text-sm tracking-wide"
        >
          <Save className="w-4 h-4 mr-2" />
          REGISTRAR ATIVIDADES
        </Button>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Registro</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Revise o resumo das atividades antes de confirmar. Um e-mail será enviado para o supervisor e gerente.
            </DialogDescription>
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
            <Separator className="my-2 bg-border/20" />
            <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Notificação automática</p>
              <p className="text-xs text-foreground">Supervisor: {supervisor?.nome_completo || '—'} ({supervisor?.email || '—'})</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*                TAB: NOVA VENDA                  */
/* ═══════════════════════════════════════════════ */

type Modalidade = 'pf' | 'familiar' | 'pme_1' | 'pme_multi' | 'empresarial_10';

interface Beneficiario {
  nome: string;
  tipo: string;
  is_conjuge: boolean;
}

interface DocUpload {
  label: string;
  file: File | null;
}

const STEPS = ['Modalidade', 'Dados Titular', 'Beneficiários', 'Documentos', 'Revisão'];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1 shrink-0">
          <div className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all",
            i === current ? 'bg-primary text-primary-foreground shadow-brand' :
            i < current ? 'bg-success text-success-foreground' :
            'bg-muted text-muted-foreground'
          )}>
            {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </div>
      ))}
    </div>
  );
}

function NovaVendaTab() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const createVenda = useCreateVenda();
  const [step, setStep] = useState(0);
  const [modalidade, setModalidade] = useState<Modalidade | ''>('');
  const [possuiPlanoAnterior, setPossuiPlanoAnterior] = useState(false);
  const [valorVenda, setValorVenda] = useState('');
  const [formData, setFormData] = useState({ nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '' });
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [newBenef, setNewBenef] = useState<Beneficiario>({ nome: '', tipo: 'dependente', is_conjuge: false });
  const [docUploads, setDocUploads] = useState<DocUpload[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const isEmpresa = ['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade);

  const addBeneficiario = () => {
    if (!newBenef.nome.trim()) { toast.error('Informe o nome do beneficiário.'); return; }
    setBeneficiarios([...beneficiarios, { ...newBenef }]);
    setNewBenef({ nome: '', tipo: 'dependente', is_conjuge: false });
  };

  const removeBeneficiario = (idx: number) => setBeneficiarios(beneficiarios.filter((_, i) => i !== idx));

  const canNext = () => {
    if (step === 0) return modalidade !== '';
    if (step === 1) return formData.nome && formData.cpf_cnpj && formData.email && formData.telefone && formData.endereco && valorVenda;
    if (step === 3) {
      const docs = getDocumentos();
      const requiredDocs = docs.filter(d => d.required);
      return requiredDocs.every(d => docUploads.some(u => u.label === d.label && u.file));
    }
    return true;
  };

  const getDocumentos = () => {
    const docs: { label: string; tip: string; required: boolean }[] = [
      { label: 'Documento com Foto (RG/CNH)', tip: 'RG, CNH ou outro documento oficial com foto nítida do titular.', required: true },
      { label: 'Comprovante de Endereço', tip: 'Conta de luz, água ou telefone dos últimos 3 meses.', required: true },
    ];
    if (possuiPlanoAnterior) {
      docs.push(
        { label: 'Carteirinha do Plano Anterior', tip: 'Foto da carteirinha do plano de saúde anterior.', required: true },
        { label: 'Carta de Permanência (PDF)', tip: 'Documento emitido pelo RH ou operadora anterior comprovando tempo de plano.', required: true },
        { label: 'Últimos 3 Boletos/Comprovantes', tip: 'Comprovantes de pagamento dos últimos 3 meses do plano anterior.', required: false },
      );
    }
    if (isEmpresa) docs.push({ label: 'Cartão CNPJ', tip: 'Comprovante de inscrição e situação cadastral da empresa na Receita Federal.', required: true });
    if (modalidade === 'empresarial_10') docs.push({ label: 'Comprovação de Vínculo (FGTS/Holerite/CTPS)', tip: 'Documento comprovando vínculo empregatício.', required: true });
    if (beneficiarios.some(b => b.is_conjuge)) docs.push({ label: 'Certidão de Casamento', tip: 'Documento exigido para cônjuges incluídos no plano.', required: true });
    return docs;
  };

  const handleDocUpload = (label: string, file: File) => {
    setDocUploads(prev => {
      const idx = prev.findIndex(d => d.label === label);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { label, file };
        return updated;
      }
      return [...prev, { label, file }];
    });
  };

  const getDocFile = (label: string) => docUploads.find(d => d.label === label)?.file;

  const handleFinalize = () => {
    const docs = getDocumentos();
    const missing = docs.filter(d => d.required && !docUploads.some(u => u.label === d.label && u.file));
    if (missing.length > 0) {
      toast.error(`Documentos obrigatórios faltando: ${missing.map(d => d.label).join(', ')}`);
      return;
    }
    setShowConfirm(true);
  };

  const confirmVenda = async () => {
    try {
      const modalidadeMap: Record<string, string> = {
        pf: 'PF', familiar: 'Familiar', pme_1: 'PME Multi', pme_multi: 'PME Multi', empresarial_10: 'Empresarial'
      };
      const venda = await createVenda.mutateAsync({
        nome_titular: formData.nome,
        modalidade: modalidadeMap[modalidade] || 'PF',
        vidas: beneficiarios.length || 1,
        valor: parseFloat(valorVenda) || undefined,
        observacoes: possuiPlanoAnterior ? 'Portabilidade de carência' : undefined,
      });

      for (const doc of docUploads) {
        if (doc.file && user) {
          await uploadVendaDocumento(venda.id, user.id, doc.file, doc.label);
        }
      }

      setShowConfirm(false);
      toast.success('Venda enviada para análise!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar venda.');
    }
  };

  return (
    <div className="space-y-6">
      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        {step === 0 && (
          <div className="space-y-5">
            <SectionHeader icon={ShoppingCart} title="Selecione a Modalidade" subtitle="Escolha o tipo de plano para esta venda" />
            <FieldWithTooltip label="Modalidade do Plano" tooltip="Cada modalidade possui documentação específica obrigatória." required>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Escolha a modalidade..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pf">Pessoa Física (PF)</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="pme_1">PME (1 Vida)</SelectItem>
                  <SelectItem value="pme_multi">PME (Multi Vidas)</SelectItem>
                  <SelectItem value="empresarial_10">Empresarial (10+ vidas)</SelectItem>
                </SelectContent>
              </Select>
            </FieldWithTooltip>
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
              <Switch checked={possuiPlanoAnterior} onCheckedChange={setPossuiPlanoAnterior} />
              <Label className="text-sm text-foreground">Possui plano anterior (portabilidade de carência)?</Label>
            </div>

            <Separator className="my-4 bg-border/20" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/40 rounded-lg border border-border/20">
              <FileUp className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Importar vendas em massa</p>
                <p className="text-xs text-muted-foreground mt-0.5">Baixe o modelo, preencha e faça upload.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40">
                  <Download className="w-3.5 h-3.5" /> Modelo
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <SectionHeader icon={User} title={isEmpresa ? 'Dados da Empresa' : 'Dados do Titular'} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWithTooltip label={isEmpresa ? 'Razão Social' : 'Nome Completo'} tooltip={isEmpresa ? 'Razão social conforme cartão CNPJ.' : 'Nome completo conforme documento.'} required>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder={isEmpresa ? 'Ex: Empresa XYZ Ltda' : 'Ex: João da Silva'} className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              <FieldWithTooltip label={isEmpresa ? 'CNPJ' : 'CPF'} tooltip={isEmpresa ? 'CNPJ com 14 dígitos.' : 'CPF com 11 dígitos.'} required>
                <Input value={formData.cpf_cnpj} onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })} placeholder={isEmpresa ? '00.000.000/0000-00' : '000.000.000-00'} className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              <FieldWithTooltip label="E-mail de Contato" tooltip="E-mail principal para comunicação." required>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              <FieldWithTooltip label="Telefone" tooltip="Telefone com DDD." required>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(11) 99999-9999" className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              <div className="sm:col-span-2">
                <FieldWithTooltip label="Endereço Completo" tooltip="Endereço com rua, número, bairro, cidade e CEP." required>
                  <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade - UF, CEP" className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
                </FieldWithTooltip>
              </div>
              <FieldWithTooltip label="Valor do Contrato (R$)" tooltip="Valor total do contrato para contabilização de faturamento." required>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                  <Input type="number" min={0} step={0.01} value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" className="pl-10 h-11 bg-muted/30 border-border/40 focus:bg-card" />
                </div>
              </FieldWithTooltip>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <SectionHeader icon={User} title="Beneficiários" subtitle="Adicione as vidas que farão parte deste plano" />
            {beneficiarios.length > 0 && (
              <div className="space-y-2">
                {beneficiarios.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg border border-border/30 bg-muted/20 hover:border-primary/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{b.nome}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.tipo}{b.is_conjuge ? ' • Cônjuge' : ''}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeBeneficiario(i)} className="text-destructive hover:text-destructive shrink-0 h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="border border-dashed border-primary/20 rounded-lg p-5 bg-primary/[0.02] space-y-3">
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.12em]">Novo Beneficiário</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Nome completo" value={newBenef.nome} onChange={(e) => setNewBenef({ ...newBenef, nome: e.target.value })} className="h-10 bg-muted/30 border-border/40" />
                <Select value={newBenef.tipo} onValueChange={(v) => setNewBenef({ ...newBenef, tipo: v })}>
                  <SelectTrigger className="h-10 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="titular">Titular</SelectItem>
                    <SelectItem value="dependente">Dependente</SelectItem>
                    <SelectItem value="socio">Sócio</SelectItem>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch checked={newBenef.is_conjuge} onCheckedChange={(v) => setNewBenef({ ...newBenef, is_conjuge: v })} />
                  <Label className="text-xs">Cônjuge?</Label>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={addBeneficiario} className="gap-1.5 border-border/40">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <SectionHeader icon={FileText} title="Documentos Obrigatórios" subtitle="Todos os documentos marcados com * são obrigatórios para aprovação" />
            {getDocumentos().map((doc) => {
              const uploaded = getDocFile(doc.label);
              return (
                <div key={doc.label} className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-colors",
                  uploaded ? "border-success/30 bg-success/5" : doc.required ? "border-border/30 bg-muted/20" : "border-border/20 bg-muted/10"
                )}>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{doc.label}</span>
                      {doc.required && <span className="text-xs text-destructive font-bold">*</span>}
                      <Tooltip>
                        <TooltipTrigger tabIndex={-1}><Info className="w-3.5 h-3.5 text-muted-foreground/50" /></TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-xs">{doc.tip}</TooltipContent>
                      </Tooltip>
                    </div>
                    {uploaded && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {uploaded.name}</p>}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocUpload(doc.label, file);
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> {uploaded ? 'Trocar' : 'Upload'}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <SectionHeader icon={CheckCircle2} title="Revisão Final" subtitle="Confira todos os dados antes de enviar" />
            <div className="space-y-2 text-sm">
              {[
                ['Modalidade', modalidade?.replace(/_/g, ' ').toUpperCase() || '—'],
                [isEmpresa ? 'Razão Social' : 'Titular', formData.nome || '—'],
                [isEmpresa ? 'CNPJ' : 'CPF', formData.cpf_cnpj || '—'],
                ['E-mail', formData.email || '—'],
                ['Telefone', formData.telefone || '—'],
                ['Endereço', formData.endereco || '—'],
                ['Valor do Contrato', valorVenda ? `R$ ${parseFloat(valorVenda).toFixed(2)}` : '—'],
                ['Beneficiários', `${beneficiarios.length} vida(s)`],
                ['Portabilidade', possuiPlanoAnterior ? 'Sim' : 'Não'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Documentos Anexados</p>
              {getDocumentos().map(doc => {
                const uploaded = getDocFile(doc.label);
                return (
                  <div key={doc.label} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                    <span className="text-muted-foreground">{doc.label} {doc.required && '*'}</span>
                    <span className={cn("font-medium", uploaded ? "text-success" : "text-destructive")}>
                      {uploaded ? `✓ ${uploaded.name}` : 'Não enviado'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-primary/[0.03] rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Notificação automática ao finalizar</p>
              <p className="text-xs text-foreground">Supervisor: {supervisor?.nome_completo || '—'} ({supervisor?.email || '—'})</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-warning/8 border border-warning/15 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-foreground">Verifique todos os dados e documentos. Pendências atrasam a aprovação.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="h-11 border-border/40">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-primary hover:bg-primary/90 text-primary-foreground h-11">
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleFinalize} className="bg-success hover:bg-success/90 text-success-foreground font-bold h-11 shadow-brand">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Venda
          </Button>
        )}
      </div>

      {/* Modal de Confirmação da Venda */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Envio da Venda</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              A venda será enviada para análise. O supervisor e gerente serão notificados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2 max-h-[50vh] overflow-y-auto">
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Titular</span>
              <span className="font-medium text-foreground">{formData.nome}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Modalidade</span>
              <span className="font-medium text-foreground">{modalidade?.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Valor do Contrato</span>
              <span className="font-medium text-foreground">R$ {parseFloat(valorVenda || '0').toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Vidas</span>
              <span className="font-medium text-foreground">{beneficiarios.length}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Documentos</span>
              <span className="font-medium text-foreground">{docUploads.filter(d => d.file).length} anexados</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmVenda} className="bg-success hover:bg-success/90 text-success-foreground font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*              PÁGINA COMERCIAL                   */
/* ═══════════════════════════════════════════════ */
const Comercial = () => {
  return (
    <div className="max-w-5xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Comercial</h1>
        <p className="text-sm text-muted-foreground mt-1">Atividades diárias e vendas</p>
      </div>

      <Tabs defaultValue="atividades" className="space-y-6">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="atividades" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
            <ClipboardList className="w-4 h-4" /> Atividades
          </TabsTrigger>
          <TabsTrigger value="nova-venda" className="gap-1.5 py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand font-semibold text-sm rounded-md">
            <ShoppingCart className="w-4 h-4" /> Nova Venda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atividades"><AtividadesTab /></TabsContent>
        <TabsContent value="nova-venda"><NovaVendaTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Comercial;
