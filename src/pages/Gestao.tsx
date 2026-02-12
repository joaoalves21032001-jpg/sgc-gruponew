import { useState } from 'react';
import { Users, AlertTriangle, TrendingUp, CheckCircle2, X, Filter, BarChart3, Target, ArrowUpRight, ArrowDownRight, Trophy, Phone, FileText, MessageSquare } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PatenteBadge } from '@/components/PatenteBadge';
import { FlagRiscoBadge } from '@/components/FlagRiscoBadge';
import { consultores, vendas, type Venda } from '@/lib/mock-data';
import { getFlagRisco, getPatente } from '@/lib/gamification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const statusColors: Record<string, string> = {
  analise: 'bg-primary/10 text-primary border-primary/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  aprovado: 'bg-success/10 text-success border-success/20',
  recusado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const Gestao = () => {
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [obs, setObs] = useState('');
  const [filtroConsultor, setFiltroConsultor] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('mes');

  const riskConsultores = consultores.filter(c => getFlagRisco(c.percentMeta, c.mesesAbaixo) !== null);
  const totalVidas = vendas.reduce((sum, v) => sum + v.vidas, 0);
  const totalFaturamento = consultores.reduce((sum, c) => sum + c.faturamento, 0);
  const metaEquipe = consultores.reduce((sum, c) => sum + c.meta_faturamento, 0);
  const percentMetaEquipe = metaEquipe > 0 ? Math.round((totalFaturamento / metaEquipe) * 100) : 0;
  const totalLigacoes = consultores.reduce((sum, c) => sum + c.ligacoes, 0);
  const totalCotEnviadas = consultores.reduce((sum, c) => sum + c.cotacoes_enviadas, 0);
  const totalCotFechadas = consultores.reduce((sum, c) => sum + c.cotacoes_fechadas, 0);
  const taxaConversaoEquipe = totalCotEnviadas > 0 ? Math.round((totalCotFechadas / totalCotEnviadas) * 100) : 0;

  const kanbanColumns = [
    { status: 'analise', label: 'Em Análise', items: vendas.filter(v => v.status === 'analise') },
    { status: 'pendente', label: 'Pendência', items: vendas.filter(v => v.status === 'pendente') },
    { status: 'aprovado', label: 'Aprovado', items: vendas.filter(v => v.status === 'aprovado') },
  ];

  // Ranking por faturamento
  const ranking = [...consultores].sort((a, b) => b.percentMeta - a.percentMeta);

  // Mock evolução mensal
  const evolucaoData = [
    { mes: 'Set', faturamento: 380, meta: 525 },
    { mes: 'Out', faturamento: 420, meta: 525 },
    { mes: 'Nov', faturamento: 490, meta: 525 },
    { mes: 'Dez', faturamento: 510, meta: 525 },
    { mes: 'Jan', faturamento: 545, meta: 525 },
    { mes: 'Fev', faturamento: Math.round(totalFaturamento / 1000), meta: Math.round(metaEquipe / 1000) },
  ];

  // Comparação por consultor
  const comparativoData = consultores.map(c => ({
    nome: c.apelido,
    faturamento: Math.round(c.faturamento / 1000),
    meta: Math.round(c.meta_faturamento / 1000),
    conversao: c.cotacoes_enviadas > 0 ? Math.round((c.cotacoes_fechadas / c.cotacoes_enviadas) * 100) : 0,
  }));

  const handleAction = (action: string) => {
    toast.success(`Venda ${action} com sucesso!`);
    setSelectedVenda(null);
    setObs('');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Painel de Gestão</h1>
          <p className="text-sm text-muted-foreground">Visão geral da equipe e vendas</p>
        </div>
        <div className="flex gap-2">
          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <Users className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Consultores</SelectItem>
              {consultores.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Consultores" value={consultores.length} icon={Users} />
        <StatCard title="Faturamento Equipe" value={`R$ ${(totalFaturamento / 1000).toFixed(0)}k`} subtitle={`Meta: R$ ${(metaEquipe / 1000).toFixed(0)}k`} icon={TrendingUp} variant="brand" />
        <StatCard title="Total de Vidas" value={totalVidas} icon={Users} variant="success" />
        <StatCard title="Alertas de Risco" value={riskConsultores.length} icon={AlertTriangle} />
      </div>

      {/* Métricas secundárias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Meta da Equipe</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{percentMetaEquipe}%</p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className={`h-2 rounded-full transition-all ${percentMetaEquipe >= 100 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(percentMetaEquipe, 100)}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Taxa de Conversão</span>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{taxaConversaoEquipe}%</p>
          <p className="text-xs text-muted-foreground mt-1">{totalCotFechadas} fechadas / {totalCotEnviadas} enviadas</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Ligações Total</span>
            <Phone className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{totalLigacoes}</p>
          <p className="text-xs text-muted-foreground mt-1">Média: {Math.round(totalLigacoes / consultores.length)} por consultor</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Vendas em Análise</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{vendas.filter(v => v.status === 'analise').length}</p>
          <p className="text-xs text-muted-foreground mt-1">{vendas.filter(v => v.status === 'pendente').length} pendentes</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução Mensal */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Evolução Mensal (R$ mil)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucaoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
              <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(214 20% 88%)', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(194, 53%, 26%)" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(93, 53%, 51%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparativo por Consultor */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Faturamento por Consultor (R$ mil)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparativoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
              <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(214 20% 88%)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="faturamento" name="Faturamento" fill="hsl(194, 53%, 26%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="meta" name="Meta" fill="hsl(214 20% 88%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking Gamificado */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-primary" /> Ranking de Desempenho
        </h3>
        <div className="space-y-2">
          {ranking.map((c, idx) => {
            const patente = getPatente(c.percentMeta);
            const flag = getFlagRisco(c.percentMeta, c.mesesAbaixo);
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-background border border-border/30 hover:border-primary/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{c.nome_completo}</p>
                    {patente && <PatenteBadge percentMeta={c.percentMeta} size="sm" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>R$ {(c.faturamento / 1000).toFixed(1)}k</span>
                    <span>•</span>
                    <span>{c.percentMeta}% da meta</span>
                    <span>•</span>
                    <span>{c.cotacoes_fechadas} vendas</span>
                    <span>•</span>
                    <span>Conversão: {c.cotacoes_enviadas > 0 ? Math.round((c.cotacoes_fechadas / c.cotacoes_enviadas) * 100) : 0}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.percentMeta >= 100 ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success"><ArrowUpRight className="w-3.5 h-3.5" />{c.percentMeta}%</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-destructive"><ArrowDownRight className="w-3.5 h-3.5" />{c.percentMeta}%</span>
                  )}
                  {flag && <FlagRiscoBadge percentAtual={c.percentMeta} mesesAbaixo={c.mesesAbaixo} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Matriz de Risco */}
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
                  <p className="text-xs text-muted-foreground">{c.percentMeta}% da meta • {c.mesesAbaixo} mês(es) abaixo • Conversão: {c.cotacoes_enviadas > 0 ? Math.round((c.cotacoes_fechadas / c.cotacoes_enviadas) * 100) : 0}%</p>
                </div>
                <FlagRiscoBadge percentAtual={c.percentMeta} mesesAbaixo={c.mesesAbaixo} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban */}
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

      {/* Dialog de detalhes */}
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
