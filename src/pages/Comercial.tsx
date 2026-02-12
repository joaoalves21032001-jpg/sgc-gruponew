import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, MapPin, Info, Save,
  ChevronRight, ChevronLeft, Upload, AlertCircle, CalendarIcon, DollarSign,
  ClipboardList, ShoppingCart, FileUp, Trash2, Plus
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ─── Field with Tooltip ─── */
function FieldWithTooltip({ label, tooltip, required, children }: { label: string; tooltip: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {required && <span className="text-destructive text-xs">*</span>}
        <Tooltip>
          <TooltipTrigger tabIndex={-1}>
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*                  TAB: ATIVIDADES                */
/* ═══════════════════════════════════════════════ */
function AtividadesTab() {
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [form, setForm] = useState({
    ligacoes: '',
    mensagens: '',
    cotacoes_enviadas: '',
    cotacoes_fechadas: '',
    follow_up: '',
    justificativa: '',
  });

  const isRetroativo = !isToday(dataLancamento);

  const metrics = [
    { key: 'ligacoes', label: 'Ligações Realizadas', icon: Phone, tooltip: 'Total de ligações de prospecção e follow-up realizadas no dia.' },
    { key: 'mensagens', label: 'Mensagens Enviadas', icon: MessageSquare, tooltip: 'WhatsApp, e-mails e mensagens enviadas a clientes e leads.' },
    { key: 'cotacoes_enviadas', label: 'Cotações Enviadas', icon: FileText, tooltip: 'Propostas comerciais enviadas ao cliente. Esse KPI define sua Patente.' },
    { key: 'cotacoes_fechadas', label: 'Cotações Fechadas', icon: CheckCircle2, tooltip: 'Propostas que o cliente aceitou e viraram venda efetiva.' },
    { key: 'follow_up', label: 'Follow-ups', icon: RotateCcw, tooltip: 'Retornos a clientes que já receberam cotação ou demonstraram interesse.' },
  ] as const;

  const allFilled = metrics.every(m => form[m.key] !== '' && parseInt(form[m.key]) >= 0);
  const canSave = allFilled && (!isRetroativo || form.justificativa.trim().length > 0);

  const handleSave = () => {
    if (!canSave) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    toast.success('Atividades registradas com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Date Picker + GPS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Data do Lançamento *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal", !dataLancamento && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataLancamento ? format(dataLancamento, "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Selecione a data'}
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
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2.5 self-end">
          <MapPin className="w-3.5 h-3.5 text-success" />
          GPS ativo • São Paulo, SP
        </div>
      </div>

      {isRetroativo && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-xs text-foreground">Lançamento retroativo detectado. A justificativa é obrigatória e será enviada ao supervisor.</p>
        </div>
      )}

      {/* Metrics */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
        <h2 className="text-base font-semibold text-foreground font-display">Registrar Atividades</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {metrics.map((m) => (
            <FieldWithTooltip key={m.key} label={m.label} tooltip={m.tooltip} required>
              <div className="flex items-center gap-2">
                <m.icon className="w-4 h-4 text-primary shrink-0" />
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form[m.key]}
                  onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                  className="w-full"
                />
              </div>
            </FieldWithTooltip>
          ))}
        </div>

        {/* Justificativa — só aparece se retroativo */}
        {isRetroativo && (
          <FieldWithTooltip label="Justificativa de Atraso" tooltip="Preencha o motivo do lançamento retroativo. Um e-mail será enviado ao supervisor." required>
            <Textarea
              placeholder="Explique o motivo do lançamento fora da data..."
              value={form.justificativa}
              onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
              rows={3}
            />
          </FieldWithTooltip>
        )}

        <Button onClick={handleSave} disabled={!canSave} className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold">
          <Save className="w-4 h-4 mr-2" />
          Salvar Atividades
        </Button>
      </div>
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

const STEPS = ['Modalidade', 'Dados Titular', 'Beneficiários', 'Documentos', 'Revisão'];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1 shrink-0">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
            i === current ? 'bg-primary text-primary-foreground shadow-brand' :
            i < current ? 'bg-secondary text-secondary-foreground' :
            'bg-muted text-muted-foreground'
          )}>
            {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

function NovaVendaTab() {
  const [step, setStep] = useState(0);
  const [modalidade, setModalidade] = useState<Modalidade | ''>('');
  const [possuiPlanoAnterior, setPossuiPlanoAnterior] = useState(false);
  const [valorVenda, setValorVenda] = useState('');
  const [formData, setFormData] = useState({
    nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '',
  });
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [newBenef, setNewBenef] = useState<Beneficiario>({ nome: '', tipo: 'dependente', is_conjuge: false });

  const isEmpresa = ['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade);

  const addBeneficiario = () => {
    if (!newBenef.nome.trim()) { toast.error('Informe o nome do beneficiário.'); return; }
    setBeneficiarios([...beneficiarios, { ...newBenef }]);
    setNewBenef({ nome: '', tipo: 'dependente', is_conjuge: false });
  };

  const removeBeneficiario = (idx: number) => {
    setBeneficiarios(beneficiarios.filter((_, i) => i !== idx));
  };

  const canNext = () => {
    if (step === 0) return modalidade !== '';
    if (step === 1) return formData.nome && formData.cpf_cnpj && formData.email && formData.telefone && formData.endereco && valorVenda;
    return true;
  };

  const getDocumentos = () => {
    const docs = [
      { label: 'Documento com Foto (RG/CNH)', tip: 'RG, CNH ou outro documento oficial com foto nítida do titular.', required: true },
      { label: 'Comprovante de Endereço', tip: 'Conta de luz, água ou telefone dos últimos 3 meses.', required: true },
    ];
    if (possuiPlanoAnterior) {
      docs.push(
        { label: 'Carteirinha do Plano Anterior', tip: 'Foto da carteirinha do plano de saúde anterior.', required: true },
        { label: 'Carta de Permanência (PDF)', tip: 'Documento emitido pelo RH ou operadora anterior comprovando o tempo de plano. Obrigatório em PDF.', required: true },
        { label: 'Últimos 3 Boletos/Comprovantes', tip: 'Comprovantes de pagamento dos últimos 3 meses do plano anterior (opcional).', required: false },
      );
    }
    if (isEmpresa) {
      docs.push({ label: 'Cartão CNPJ', tip: 'Comprovante de inscrição e situação cadastral da empresa na Receita Federal.', required: true });
    }
    if (modalidade === 'empresarial_10') {
      docs.push({ label: 'Comprovação de Vínculo (FGTS/Holerite/CTPS)', tip: 'Documento comprovando vínculo empregatício: FGTS, Holerite ou Carteira de Trabalho.', required: true });
    }
    if (beneficiarios.some(b => b.is_conjuge)) {
      docs.push({ label: 'Certidão de Casamento', tip: 'Documento exigido para cônjuges incluídos no plano.', required: true });
    }
    return docs;
  };

  return (
    <div className="space-y-6">
      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
        {/* Step 0: Modalidade */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold font-display text-foreground">Selecione a Modalidade</h2>
            <FieldWithTooltip label="Modalidade do Plano" tooltip="Tipo de plano que será contratado. Cada modalidade possui documentação específica." required>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                <SelectTrigger><SelectValue placeholder="Escolha a modalidade..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pf">Pessoa Física (PF)</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="pme_1">PME (1 Vida)</SelectItem>
                  <SelectItem value="pme_multi">PME (Multi Vidas)</SelectItem>
                  <SelectItem value="empresarial_10">Empresarial (10+ vidas)</SelectItem>
                </SelectContent>
              </Select>
            </FieldWithTooltip>
            <div className="flex items-center gap-3">
              <Switch checked={possuiPlanoAnterior} onCheckedChange={setPossuiPlanoAnterior} />
              <Label className="text-sm text-foreground">Possui plano anterior (portabilidade de carência)?</Label>
              <Tooltip>
                <TooltipTrigger tabIndex={-1}><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="max-w-[260px] text-xs">Se o beneficiário possui plano de saúde anterior, documentos adicionais serão solicitados para portabilidade de carência.</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Step 1: Dados Titular */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold font-display text-foreground">
              {isEmpresa ? 'Dados da Empresa' : 'Dados do Titular'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWithTooltip label={isEmpresa ? 'Razão Social' : 'Nome Completo'} tooltip={isEmpresa ? 'Razão social conforme cartão CNPJ.' : 'Nome completo do titular conforme documento.'} required>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder={isEmpresa ? 'Ex: Empresa XYZ Ltda' : 'Ex: João da Silva'} />
              </FieldWithTooltip>
              <FieldWithTooltip label={isEmpresa ? 'CNPJ' : 'CPF'} tooltip={isEmpresa ? 'CNPJ com 14 dígitos conforme Receita Federal.' : 'CPF com 11 dígitos do titular do plano.'} required>
                <Input value={formData.cpf_cnpj} onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })} placeholder={isEmpresa ? '00.000.000/0000-00' : '000.000.000-00'} />
              </FieldWithTooltip>
              <FieldWithTooltip label="E-mail de Contato" tooltip="E-mail principal para comunicação e envio de documentos." required>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
              </FieldWithTooltip>
              <FieldWithTooltip label="Telefone" tooltip="Telefone com DDD para contato." required>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(11) 99999-9999" />
              </FieldWithTooltip>
              <div className="sm:col-span-2">
                <FieldWithTooltip label="Endereço Completo" tooltip="Endereço com rua, número, bairro, cidade e CEP." required>
                  <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade - UF, CEP" />
                </FieldWithTooltip>
              </div>
              <FieldWithTooltip label="Valor da Venda (R$)" tooltip="Valor total mensal da venda para contabilização de faturamento." required>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary shrink-0" />
                  <Input type="number" min={0} step={0.01} value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" />
                </div>
              </FieldWithTooltip>
            </div>
          </div>
        )}

        {/* Step 2: Beneficiários */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold font-display text-foreground">Beneficiários</h2>
            <p className="text-sm text-muted-foreground">Adicione as vidas que farão parte deste plano.</p>

            {beneficiarios.length > 0 && (
              <div className="space-y-2">
                {beneficiarios.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{b.nome}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.tipo}{b.is_conjuge ? ' • Cônjuge' : ''}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeBeneficiario(i)} className="text-destructive hover:text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border border-border rounded-lg p-4 bg-accent/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Nome completo" value={newBenef.nome} onChange={(e) => setNewBenef({ ...newBenef, nome: e.target.value })} />
                <Select value={newBenef.tipo} onValueChange={(v) => setNewBenef({ ...newBenef, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button variant="outline" size="sm" onClick={addBeneficiario} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar Beneficiário
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Documentos */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold font-display text-foreground">Documentos</h2>
            <p className="text-sm text-muted-foreground">Envie os documentos obrigatórios para esta modalidade.</p>
            {getDocumentos().map((doc) => (
              <div key={doc.label} className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{doc.label}</span>
                    {doc.required && <span className="text-xs text-destructive font-bold">*</span>}
                    <Tooltip>
                      <TooltipTrigger tabIndex={-1}><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-[260px] text-xs">{doc.tip}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Revisão */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold font-display text-foreground">Revisão Final</h2>
            <div className="space-y-2 text-sm">
              {[
                ['Modalidade', modalidade?.replace(/_/g, ' ').toUpperCase() || '—'],
                [isEmpresa ? 'Razão Social' : 'Titular', formData.nome || '—'],
                [isEmpresa ? 'CNPJ' : 'CPF', formData.cpf_cnpj || '—'],
                ['E-mail', formData.email || '—'],
                ['Telefone', formData.telefone || '—'],
                ['Endereço', formData.endereco || '—'],
                ['Valor da Venda', valorVenda ? `R$ ${parseFloat(valorVenda).toFixed(2)}` : '—'],
                ['Beneficiários', `${beneficiarios.length} vida(s)`],
                ['Portabilidade', possuiPlanoAnterior ? 'Sim' : 'Não'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between p-3 bg-background rounded-lg">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-foreground">Verifique todos os dados e documentos antes de finalizar. Pendências atrasam a aprovação.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => toast.success('Venda enviada para análise!')} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Venda
          </Button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*              TAB: IMPORTAÇÃO                    */
/* ═══════════════════════════════════════════════ */
function ImportacaoTab() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
        <h2 className="text-lg font-semibold font-display text-foreground">Importação em Massa</h2>
        <p className="text-sm text-muted-foreground">Importe registros de atividades ou documentos de vendas via planilha.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 bg-background hover:border-primary/40 transition-colors cursor-pointer">
            <FileUp className="w-8 h-8 text-primary" />
            <p className="text-sm font-medium text-foreground">Importar Atividades</p>
            <p className="text-xs text-muted-foreground text-center">Arraste uma planilha CSV/XLSX ou clique para selecionar</p>
            <Button variant="outline" size="sm" className="mt-2">Selecionar Arquivo</Button>
          </div>
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 bg-background hover:border-primary/40 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-secondary" />
            <p className="text-sm font-medium text-foreground">Importar Documentos</p>
            <p className="text-xs text-muted-foreground text-center">Upload de documentos de vendas em lote (PDF, JPG, PNG)</p>
            <Button variant="outline" size="sm" className="mt-2">Selecionar Arquivos</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">Baixe o <button className="text-primary underline font-medium">modelo de planilha</button> para garantir a formatação correta.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*                PÁGINA COMERCIAL                 */
/* ═══════════════════════════════════════════════ */
const Comercial = () => {
  return (
    <div className="max-w-4xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Comercial</h1>
        <p className="text-sm text-muted-foreground">Atividades diárias, vendas e importação</p>
      </div>

      <Tabs defaultValue="atividades" className="space-y-6">
        <TabsList className="bg-card border border-border/50 shadow-card p-1">
          <TabsTrigger value="atividades" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="w-4 h-4" /> Atividades
          </TabsTrigger>
          <TabsTrigger value="nova-venda" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShoppingCart className="w-4 h-4" /> Nova Venda
          </TabsTrigger>
          <TabsTrigger value="importacao" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileUp className="w-4 h-4" /> Importação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atividades"><AtividadesTab /></TabsContent>
        <TabsContent value="nova-venda"><NovaVendaTab /></TabsContent>
        <TabsContent value="importacao"><ImportacaoTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Comercial;
