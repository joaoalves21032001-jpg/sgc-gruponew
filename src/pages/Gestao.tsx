import { useState } from 'react';
import { Users, AlertTriangle, TrendingUp, CheckCircle2, X } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PatenteBadge } from '@/components/PatenteBadge';
import { FlagRiscoBadge } from '@/components/FlagRiscoBadge';
import { consultores, vendas, type Venda } from '@/lib/mock-data';
import { getFlagRisco } from '@/lib/gamification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  analise: 'bg-primary/10 text-primary border-primary/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  aprovado: 'bg-success/10 text-success border-success/20',
  recusado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const Gestao = () => {
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [obs, setObs] = useState('');

  const riskConsultores = consultores.filter(c => getFlagRisco(c.percentMeta, c.mesesAbaixo) !== null);
  const totalVidas = vendas.reduce((sum, v) => sum + v.vidas, 0);
  const totalFaturamento = consultores.reduce((sum, c) => sum + c.faturamento, 0);
  const metaEquipe = consultores.reduce((sum, c) => sum + c.meta_faturamento, 0);

  const kanbanColumns = [
    { status: 'analise', label: 'Em Análise', items: vendas.filter(v => v.status === 'analise') },
    { status: 'pendente', label: 'Pendência', items: vendas.filter(v => v.status === 'pendente') },
    { status: 'aprovado', label: 'Aprovado', items: vendas.filter(v => v.status === 'aprovado') },
  ];

  const handleAction = (action: string) => {
    toast.success(`Venda ${action} com sucesso!`);
    setSelectedVenda(null);
    setObs('');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Painel de Gestão</h1>
        <p className="text-sm text-muted-foreground">Visão geral da equipe e vendas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Consultores" value={consultores.length} icon={Users} />
        <StatCard title="Faturamento Equipe" value={`R$ ${(totalFaturamento / 1000).toFixed(0)}k`} subtitle={`Meta: R$ ${(metaEquipe / 1000).toFixed(0)}k`} icon={TrendingUp} variant="brand" />
        <StatCard title="Total de Vidas" value={totalVidas} icon={Users} variant="success" />
        <StatCard title="Alertas de Risco" value={riskConsultores.length} icon={AlertTriangle} />
      </div>

      {riskConsultores.length > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" /> Matriz de Risco
          </h3>
          <div className="space-y-2">
            {riskConsultores.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-background border border-border/30">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.nome_completo}</p>
                  <p className="text-xs text-muted-foreground">{c.percentMeta}% da meta • {c.mesesAbaixo} mês(es)</p>
                </div>
                <FlagRiscoBadge percentAtual={c.percentMeta} mesesAbaixo={c.mesesAbaixo} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground font-display mb-4">Kanban de Vendas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => (
            <div key={col.status} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${statusColors[col.status]} border`}>
                  {col.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVenda(v)}
                    className="bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer border border-border/40"
                  >
                    <p className="text-sm font-medium text-foreground">{v.nome_titular}</p>
                    <p className="text-xs text-muted-foreground">{v.consultor_nome} • {v.modalidade}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{v.vidas} vida(s)</span>
                      <span className="text-xs font-medium text-primary">{v.valor ? `R$ ${v.valor.toLocaleString('pt-BR')}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Titular</span><p className="font-medium text-foreground">{selectedVenda.nome_titular}</p></div>
                <div><span className="text-muted-foreground">Modalidade</span><p className="font-medium text-foreground">{selectedVenda.modalidade}</p></div>
                <div><span className="text-muted-foreground">Consultor</span><p className="font-medium text-foreground">{selectedVenda.consultor_nome}</p></div>
                <div><span className="text-muted-foreground">Vidas</span><p className="font-medium text-foreground">{selectedVenda.vidas}</p></div>
                {selectedVenda.valor && <div><span className="text-muted-foreground">Valor</span><p className="font-medium text-foreground">R$ {selectedVenda.valor.toLocaleString('pt-BR')}</p></div>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Observações</label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Motivo da aprovação/reprovação..." rows={3} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleAction('aprovada')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                </Button>
                <Button onClick={() => handleAction('reprovada')} variant="destructive" className="flex-1">
                  <X className="w-4 h-4 mr-1" /> Reprovar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gestao;
