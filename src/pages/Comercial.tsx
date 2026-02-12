import { useState, useRef, useMemo } from 'react';
import { format, isToday, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, Info, Save,
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
import { maskPhone } from '@/lib/masks';

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

/* ─── CSV helpers ─── */
function generateCSV(headers: string[], filename: string) {
  const bom = '\uFEFF';
  const csvContent = bom + headers.join(';') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadAtividadesModelo() {
  generateCSV(
    ['Data (dd/mm/aaaa)', 'Ligações', 'Mensagens', 'Cotações Coletadas', 'Cotações Enviadas', 'Cotações Respondidas', 'Cotações Não Respondidas', 'Follow-up'],
    'modelo_atividades.csv'
  );
  toast.success('Modelo de atividades baixado!');
}

function downloadVendasModelo() {
  generateCSV(
    ['Nome Titular', 'Modalidade (PF/Familiar/PME Multi/Empresarial)', 'Vidas', 'Valor Contrato', 'Possui Plano Anterior (Sim/Não)', 'Observações'],
    'modelo_vendas.csv'
  );
  toast.success('Modelo de vendas baixado!');
}

interface ParsedAtividade {
  data: string;
  ligacoes: number;
  mensagens: number;
  cotacoes_coletadas: number;
  cotacoes_enviadas: number;
  cotacoes_respondidas: number;
  cotacoes_nao_respondidas: number;
  follow_up: number;
}

function parseCSVAtividades(text: string): ParsedAtividade[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows: ParsedAtividade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim());
    if (cols.length < 8) continue;
    // Parse dd/mm/yyyy to yyyy-mm-dd
    const dateParts = cols[0].split('/');
    let dataStr = cols[0];
    if (dateParts.length === 3) {
      dataStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    }
    rows.push({
      data: dataStr,
      ligacoes: parseInt(cols[1]) || 0,
      mensagens: parseInt(cols[2]) || 0,
      cotacoes_coletadas: parseInt(cols[3]) || 0,
      cotacoes_enviadas: parseInt(cols[4]) || 0,
      cotacoes_respondidas: parseInt(cols[5]) || 0,
      cotacoes_nao_respondidas: parseInt(cols[6]) || 0,
      follow_up: parseInt(cols[7]) || 0,
    });
  }
  return rows;
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
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkData, setBulkData] = useState<ParsedAtividade[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
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

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVAtividades(text);
      if (parsed.length === 0) {
        toast.error('Nenhum registro válido encontrado no arquivo.');
        return;
      }
      setBulkData(parsed);
      setShowBulkConfirm(true);
    };
    reader.readAsText(file);
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const confirmBulkSave = async () => {
    setBulkSaving(true);
    try {
      for (const row of bulkData) {
        await createAtividade.mutateAsync({
          data: row.data,
          ligacoes: row.ligacoes,
          mensagens: row.mensagens,
          cotacoes_enviadas: row.cotacoes_enviadas,
          cotacoes_fechadas: row.cotacoes_respondidas,
          follow_up: row.follow_up,
        });
      }
      toast.success(`${bulkData.length} registro(s) importado(s) com sucesso!`);
      setShowBulkConfirm(false);
      setBulkData([]);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar atividades.');
    } finally {
      setBulkSaving(false);
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
            <p className="text-xs text-muted-foreground">A justificativa é obrigatória e será enviada para <strong>{supervisor?.nome_completo || 'Supervisor'}</strong>.</p>
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

        {/* Import */}
        <Separator className="my-6 bg-border/20" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/40 rounded-lg border border-border/20">
          <FileUp className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Importar atividades em massa</p>
            <p className="text-xs text-muted-foreground mt-0.5">Preencha o modelo CSV e faça o upload.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40" onClick={downloadAtividadesModelo}>
              <Download className="w-3.5 h-3.5" /> Modelo
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40" onClick={() => uploadRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Upload
            </Button>
            <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
          </div>
        </div>
      </div>

      {/* ── Hierarquia ── */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <SectionHeader icon={User} title="Hierarquia" subtitle="Notificação automática enviada ao supervisor e gerente" />
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
          disabled={!canSave}
          size="lg"
          className="gradient-hero text-white font-bold px-8 h-14 shadow-brand text-sm tracking-wide rounded-full hover:scale-105 transition-transform"
        >
          <Save className="w-5 h-5 mr-2" /> REGISTRAR ATIVIDADES
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
            <Button onClick={confirmSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação - Importação em massa */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Importação em Massa</DialogTitle>
            <DialogDescription>Revise os {bulkData.length} registro(s) antes de confirmar.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-3 py-2">
            {bulkData.map((row, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border/20 space-y-1">
                <p className="text-xs font-bold text-foreground">
                  📅 {row.data.split('-').reverse().join('/')}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Ligações: <strong className="text-foreground">{row.ligacoes}</strong></span>
                  <span className="text-muted-foreground">Mensagens: <strong className="text-foreground">{row.mensagens}</strong></span>
                  <span className="text-muted-foreground">Cot. Coletadas: <strong className="text-foreground">{row.cotacoes_coletadas}</strong></span>
                  <span className="text-muted-foreground">Cot. Enviadas: <strong className="text-foreground">{row.cotacoes_enviadas}</strong></span>
                  <span className="text-muted-foreground">Cot. Respondidas: <strong className="text-foreground">{row.cotacoes_respondidas}</strong></span>
                  <span className="text-muted-foreground">Cot. Não Resp.: <strong className="text-foreground">{row.cotacoes_nao_respondidas}</strong></span>
                  <span className="text-muted-foreground">Follow-up: <strong className="text-foreground">{row.follow_up}</strong></span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowBulkConfirm(false); setBulkData([]); }}>Cancelar</Button>
            <Button onClick={confirmBulkSave} disabled={bulkSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {bulkSaving ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar {bulkData.length} registro(s)</>
              )}
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

type Modalidade = 'pf' | 'familiar' | 'pme_1' | 'pme_multi' | 'empresarial_10' | 'adesao';

interface BeneficiarioData {
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  is_conjuge: boolean;
  docs: Record<string, File | null>;
}

const STEPS = ['Modalidade', 'Dados Titular', 'Beneficiários', 'Documentos', 'Revisão'];

function getRequiredDocsForPerson(modalidade: Modalidade, isConjuge: boolean, possuiPlanoAnterior: boolean, isTitular: boolean) {
  const docs: { label: string; required: boolean }[] = [
    { label: 'Documento com foto', required: true },
    { label: 'Comprovante de endereço', required: true },
  ];

  if (isConjuge) {
    docs.push({ label: 'Certidão de casamento', required: true });
  }

  if (['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade) && isTitular) {
    docs.push({ label: 'Numeração do CNPJ', required: true });
  }

  if (modalidade === 'empresarial_10') {
    docs.push({ label: 'Comprovação de vínculo (FGTS/eSocial/CTPS/Holerite)', required: true });
  }

  if (possuiPlanoAnterior) {
    docs.push(
      { label: 'Foto Carteirinha do plano anterior', required: true },
      { label: 'Carta de permanência (PDF)', required: true },
      { label: 'Últimos 3 boletos pagos', required: false },
      { label: 'Últimos 3 comprovantes', required: false },
    );
  }

  return docs;
}

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
  const [valorContrato, setValorContrato] = useState('');
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', endereco: '', cnpj: '' });
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioData[]>([]);
  const [newBenef, setNewBenef] = useState<BeneficiarioData>({ nome: '', email: '', telefone: '', tipo: 'dependente', is_conjuge: false, docs: {} });
  const [titularDocs, setTitularDocs] = useState<Record<string, File | null>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const uploadRefVendas = useRef<HTMLInputElement>(null);

  const isEmpresa = ['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade as string);
  const needsBeneficiarios = ['familiar', 'pme_multi', 'empresarial_10', 'adesao'].includes(modalidade as string);

  const addBeneficiario = () => {
    if (!newBenef.nome.trim()) { toast.error('Informe o nome do beneficiário.'); return; }
    if (!newBenef.email.trim()) { toast.error('Informe o e-mail do beneficiário.'); return; }
    if (!newBenef.telefone.trim()) { toast.error('Informe o telefone do beneficiário.'); return; }
    setBeneficiarios([...beneficiarios, { ...newBenef }]);
    setNewBenef({ nome: '', email: '', telefone: '', tipo: 'dependente', is_conjuge: false, docs: {} });
  };

  const removeBeneficiario = (idx: number) => setBeneficiarios(beneficiarios.filter((_, i) => i !== idx));

  const titularRequiredDocs = modalidade ? getRequiredDocsForPerson(modalidade as Modalidade, false, possuiPlanoAnterior, true) : [];

  const canNext = () => {
    if (step === 0) return modalidade !== '';
    if (step === 1) {
      const base = formData.nome && formData.email && formData.telefone && formData.endereco && valorContrato;
      if (isEmpresa) return base && formData.cnpj;
      return base;
    }
    if (step === 2) {
      if (needsBeneficiarios && beneficiarios.length === 0) return false;
      return true;
    }
    if (step === 3) {
      const titularOk = titularRequiredDocs.filter(d => d.required).every(d => titularDocs[d.label]);
      if (!titularOk) return false;
      for (const b of beneficiarios) {
        const bDocs = getRequiredDocsForPerson(modalidade as Modalidade, b.is_conjuge, possuiPlanoAnterior, false);
        const bOk = bDocs.filter(d => d.required).every(d => b.docs[d.label]);
        if (!bOk) return false;
      }
      return true;
    }
    return true;
  };

  const handleTitularDocUpload = (label: string, file: File) => {
    setTitularDocs(prev => ({ ...prev, [label]: file }));
  };

  const handleBenefDocUpload = (bIdx: number, label: string, file: File) => {
    setBeneficiarios(prev => {
      const updated = [...prev];
      updated[bIdx] = { ...updated[bIdx], docs: { ...updated[bIdx].docs, [label]: file } };
      return updated;
    });
  };

  const handleFinalize = () => setShowConfirm(true);

  const handleBulkUploadVendas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info(`Arquivo "${file.name}" selecionado. Processamento em massa em desenvolvimento.`);
    if (uploadRefVendas.current) uploadRefVendas.current.value = '';
  };

  const confirmVenda = async () => {
    try {
      const modalidadeMap: Record<string, string> = {
        pf: 'PF', familiar: 'Familiar', pme_1: 'PME Multi', pme_multi: 'PME Multi', empresarial_10: 'Empresarial', adesao: 'Adesão'
      };
      const venda = await createVenda.mutateAsync({
        nome_titular: formData.nome,
        modalidade: modalidadeMap[modalidade] || 'PF',
        vidas: (beneficiarios.length || 0) + 1,
        valor: parseFloat(valorContrato) || undefined,
        observacoes: possuiPlanoAnterior ? 'Portabilidade de carência' : undefined,
      });

      if (user) {
        for (const [label, file] of Object.entries(titularDocs)) {
          if (file) await uploadVendaDocumento(venda.id, user.id, file, `Titular - ${label}`);
        }
        for (const b of beneficiarios) {
          for (const [label, file] of Object.entries(b.docs)) {
            if (file) await uploadVendaDocumento(venda.id, user.id, file, `${b.nome} - ${label}`);
          }
        }
      }

      setShowConfirm(false);
      toast.success('Venda enviada para análise!');
      setStep(0);
      setModalidade('');
      setFormData({ nome: '', email: '', telefone: '', endereco: '', cnpj: '' });
      setBeneficiarios([]);
      setTitularDocs({});
      setValorContrato('');
      setPossuiPlanoAnterior(false);
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
            <SectionHeader icon={ShoppingCart} title="Selecione a Modalidade" subtitle="Cada modalidade possui documentação específica" />
            <FieldWithTooltip label="Modalidade do Plano" tooltip="Escolha o tipo de plano para esta venda." required>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Escolha a modalidade..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pf">Pessoa Física (PF)</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="pme_1">PME (1 Vida)</SelectItem>
                  <SelectItem value="pme_multi">PME (Multi Vidas)</SelectItem>
                  <SelectItem value="empresarial_10">Empresarial (10+ vidas)</SelectItem>
                  <SelectItem value="adesao">Adesão</SelectItem>
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
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40" onClick={downloadVendasModelo}>
                  <Download className="w-3.5 h-3.5" /> Modelo
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40" onClick={() => uploadRefVendas.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Upload
                </Button>
                <input ref={uploadRefVendas} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkUploadVendas} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <SectionHeader icon={User} title={isEmpresa ? 'Dados da Empresa / Titular' : 'Dados do Titular'} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWithTooltip label={isEmpresa ? 'Razão Social / Nome' : 'Nome Completo'} tooltip="Nome conforme documento." required>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              <FieldWithTooltip label="E-mail" tooltip="E-mail principal para comunicação." required>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              <FieldWithTooltip label="Telefone" tooltip="Telefone com DDD." required>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })} placeholder="+55 (11) 90000-0000" className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
              </FieldWithTooltip>
              {isEmpresa && (
                <FieldWithTooltip label="CNPJ" tooltip="CNPJ da empresa." required>
                  <Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
                </FieldWithTooltip>
              )}
              <div className="sm:col-span-2">
                <FieldWithTooltip label="Endereço Completo" tooltip="Endereço com rua, número, bairro, cidade e CEP." required>
                  <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="h-11 bg-muted/30 border-border/40 focus:bg-card" />
                </FieldWithTooltip>
              </div>
              <FieldWithTooltip label="Valor do Contrato (R$)" tooltip="Valor total do contrato." required>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                  <Input type="number" min={0} step={0.01} value={valorContrato} onChange={(e) => setValorContrato(e.target.value)} placeholder="0,00" className="pl-10 h-11 bg-muted/30 border-border/40 focus:bg-card" />
                </div>
              </FieldWithTooltip>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <SectionHeader icon={User} title="Beneficiários" subtitle={needsBeneficiarios ? 'Adicione todas as vidas que farão parte do plano' : 'Opcional para esta modalidade'} />
            {beneficiarios.length > 0 && (
              <div className="space-y-2">
                {beneficiarios.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg border border-border/30 bg-muted/20">
                    <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{b.nome}</p>
                      <p className="text-xs text-muted-foreground">{b.email} • {b.telefone}{b.is_conjuge ? ' • Cônjuge' : ''}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeBeneficiario(i)} className="text-destructive h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="border border-dashed border-primary/20 rounded-lg p-5 bg-primary/[0.02] space-y-3">
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.12em]">Novo Beneficiário</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Nome completo *" value={newBenef.nome} onChange={(e) => setNewBenef({ ...newBenef, nome: e.target.value })} className="h-10 bg-muted/30 border-border/40" />
                <Input type="email" placeholder="E-mail *" value={newBenef.email} onChange={(e) => setNewBenef({ ...newBenef, email: e.target.value })} className="h-10 bg-muted/30 border-border/40" />
                <Input placeholder="Telefone *" value={newBenef.telefone} onChange={(e) => setNewBenef({ ...newBenef, telefone: maskPhone(e.target.value) })} className="h-10 bg-muted/30 border-border/40" />
                <Select value={newBenef.tipo} onValueChange={(v) => setNewBenef({ ...newBenef, tipo: v })}>
                  <SelectTrigger className="h-10 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dependente">Dependente</SelectItem>
                    <SelectItem value="socio">Sócio</SelectItem>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newBenef.is_conjuge} onCheckedChange={(v) => setNewBenef({ ...newBenef, is_conjuge: v })} />
                <Label className="text-xs">Cônjuge?</Label>
              </div>
              <Button variant="outline" size="sm" onClick={addBeneficiario} className="gap-1.5 border-border/40">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <SectionHeader icon={FileText} title="Documentos Obrigatórios" subtitle="Documentos marcados com * são obrigatórios" />
            
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" /> Titular: {formData.nome}
              </h3>
              {titularRequiredDocs.map((doc) => (
                <DocUploadRow
                  key={doc.label}
                  label={doc.label}
                  required={doc.required}
                  file={titularDocs[doc.label] || null}
                  onUpload={(file) => handleTitularDocUpload(doc.label, file)}
                />
              ))}
            </div>

            {beneficiarios.map((b, bIdx) => {
              const bDocs = getRequiredDocsForPerson(modalidade as Modalidade, b.is_conjuge, possuiPlanoAnterior, false);
              return (
                <div key={bIdx} className="space-y-3 pt-4 border-t border-border/20">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> {b.nome} {b.is_conjuge ? '(Cônjuge)' : `(${b.tipo})`}
                  </h3>
                  {bDocs.map((doc) => (
                    <DocUploadRow
                      key={doc.label}
                      label={doc.label}
                      required={doc.required}
                      file={b.docs[doc.label] || null}
                      onUpload={(file) => handleBenefDocUpload(bIdx, doc.label, file)}
                    />
                  ))}
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
                ['Titular', formData.nome || '—'],
                ['E-mail', formData.email || '—'],
                ['Telefone', formData.telefone || '—'],
                ['Endereço', formData.endereco || '—'],
                ...(isEmpresa ? [['CNPJ', formData.cnpj || '—']] : []),
                ['Valor do Contrato', valorContrato ? `R$ ${parseFloat(valorContrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'],
                ['Total de Vidas', `${(beneficiarios.length || 0) + 1}`],
                ['Portabilidade', possuiPlanoAnterior ? 'Sim' : 'Não'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {beneficiarios.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Beneficiários</p>
                {beneficiarios.map((b, i) => (
                  <div key={i} className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                    <span className="text-muted-foreground">{b.nome}</span>
                    <span className="text-xs text-foreground">{b.email} • {b.telefone}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Documentos Anexados</p>
              <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                <span className="text-muted-foreground">Titular</span>
                <span className="font-medium text-success">{Object.values(titularDocs).filter(Boolean).length} doc(s)</span>
              </div>
              {beneficiarios.map((b, i) => (
                <div key={i} className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                  <span className="text-muted-foreground">{b.nome}</span>
                  <span className="font-medium text-success">{Object.values(b.docs).filter(Boolean).length} doc(s)</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-primary/[0.03] rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Notificação automática ao finalizar</p>
              <p className="text-xs text-foreground">Supervisor: {supervisor?.nome_completo || '—'}</p>
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
          <Button onClick={handleFinalize} disabled={!canNext()} className="bg-success hover:bg-success/90 text-success-foreground font-bold h-11 shadow-brand">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Venda
          </Button>
        )}
      </div>

      {/* Modal de Confirmação Venda */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Envio da Venda</DialogTitle>
            <DialogDescription>A venda será enviada para análise. Supervisor e gerente serão notificados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Titular</span>
              <span className="font-medium text-foreground">{formData.nome}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Valor do Contrato</span>
              <span className="font-medium text-foreground">R$ {parseFloat(valorContrato || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Total Vidas</span>
              <span className="font-medium text-foreground">{(beneficiarios.length || 0) + 1}</span>
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

/* ─── Doc Upload Row ─── */
function DocUploadRow({ label, required, file, onUpload }: { label: string; required: boolean; file: File | null; onUpload: (f: File) => void }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3.5 rounded-lg border transition-colors",
      file ? "border-success/30 bg-success/5" : required ? "border-border/30 bg-muted/20" : "border-border/20 bg-muted/10"
    )}>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {required && <span className="text-xs text-destructive font-bold">*</span>}
        </div>
        {file && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {file.name}</p>}
      </div>
      <label className="cursor-pointer">
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> {file ? 'Trocar' : 'Upload'}
        </span>
      </label>
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
