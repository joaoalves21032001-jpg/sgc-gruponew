import { useState } from 'react';
import { Phone, MessageSquare, FileText, CheckCircle2, RotateCcw, MapPin, Info, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

function FieldWithTooltip({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

const CRM = () => {
  const [form, setForm] = useState({
    ligacoes: 0,
    mensagens: 0,
    cotacoes_enviadas: 0,
    cotacoes_fechadas: 0,
    follow_up: 0,
    justificativa: '',
  });

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const handleSave = () => {
    toast.success('Atividades registradas com sucesso!');
  };

  const metrics = [
    { key: 'ligacoes', label: 'Ligações Realizadas', icon: Phone, tooltip: 'Total de ligações de prospecção e follow-up realizadas hoje.' },
    { key: 'mensagens', label: 'Mensagens Enviadas', icon: MessageSquare, tooltip: 'WhatsApp, e-mails e mensagens enviadas a clientes e leads.' },
    { key: 'cotacoes_enviadas', label: 'Cotações Enviadas', icon: FileText, tooltip: 'Propostas comerciais enviadas ao cliente. Esse KPI define sua Patente.' },
    { key: 'cotacoes_fechadas', label: 'Cotações Fechadas', icon: CheckCircle2, tooltip: 'Propostas que o cliente aceitou e viraram venda efetiva.' },
    { key: 'follow_up', label: 'Follow-ups', icon: RotateCcw, tooltip: 'Retornos a clientes que já receberam cotação ou demonstraram interesse.' },
  ] as const;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">CRM Diário</h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      {/* GPS Status */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
        <MapPin className="w-3.5 h-3.5 text-success" />
        Localização GPS ativa • São Paulo, SP
      </div>

      {/* Metrics Grid */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-5">
        <h2 className="text-sm font-semibold text-foreground font-display">Registrar Atividades</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {metrics.map((m) => (
            <FieldWithTooltip key={m.key} label={m.label} tooltip={m.tooltip}>
              <div className="flex items-center gap-2">
                <m.icon className="w-4 h-4 text-primary" />
                <Input
                  type="number"
                  min={0}
                  value={form[m.key]}
                  onChange={(e) => setForm({ ...form, [m.key]: parseInt(e.target.value) || 0 })}
                  className="w-full"
                />
              </div>
            </FieldWithTooltip>
          ))}
        </div>

        <FieldWithTooltip label="Justificativa de Atraso" tooltip="Preencha se estiver lançando atividades de um dia anterior. Um e-mail será enviado ao supervisor.">
          <Textarea
            placeholder="Opcional — preencha se o lançamento é retroativo"
            value={form.justificativa}
            onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
            rows={3}
          />
        </FieldWithTooltip>

        <Button onClick={handleSave} className="w-full sm:w-auto bg-secondary hover:bg-brand-secondary-dark text-secondary-foreground font-semibold">
          <Save className="w-4 h-4 mr-2" />
          Salvar Atividades
        </Button>
      </div>
    </div>
  );
};

export default CRM;
