import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronRight, ChevronLeft, Upload, AlertCircle, CalendarIcon, DollarSign,
  ShoppingCart, FileText, Plus, Trash2, Download, FileUp,
  CheckCircle2, User, Building2, Users, Heart, Briefcase, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProfile, useSupervisorProfile } from '@/hooks/useProfile';
import { useCreateVenda, uploadVendaDocumento } from '@/hooks/useVendas';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { useCompanhias, useProdutos, useModalidades, useLeads } from '@/hooks/useInventario';
import { maskPhone, maskCurrency, unmaskCurrency } from '@/lib/masks';

/* ─── Shared ─── */
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
          {!required && <Badge variant="outline" className="text-[9px]">Opcional</Badge>}
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

/* ─── Types ─── */
type VendaModalidade = 'PF' | 'Familiar' | 'PME Multi' | 'Empresarial' | 'Adesão';

interface TitularData {
  nome: string;
  idade: string;
  produto_id: string;
}

interface DependenteData {
  nome: string;
  idade: string;
  produto_id: string;
  descricao: string;
  descricao_custom: string;
  is_conjuge: boolean;
}

const DESCRICAO_OPTIONS = ['Cônjuge', 'Filho(a)', 'Sobrinho(a)', 'Enteado(a)', 'Mãe/Pai', 'Outro'];

const STEPS = ['Formulário de Venda', 'Documentos', 'Revisão'];

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

