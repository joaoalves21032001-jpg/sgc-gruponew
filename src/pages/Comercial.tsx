import { useState, useRef, useMemo } from 'react';
import { format, isToday, isBefore, startOfDay, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, Info, Save,
  ChevronRight, ChevronLeft, Upload, AlertCircle, CalendarIcon, DollarSign,
  ClipboardList, ShoppingCart, FileUp, Trash2, Plus, TrendingUp, Download,
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
import { maskPhone } from '@/lib/masks';
import { supabase } from '@/integrations/supabase/client';

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
function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

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
  const bom = '\uFEFF';
  const headers = ['Data (dd/mm/aaaa)', 'Ligações', 'Mensagens', 'Cotações Coletadas', 'Cotações Enviadas', 'Cotações Respondidas', 'Cotações Não Respondidas', 'Follow-up'];
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const sampleDate = `${dd}/${mm}/${yyyy}`;
  const sampleRows = [
    `${sampleDate};15;20;8;6;4;2;3`,
    `${sampleDate};10;12;5;3;2;1;2`,
  ];
  const csvContent = bom + headers.join(';') + '\n' + sampleRows.join('\n') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_atividades.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Modelo de atividades baixado!');
}

function downloadVendasModelo() {
  const bom = '\uFEFF';
  const headers = ['Nome Titular', 'Modalidade (PF/Familiar/PME Multi/Empresarial/Adesão)', 'Vidas', 'Valor Contrato', 'Observações'];
  const sampleRows = [
    'João Silva;PF;1;1500.00;',
    'Maria Santos;Familiar;3;3200.00;Portabilidade',
    'Empresa ABC;PME Multi;5;8000.00;CNPJ obrigatório',
  ];
  const csvContent = bom + headers.join(';') + '\n' + sampleRows.join('\n') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_vendas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');
  const sep = detectSeparator(cleanText);
  const lines = cleanText.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows: ParsedAtividade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 8) continue;
    // Parse dd/mm/yyyy to yyyy-mm-dd
    const dateParts = cols[0].split('/');
    let dataStr = cols[0];
    if (dateParts.length === 3) {
      dataStr = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
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

interface ParsedVenda {
  nome_titular: string;
  modalidade: string;
  vidas: number;
  valor: number | null;
  observacoes: string | null;
}

function parseCSVVendas(text: string): ParsedVenda[] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const sep = detectSeparator(cleanText);
  const lines = cleanText.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows: ParsedVenda[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;
    const modalidadeRaw = (cols[1] || '').trim();
    const modalidadeMap: Record<string, string> = {
      'pf': 'PF', 'pessoa física': 'PF', 'familiar': 'Familiar',
      'pme multi': 'PME Multi', 'pme': 'PME Multi',
      'empresarial': 'Empresarial', 'adesão': 'Adesão', 'adesao': 'Adesão',
    };
    const modalidade = modalidadeMap[modalidadeRaw.toLowerCase()] || modalidadeRaw;
    const validModalidades = ['PF', 'Familiar', 'PME Multi', 'Empresarial', 'Adesão'];
    if (!validModalidades.includes(modalidade)) continue;
    
    rows.push({
      nome_titular: cols[0] || '',
      modalidade,
      vidas: parseInt(cols[2]) || 1,
      valor: cols[3] ? parseFloat(cols[3].replace(',', '.')) : null,
      observacoes: cols[4] || null,
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
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const { data: myAtividades } = useMyAtividades();
  const { data: myVendas } = useMyVendas();
  const createAtividade = useCreateAtividade();
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkData, setBulkData] = useState<ParsedAtividade[]>([]);
  const [bulkJustificativas, setBulkJustificativas] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AtividadesForm>({
    ligacoes: '', mensagens: '', cotacoes_coletadas: '', cotacoes_enviadas: '',
    cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '',
  });

  const isRetroativo = !isToday(dataLancamento);

  // Find which bulk dates are retroactive
  const bulkPastDates = bulkData
    .map(row => row.data)
    .filter(d => {
      const date = new Date(d + 'T12:00:00');
      return isBefore(startOfDay(date), startOfDay(new Date()));
    });
  const bulkHasPastDates = bulkPastDates.length > 0;
  const allBulkPastJustified = bulkPastDates.every(d => (bulkJustificativas[d] || '').trim().length > 0);

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
      toast.success('Atividades registradas com sucesso!');
      setForm({ ligacoes: '', mensagens: '', cotacoes_coletadas: '', cotacoes_enviadas: '', cotacoes_respondidas: '', cotacoes_nao_respondidas: '', follow_up: '', justificativa: '' });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar atividades.');
    } finally {
      setSaving(false);
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
      setBulkJustificativas({});
      setShowBulkConfirm(true);
    };
    reader.readAsText(file, 'UTF-8');
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const confirmBulkSave = async () => {
    if (bulkHasPastDates && !allBulkPastJustified) {
      toast.error('Justificativa obrigatória para cada data retroativa.');
      return;
    }
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
            <input ref={uploadRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          </div>
        </div>
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
            <Button onClick={confirmSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-[120px]">
              {saving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar</>}
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

            {bulkHasPastDates && (
              <div className="p-4 bg-warning/8 border border-warning/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-sm font-medium text-foreground">Datas retroativas detectadas</p>
                </div>
                <p className="text-xs text-muted-foreground">Justificativa obrigatória para cada data retroativa.</p>
                {[...new Set(bulkPastDates)].map(dateStr => (
                  <div key={dateStr} className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">📅 {dateStr.split('-').reverse().join('/')}</label>
                    <Textarea
                      placeholder={`Justifique o lançamento de ${dateStr.split('-').reverse().join('/')}...`}
                      value={bulkJustificativas[dateStr] || ''}
                      onChange={(e) => setBulkJustificativas(prev => ({ ...prev, [dateStr]: e.target.value }))}
                      rows={2}
                      className="border-warning/30 focus:border-warning"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowBulkConfirm(false); setBulkData([]); }}>Cancelar</Button>
            <Button onClick={confirmBulkSave} disabled={bulkSaving || (bulkHasPastDates && !allBulkPastJustified)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-[140px]">
              {bulkSaving ? (
                <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Salvando...</>
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
  const { data: profileData } = useProfile();
  const { data: roleData } = useUserRole();
  const atividadesDesabilitadas = profileData?.atividades_desabilitadas === true;
  const isAdmin = roleData === 'administrador';

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Registro de Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">Atividades diárias e registro de vendas</p>
      </div>

      {atividadesDesabilitadas ? (
        /* If activities are disabled for this user, show only Nova Venda */
        <div className="space-y-6">
          <div className="bg-accent/50 rounded-xl p-3 border border-border/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A guia de registro de atividades está desabilitada para o seu perfil. Somente o registro de vendas está disponível.
            </p>
          </div>
          <NovaVendaTab />
        </div>
      ) : (
        <Tabs defaultValue="atividades" className="space-y-6">
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

          <TabsContent value="atividades"><AtividadesTab /></TabsContent>
          <TabsContent value="nova-venda"><NovaVendaTab /></TabsContent>
          <TabsContent value="evolucao"><EvolucaoTab /></TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Comercial;
