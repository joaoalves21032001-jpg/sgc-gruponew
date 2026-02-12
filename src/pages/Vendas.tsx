import { useState } from 'react';
import { ChevronRight, ChevronLeft, Upload, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

type Modalidade = 'pf' | 'familiar' | 'pme_1' | 'pme_multi' | 'empresarial_10';

const STEPS = ['Modalidade', 'Dados Titular', 'Beneficiários', 'Documentos', 'Revisão'];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            i === current
              ? 'bg-primary text-primary-foreground'
              : i < current
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}>
            {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

function FieldTip({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

const Vendas = () => {
  const [step, setStep] = useState(0);
  const [modalidade, setModalidade] = useState<Modalidade | ''>('');
  const [possuiPlanoAnterior, setPossuiPlanoAnterior] = useState(false);
  const [formData, setFormData] = useState({
    nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '',
  });

  const canNext = () => {
    if (step === 0) return modalidade !== '';
    if (step === 1) return formData.nome && formData.cpf_cnpj && formData.email && formData.telefone && formData.endereco;
    return true;
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Nova Venda</h1>
        <p className="text-sm text-muted-foreground">Preencha o formulário passo-a-passo</p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-card rounded-xl p-6 shadow-card">
        {/* Step 0: Modalidade */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-display text-foreground">Selecione a Modalidade</h2>
            <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a modalidade..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pf">Pessoa Física (PF)</SelectItem>
                <SelectItem value="familiar">Familiar</SelectItem>
                <SelectItem value="pme_1">PME (1 Vida)</SelectItem>
                <SelectItem value="pme_multi">PME (Multi Vidas)</SelectItem>
                <SelectItem value="empresarial_10">Empresarial (10+ vidas)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3">
              <Switch checked={possuiPlanoAnterior} onCheckedChange={setPossuiPlanoAnterior} />
              <Label className="text-sm text-foreground">Possui plano anterior (carência)?</Label>
              <FieldTip tip="Se o beneficiário possui plano de saúde anterior, documentos adicionais serão solicitados para portabilidade de carência." />
            </div>
          </div>
        )}

        {/* Step 1: Dados Titular */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-display text-foreground">
              {['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade) ? 'Dados da Empresa' : 'Dados do Titular'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade) ? 'Razão Social' : 'Nome Completo'}</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm">{['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade) ? 'CNPJ' : 'CPF'}</Label>
                  <FieldTip tip="Documento de identificação fiscal do titular ou empresa." />
                </div>
                <Input value={formData.cpf_cnpj} onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">E-mail de Contato</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Telefone</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm">Endereço Completo</Label>
                <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Beneficiários */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-display text-foreground">Beneficiários</h2>
            <p className="text-sm text-muted-foreground">
              Adicione as vidas que farão parte deste plano.
            </p>
            <div className="border border-border rounded-lg p-4 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Nome completo" />
                <Select>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="titular">Titular</SelectItem>
                    <SelectItem value="dependente">Dependente</SelectItem>
                    <SelectItem value="socio">Sócio</SelectItem>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch />
                  <Label className="text-xs">Cônjuge?</Label>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3">
                + Adicionar Beneficiário
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Documentos */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-display text-foreground">Documentos</h2>
            <p className="text-sm text-muted-foreground">Envie os documentos obrigatórios para esta modalidade.</p>

            {[
              { label: 'Documento com Foto', tip: 'RG, CNH ou outro documento oficial com foto nítida.', required: true },
              { label: 'Comprovante de Endereço', tip: 'Conta de luz, água ou telefone dos últimos 3 meses.', required: true },
              ...(possuiPlanoAnterior ? [
                { label: 'Carteirinha do Plano Anterior', tip: 'Foto da carteirinha do plano de saúde anterior.', required: true },
                { label: 'Carta de Permanência (PDF)', tip: 'Documento emitido pelo RH ou operadora anterior comprovando o tempo de plano. Obrigatório PDF.', required: true },
              ] : []),
              ...(['pme_1', 'pme_multi', 'empresarial_10'].includes(modalidade) ? [
                { label: 'Cartão CNPJ', tip: 'Comprovante de inscrição e situação cadastral da empresa.', required: true },
              ] : []),
              ...(modalidade === 'empresarial_10' ? [
                { label: 'Comprovação de Vínculo', tip: 'FGTS, Holerite ou Carteira de Trabalho comprovando vínculo empregatício.', required: true },
              ] : []),
            ].map((doc) => (
              <div key={doc.label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{doc.label}</span>
                    {doc.required && <span className="text-xs text-destructive">*</span>}
                    <FieldTip tip={doc.tip} />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Revisão */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-display text-foreground">Revisão Final</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Modalidade</span>
                <span className="font-medium text-foreground capitalize">{modalidade?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between p-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Titular/Empresa</span>
                <span className="font-medium text-foreground">{formData.nome || '—'}</span>
              </div>
              <div className="flex justify-between p-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Carência</span>
                <span className="font-medium text-foreground">{possuiPlanoAnterior ? 'Sim' : 'Não'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-foreground">Verifique todos os documentos antes de finalizar. Pendências atrasam a aprovação.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="bg-primary hover:bg-brand-light text-primary-foreground"
          >
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => toast.success('Venda enviada para análise!')}
            className="bg-secondary hover:bg-brand-secondary-dark text-secondary-foreground font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Venda
          </Button>
        )}
      </div>
    </div>
  );
};

export default Vendas;