export default function SalesWizard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const createVenda = useCreateVenda();
  const logAction = useLogAction();
  const location = useLocation();

  // Inventário data
  const { data: companhias = [] } = useCompanhias();
  const { data: produtos = [] } = useProdutos();
  const { data: modalidades = [] } = useModalidades();
  const { data: leads = [] } = useLeads();

  // Wizard state
  const [step, setStep] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [vendaSaving, setVendaSaving] = useState(false);

  // Step 0 - Modalidade
  const [modalidade, setModalidade] = useState<VendaModalidade | ''>('');
  const [possuiAproveitamento, setPossuiAproveitamento] = useState(false);

  // Step 1 - Formulário
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [justificativa, setJustificativa] = useState('');
  const [companhiaId, setCompanhiaId] = useState('');
  const [dataVigencia, setDataVigencia] = useState<Date | undefined>();
  const [vendaDental, setVendaDental] = useState(false);
  const [qtdVidas, setQtdVidas] = useState('');
  const [qtdVidasEditavel, setQtdVidasEditavel] = useState(true);
  const [leadId, setLeadId] = useState('');
  const [coParticipacao, setCoParticipacao] = useState('sem');
  const [estagiarios, setEstagiarios] = useState(false);
  const [qtdEstagiarios, setQtdEstagiarios] = useState('');
  const [titulares, setTitulares] = useState<TitularData[]>([{ nome: '', idade: '', produto_id: '' }]);
  const [dependentes, setDependentes] = useState<DependenteData[]>([]);
  const [valorContrato, setValorContrato] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [obsLinhas, setObsLinhas] = useState<string[]>(['']);

  // Step 2 - Documentos
  const [titularDocs, setTitularDocs] = useState<Record<string, File | null>>({});
  const [aproveitamentoDocs, setAproveitamentoDocs] = useState<Record<string, File | null>>({});
  const [benefDocs, setBenefDocs] = useState<Record<string, Record<string, File | null>>>({});

  // Upload ref for bulk
  const uploadRef = useRef<HTMLInputElement>(null);

  // Prefill from CRM lead
  useEffect(() => {
    const prefillLead = (location.state as any)?.prefillLead;
    if (prefillLead) {
      // Set modalidade from lead tipo
      const tipo = prefillLead.tipo as VendaModalidade;
      if (['PF', 'Familiar', 'PME Multi', 'Empresarial', 'Adesão'].includes(tipo)) {
        setModalidade(tipo);
        handleModalidadeChange(tipo);
      }
      // Set lead
      setLeadId(prefillLead.id);
      // Set titular from lead
      if (prefillLead.nome) {
        setTitulares([{ nome: prefillLead.nome, idade: prefillLead.idade ? String(prefillLead.idade) : '', produto_id: '' }]);
      }
      // Stay on step 0 (combined form)
      setStep(0);
      toast.info('Dados do lead pré-carregados do CRM!');
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Computed
  const isRetroativo = !isToday(dataLancamento);
  const isEmpresa = modalidade === 'PME Multi' || modalidade === 'Empresarial';

  // Filter leads to show ONLY the current user's leads
  const filteredLeads = useMemo(() => {
    if (!user) return [];
    return leads.filter(l => l.created_by === user.id);
  }, [leads, user]);

  // Selected lead
  const selectedLead = leads.find(l => l.id === leadId);

  // Modalidade from Inventário
  const selectedModalidade = modalidades.find(m => m.nome === modalidade);

  // Update qtdVidas when modalidade changes
  const handleModalidadeChange = (val: VendaModalidade) => {
    setModalidade(val);
    const mod = modalidades.find(m => m.nome === val);
    if (mod) {
      const isIndef = mod.quantidade_vidas.toLowerCase() === 'indefinido';
      setQtdVidasEditavel(isIndef);
      if (!isIndef) {
        setQtdVidas(mod.quantidade_vidas);
      } else {
        setQtdVidas('');
      }
    } else {
      setQtdVidasEditavel(true);
      setQtdVidas('');
    }
  };

  // Filtered products by companhia
  const filteredProdutos = useMemo(() => {
    if (!companhiaId) return produtos;
    return produtos.filter(p => p.companhia_id === companhiaId);
  }, [produtos, companhiaId]);

  const getProductName = (id: string) => produtos.find(p => p.id === id)?.nome || '—';
  const getCompanhiaNome = (id: string) => companhias.find(c => c.id === id)?.nome || '—';

  // Titular management
  const updateTitular = (idx: number, field: keyof TitularData, value: string) => {
    setTitulares(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };
  const addTitular = () => setTitulares(prev => [...prev, { nome: '', idade: '', produto_id: '' }]);
  const removeTitular = (idx: number) => { if (titulares.length > 1) setTitulares(prev => prev.filter((_, i) => i !== idx)); };

  // Dependente management
  const updateDependente = (idx: number, field: keyof DependenteData, value: string | boolean) => {
    setDependentes(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };
  const addDependente = () => setDependentes(prev => [...prev, { nome: '', idade: '', produto_id: '', descricao: 'Filho(a)', descricao_custom: '', is_conjuge: false }]);
  const removeDependente = (idx: number) => setDependentes(prev => prev.filter((_, i) => i !== idx));

  // Documents logic
  const getBenefDocs = (isConjuge: boolean) => {
    const docs: { label: string; required: boolean }[] = [
      { label: 'Documento com foto', required: true },
      { label: 'Comprovante de endereço', required: true },
    ];
    if (isConjuge) docs.push({ label: 'Certidão de casamento', required: true });
    if (modalidade === 'Empresarial') docs.push({ label: 'Comprovação de vínculo (FGTS/Holerite/CTPS)', required: true });
    return docs;
  };

  const aproveitamentoDefs = possuiAproveitamento ? [
    { label: 'Foto Carteirinha Anterior', required: true },
    { label: 'Carta de Permanência (PDF)', required: true },
    { label: 'Últimos 3 boletos pagos', required: false },
  ] : [];

  // Validation - fixed to properly sync doc state
  const canNext = () => {
    if (step === 0) {
      // Combined Modalidade + Formulário step
      if (!modalidade) return false;
      if (!companhiaId || !dataVigencia) return false;
      if (!leadId) return false;
      if (!qtdVidas || parseInt(qtdVidas) < 1) return false;
      if (titulares.some(t => !t.nome || !t.idade || !t.produto_id)) return false;
      if (dependentes.some(d => !d.nome || !d.idade || !d.produto_id || !d.descricao)) return false;
      if (!valorContrato || unmaskCurrency(valorContrato) === 0) return false;
      if (isRetroativo && !justificativa.trim()) return false;
      return true;
    }
    if (step === 1) {
      // Documentos step
      if (possuiAproveitamento) {
        const aprovOk = aproveitamentoDefs.filter(d => d.required).every(d => aproveitamentoDocs[d.label]);
        if (!aprovOk) return false;
      }
      const allBenefs = [...titulares.map((_, i) => ({ key: `titular_${i}`, isConjuge: false })), ...dependentes.map((d, i) => ({ key: `dep_${i}`, isConjuge: d.is_conjuge || d.descricao === 'Cônjuge' }))];
      for (const b of allBenefs) {
        const bDocs = getBenefDocs(b.isConjuge);
        const requiredDocs = bDocs.filter(d => d.required);
        for (const rd of requiredDocs) {
          if (!benefDocs[b.key]?.[rd.label]) return false;
        }
      }
      return true;
    }
    return true;
  };

  const confirmVenda = async () => {
    setVendaSaving(true);
    try {
      const totalVidas = titulares.length + dependentes.length;
      const venda = await createVenda.mutateAsync({
        nome_titular: titulares[0]?.nome || selectedLead?.nome || '',
        modalidade: modalidade as string,
        vidas: totalVidas,
        valor: unmaskCurrency(valorContrato) || undefined,
        observacoes: obsLinhas.filter(Boolean).join('\n') || undefined,
        data_lancamento: format(dataLancamento, 'yyyy-MM-dd'),
        justificativa_retroativo: isRetroativo ? justificativa : undefined,
      });

      // Upload all documents
      if (user) {
        for (const [label, file] of Object.entries(titularDocs)) {
          if (file) await uploadVendaDocumento(venda.id, user.id, file, `Principal - ${label}`);
        }
        for (const [label, file] of Object.entries(aproveitamentoDocs)) {
          if (file) await uploadVendaDocumento(venda.id, user.id, file, `Aproveitamento - ${label}`);
        }
        for (const [key, docs] of Object.entries(benefDocs)) {
          for (const [label, file] of Object.entries(docs)) {
            if (file) await uploadVendaDocumento(venda.id, user.id, file, `${key} - ${label}`);
          }
        }
      }

      setShowConfirm(false);
      logAction('criar_venda', 'venda', venda.id, { nome_titular: titulares[0]?.nome, modalidade, valor: unmaskCurrency(valorContrato) });
      toast.success('Venda enviada para análise!');
      // Reset
      setStep(0);
      setModalidade('');
      setPossuiAproveitamento(false);
      setCompanhiaId('');
      setLeadId('');
      setTitulares([{ nome: '', idade: '', produto_id: '' }]);
      setDependentes([]);
      setTitularDocs({});
      setAproveitamentoDocs({});
      setBenefDocs({});
      setValorContrato('');
      setObsLinhas(['']);
      setDataLancamento(new Date());
      setJustificativa('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar venda.');
    } finally {
      setVendaSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        {/* ═══ STEP 0: FORMULÁRIO DE VENDA (includes Modalidade) ═══ */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Modalidade */}
            <div>
              <SectionHeader icon={ShoppingCart} title="Modalidade" subtitle="Cada modalidade possui documentação e regras específicas" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="Modalidade do Plano" tooltip="Escolha o tipo de plano para esta venda." required>
                  <Select value={modalidade} onValueChange={(v) => handleModalidadeChange(v as VendaModalidade)}>
                    <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Escolha a modalidade..." /></SelectTrigger>
                    <SelectContent>
                      {modalidades.map((m) => (
                        <SelectItem key={m.id} value={m.nome}>
                          {m.nome === 'PF' ? 'Pessoa Física (PF)' : m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>

                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20 self-end">
                  <Switch checked={possuiAproveitamento} onCheckedChange={setPossuiAproveitamento} />
                  <Label className="text-sm text-foreground">Plano anterior (Aproveitamento de Carência)?</Label>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/40 rounded-lg border border-border/20">
                <FileUp className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Importar vendas em massa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Selecione uma modalidade para habilitar.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline" size="sm" className="gap-1.5 text-xs border-border/40"
                    disabled={!modalidade}
                    onClick={() => {
                      if (!modalidade) return;
                      const baseHeaders = ['Nome Titular', 'Vidas', 'Valor Contrato', 'Observações'];
                      let extraHeaders: string[] = [];
                      if (modalidade === 'PME Multi' || modalidade === 'Empresarial') extraHeaders = ['CNPJ'];
                      if (modalidade === 'Empresarial') extraHeaders.push('Comprovação de Vínculo');
                      const headers = [...baseHeaders, ...extraHeaders];
                      const bom = '\uFEFF';
                      const csvContent = bom + headers.join(';') + '\n';
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `modelo_vendas_${modalidade.replace(/\s/g, '_')}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(`Modelo para ${modalidade} baixado!`);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> Modelo
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40" disabled={!modalidade} onClick={() => uploadRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </Button>
                  <input ref={uploadRef} type="file" accept=".csv,.xlsx" className="hidden" />
                </div>
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Dados do Consultor */
            <div>
              <SectionHeader icon={User} title="Dados do Consultor" subtitle="Preenchidos automaticamente do seu perfil" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Repasse / Consultor</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.nome_completo || '—'}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Contato</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.celular || '—'}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">E-mail</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.email || '—'}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Data de Lançamento */}
            <FieldWithTooltip label="Data de Lançamento" tooltip="Datas anteriores exigem justificativa obrigatória." required>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal h-11 border-border/40")}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {format(dataLancamento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataLancamento} onSelect={(d) => d && setDataLancamento(d)} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </FieldWithTooltip>

            {isRetroativo && (
              <div className="p-4 bg-warning/8 border border-warning/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-sm font-medium text-foreground">Lançamento retroativo detectado</p>
                </div>
                <p className="text-xs text-muted-foreground">A justificativa é obrigatória.</p>
                <Textarea placeholder="Justifique o motivo do lançamento fora da data correta..." value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={3} className="border-warning/30 focus:border-warning" />
              </div>
            )}

            <Separator className="bg-border/20" />

            {/* Dados da Companhia */}
            <div>
              <SectionHeader icon={Building2} title="Dados da Companhia" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="Nome da Companhia" tooltip="Selecione a companhia do Inventário." required>
                  <Select value={companhiaId} onValueChange={setCompanhiaId}>
                    <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {companhias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>

                <FieldWithTooltip label="Data de Vigência" tooltip="Data de início da vigência do plano." required>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 border-border/40", !dataVigencia && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dataVigencia ? format(dataVigencia, "dd/MM/yyyy") : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataVigencia} onSelect={setDataVigencia} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </FieldWithTooltip>

                <FieldWithTooltip label="Venda c/ Dental" tooltip="Marque se a venda inclui plano dental.">
                  <div className="flex items-center gap-2 h-11">
                    <Switch checked={vendaDental} onCheckedChange={setVendaDental} />
                    <span className="text-sm text-foreground">{vendaDental ? 'Sim' : 'Não'}</span>
                  </div>
                </FieldWithTooltip>

                <FieldWithTooltip label="Quantidade de Vidas" tooltip="Fixo pela modalidade ou editável se indefinido." required>
                  <Input
                    type="number" min={1}
                    value={qtdVidas}
                    onChange={(e) => setQtdVidas(e.target.value)}
                    disabled={!qtdVidasEditavel}
                    className={cn("h-11 border-border/40", !qtdVidasEditavel && "bg-muted/50")}
                  />
                </FieldWithTooltip>

                <FieldWithTooltip label="Redução de Carência" tooltip="Preenchido automaticamente com base no Aproveitamento de Carência.">
                  <div className="h-11 flex items-center px-3 rounded-md border border-border/40 bg-muted/50 text-sm font-medium text-foreground">
                    {possuiAproveitamento ? 'Sim' : 'Não'}
                  </div>
                </FieldWithTooltip>
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Lead / Responsável / Empresa */}
            <div>
              <SectionHeader icon={Users} title={isEmpresa ? 'Dados da Empresa' : 'Dados do Responsável'} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label={isEmpresa ? 'Nome da Empresa' : 'Nome do Responsável'} tooltip="Selecione do cadastro de Leads no Inventário." required>
                  <Select value={leadId} onValueChange={setLeadId}>
                    <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {filteredLeads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>

                <FieldWithTooltip label={isEmpresa ? 'CNPJ' : 'CPF'} tooltip="Preenchido automaticamente do cadastro de Leads.">
                  <div className="h-11 flex items-center px-3 rounded-md border border-border/40 bg-muted/50 text-sm text-foreground">
                    {isEmpresa ? (selectedLead?.cnpj || '—') : (selectedLead?.cpf || '—')}
                  </div>
                </FieldWithTooltip>
              </div>

              {selectedLead && titulares.length > 0 && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                  <Switch
                    checked={false}
                    onCheckedChange={(checked) => {
                      if (checked && selectedLead) {
                        updateTitular(0, 'nome', selectedLead.nome);
                        if (selectedLead.idade) updateTitular(0, 'idade', String(selectedLead.idade));
                        toast.success('Dados do responsável aplicados ao 1º titular!');
                      }
                    }}
                  />
                  <Label className="text-sm text-foreground">Utilizar os dados do responsável para preenchimento do 1º Titular</Label>
                </div>
              )}
            </div>

            <Separator className="bg-border/20" />

            {/* Co-participação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWithTooltip label="Co-Participação" tooltip="Tipo de co-participação do plano." required>
                <Select value={coParticipacao} onValueChange={setCoParticipacao}>
                  <SelectTrigger className="h-11 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Sem Co-Participação</SelectItem>
                    <SelectItem value="parcial">Co-Participação Parcial</SelectItem>
                    <SelectItem value="completa">Co-Participação Completa</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWithTooltip>

              <FieldWithTooltip label="Estagiários" tooltip="Caso possua estagiários, informe a quantidade.">
                <div className="flex items-center gap-3">
                  <Switch checked={estagiarios} onCheckedChange={setEstagiarios} />
                  <span className="text-sm text-foreground">{estagiarios ? 'Sim' : 'Não'}</span>
                  {estagiarios && (
                    <Input type="number" min={1} value={qtdEstagiarios} onChange={(e) => setQtdEstagiarios(e.target.value)} placeholder="Quantos?" className="h-9 w-24 border-border/40" />
                  )}
                </div>
              </FieldWithTooltip>
            </div>

            <Separator className="bg-border/20" />

            {/* Titulares */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={User} title={`Titulares (${titulares.length})`} subtitle="Adicione os titulares do plano" />
                <Button variant="outline" size="sm" className="gap-1.5 border-border/40" onClick={addTitular}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {titulares.map((t, i) => (
                  <div key={i} className="p-4 border border-border/30 rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">Titular {i + 1}</Badge>
                      {titulares.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTitular(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground font-semibold">Nome do Beneficiário *</label>
                        <Input value={t.nome} onChange={(e) => updateTitular(i, 'nome', e.target.value)} className="h-9 border-border/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold">Idade *</label>
                        <Input type="number" min={0} value={t.idade} onChange={(e) => updateTitular(i, 'idade', e.target.value)} className="h-9 border-border/40" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold">Produto *</label>
                        <Select value={t.produto_id} onValueChange={(v) => updateTitular(i, 'produto_id', v)}>
                          <SelectTrigger className="h-9 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {filteredProdutos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold">Descrição</label>
                        <div className="h-9 flex items-center px-3 rounded-md border border-border/40 bg-muted/50 text-sm text-foreground">
                          Titular
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Dependentes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={Heart} title={`Dependentes (${dependentes.length})`} subtitle="Adicione os dependentes, se houver" />
                <Button variant="outline" size="sm" className="gap-1.5 border-border/40" onClick={addDependente}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
              {dependentes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dependente adicionado.</p>
              ) : (
                <div className="space-y-3">
                  {dependentes.map((d, i) => (
                    <div key={i} className="p-4 border border-border/30 rounded-lg bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">Dependente {i + 1}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeDependente(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] text-muted-foreground font-semibold">Nome do Beneficiário *</label>
                          <Input value={d.nome} onChange={(e) => updateDependente(i, 'nome', e.target.value)} className="h-9 border-border/40" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Idade *</label>
                          <Input type="number" min={0} value={d.idade} onChange={(e) => updateDependente(i, 'idade', e.target.value)} className="h-9 border-border/40" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Produto *</label>
                          <Select value={d.produto_id} onValueChange={(v) => updateDependente(i, 'produto_id', v)}>
                            <SelectTrigger className="h-9 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {filteredProdutos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Descrição *</label>
                          <div className="flex gap-2">
                            <Select value={d.descricao} onValueChange={(v) => {
                              updateDependente(i, 'descricao', v);
                              if (v === 'Cônjuge') updateDependente(i, 'is_conjuge', true);
                              else updateDependente(i, 'is_conjuge', false);
                              if (v !== 'Outro') updateDependente(i, 'descricao_custom', '');
                            }}>
                              <SelectTrigger className="h-9 border-border/40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DESCRICAO_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {d.descricao === 'Outro' && (
                              <Input className="h-9 border-border/40" placeholder="Especifique..." value={d.descricao_custom || ''} onChange={(e) => updateDependente(i, 'descricao_custom', e.target.value)} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-end pb-1">
                          {(d.is_conjuge || d.descricao === 'Cônjuge') && (
                            <Badge className="text-[9px] bg-warning/10 text-warning border-warning/20">Certidão obrigatória</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-border/20" />

            {/* Valor */}
            <div className="space-y-4">
              <FieldWithTooltip label="Valor (R$)" tooltip="Valor total do contrato." required>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary/50 font-medium">R$</span>
                  <Input value={valorContrato} onChange={(e) => setValorContrato(maskCurrency(e.target.value))} placeholder="0,00" className="pl-10 h-11 border-border/40" />
                </div>
              </FieldWithTooltip>
            </div>

            {/* Observações - abaixo do valor */}
            <FieldWithTooltip label="Observações" tooltip="Linhas de observação adicionais.">
              <div className="space-y-2">
                {obsLinhas.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={line} onChange={(e) => { const n = [...obsLinhas]; n[i] = e.target.value; setObsLinhas(n); }} className="h-9 border-border/40" placeholder={`Observação ${i + 1}`} />
                    {obsLinhas.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => setObsLinhas(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setObsLinhas(prev => [...prev, ''])}>
                  <Plus className="w-3 h-3" /> Linha
                </Button>
              </div>
            </FieldWithTooltip>
          </div>
        )}

        {/* ═══ STEP 1: DOCUMENTOS ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <SectionHeader icon={FileText} title="Documentos" subtitle="Faça upload dos documentos obrigatórios e opcionais" />

            {selectedLead && (
              <div className="p-3 bg-accent/50 rounded-lg border border-border/30 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Documentos do {isEmpresa ? 'empresa' : 'responsável'} <strong>{selectedLead.nome}</strong> já cadastrados no Inventário serão automaticamente considerados.
                </p>
              </div>
            )}

            {/* Aproveitamento docs */}
            {possuiAproveitamento && (
              <div className="space-y-3 pt-4 border-t border-border/20">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-warning" /> Aproveitamento de Carência
                </h3>
                {aproveitamentoDefs.map(doc => (
                  <DocUploadRow key={doc.label} label={doc.label} required={doc.required} file={aproveitamentoDocs[doc.label] || null} onUpload={(f) => setAproveitamentoDocs(prev => ({ ...prev, [doc.label]: f }))} />
                ))}
              </div>
            )}

            {/* Beneficiary docs */}
            {titulares.map((t, i) => {
              const key = `titular_${i}`;
              const bDocs = getBenefDocs(false);
              return (
                <div key={key} className="space-y-3 pt-4 border-t border-border/20">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> {t.nome || `Titular ${i + 1}`}
                  </h3>
                  {bDocs.map(doc => (
                    <DocUploadRow
                      key={doc.label}
                      label={doc.label}
                      required={doc.required}
                      file={benefDocs[key]?.[doc.label] || null}
                      onUpload={(f) => setBenefDocs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [doc.label]: f } }))}
                    />
                  ))}
                </div>
              );
            })}

            {dependentes.map((d, i) => {
              const key = `dep_${i}`;
              const bDocs = getBenefDocs(d.is_conjuge || d.descricao === 'Cônjuge');
              return (
                <div key={key} className="space-y-3 pt-4 border-t border-border/20">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> {d.nome || `Dependente ${i + 1}`} {d.is_conjuge ? '(Cônjuge)' : `(${d.descricao})`}
                  </h3>
                  {bDocs.map(doc => (
                    <DocUploadRow
                      key={doc.label}
                      label={doc.label}
                      required={doc.required}
                      file={benefDocs[key]?.[doc.label] || null}
                      onUpload={(f) => setBenefDocs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [doc.label]: f } }))}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ STEP 2: REVISÃO ═══ */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionHeader icon={CheckCircle2} title="Revisão Final" subtitle="Confira todos os dados antes de enviar" />
            <div className="space-y-2 text-sm">
              {[
                ['Modalidade', modalidade || '—'],
                ['Aproveitamento de Carência', possuiAproveitamento ? 'Sim' : 'Não'],
                ['Companhia', companhiaId ? getCompanhiaNome(companhiaId) : '—'],
                ['Data de Vigência', dataVigencia ? format(dataVigencia, 'dd/MM/yyyy') : '—'],
                ['Dental', vendaDental ? 'Sim' : 'Não'],
                ['Quantidade de Vidas', qtdVidas || '—'],
                [isEmpresa ? 'Empresa' : 'Responsável', selectedLead?.nome || '—'],
                [isEmpresa ? 'CNPJ' : 'CPF', isEmpresa ? (selectedLead?.cnpj || '—') : (selectedLead?.cpf || '—')],
                ['Co-Participação', coParticipacao === 'sem' ? 'Sem' : coParticipacao === 'parcial' ? 'Parcial' : 'Completa'],
                ['Estagiários', estagiarios ? `Sim (${qtdEstagiarios || 0})` : 'Não'],
                ['Valor', valorContrato ? `R$ ${valorContrato}` : '—'],
                ['Data de Lançamento', format(dataLancamento, 'dd/MM/yyyy')],
                ...(isRetroativo ? [['Justificativa Retroativo', justificativa]] : []),
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Titulares ({titulares.length})</p>
              {titulares.map((t, i) => (
                <div key={i} className="p-2.5 bg-muted/30 rounded-lg text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <span className="font-medium text-foreground col-span-2">{t.nome || '—'}</span>
                  <span className="text-muted-foreground">{t.idade} anos</span>
                  <span className="text-muted-foreground">{getProductName(t.produto_id)}</span>
                </div>
              ))}
            </div>

            {dependentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Dependentes ({dependentes.length})</p>
                {dependentes.map((d, i) => (
                  <div key={i} className="p-2.5 bg-muted/30 rounded-lg text-sm grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <span className="font-medium text-foreground col-span-2">{d.nome || '—'}</span>
                    <span className="text-muted-foreground">{d.idade} anos</span>
                    <span className="text-muted-foreground">{getProductName(d.produto_id)}</span>
                    <span className="text-muted-foreground">{d.descricao === 'Outro' ? d.descricao_custom || 'Outro' : d.descricao}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Documentos Anexados</p>
              {possuiAproveitamento && (
                <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                  <span className="text-muted-foreground">Aproveitamento de Carência</span>
                  <span className="font-medium text-success">{Object.values(aproveitamentoDocs).filter(Boolean).length} doc(s)</span>
                </div>
              )}
              {Object.entries(benefDocs).map(([key, docs]) => (
                <div key={key} className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                  <span className="text-muted-foreground">{key.replace('_', ' ')}</span>
                  <span className="font-medium text-success">{Object.values(docs).filter(Boolean).length} doc(s)</span>
                </div>
              ))}
            </div>

            {obsLinhas.filter(Boolean).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Observações</p>
                {obsLinhas.filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs text-foreground p-2 bg-muted/30 rounded">{line}</p>
                ))}
              </div>
            )}

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

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="h-11 border-border/40">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-primary hover:bg-primary/90 text-primary-foreground h-11">
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} disabled={!canNext()} className="bg-success hover:bg-success/90 text-success-foreground font-bold h-11 shadow-brand">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Venda
          </Button>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Envio da Venda</DialogTitle>
            <DialogDescription>A venda será enviada para análise. Supervisor e gerente serão notificados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Modalidade</span>
              <span className="font-medium text-foreground">{modalidade}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">{isEmpresa ? 'Empresa' : 'Responsável'}</span>
              <span className="font-medium text-foreground">{selectedLead?.nome || '—'}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium text-foreground">R$ {valorContrato || '0,00'}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Total Vidas</span>
              <span className="font-medium text-foreground">{titulares.length + dependentes.length}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmVenda} disabled={vendaSaving} className="bg-success hover:bg-success/90 text-success-foreground font-semibold min-w-[140px]">
              {vendaSaving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Venda</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
