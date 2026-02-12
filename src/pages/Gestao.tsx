import { useState } from 'react';
import { Users, AlertTriangle, TrendingUp, CheckCircle2, X, Filter, BarChart3, Target, ArrowUpRight, ArrowDownRight, Trophy, Phone, FileText, MessageSquare, CalendarIcon, Search } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PatenteBadge } from '@/components/PatenteBadge';
import { FlagRiscoBadge } from '@/components/FlagRiscoBadge';
import { useTeamProfiles } from '@/hooks/useProfile';
import { useTeamVendas, useUpdateVendaStatus, type Venda } from '@/hooks/useVendas';
import { useTeamAtividades } from '@/hooks/useAtividades';
import { getFlagRisco, getPatente } from '@/lib/gamification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const statusColors: Record<string, string> = {
  analise: 'bg-primary/8 text-primary border-primary/15',
  pendente: 'bg-warning/8 text-warning border-warning/15',
  aprovado: 'bg-success/8 text-success border-success/15',
  recusado: 'bg-destructive/8 text-destructive border-destructive/15',
};

const Gestao = () => {
  const { data: profiles, isLoading: loadingProfiles } = useTeamProfiles();
  const { data: vendas = [], isLoading: loadingVendas } = useTeamVendas();
  const { data: atividades = [] } = useTeamAtividades();
  const updateStatus = useUpdateVendaStatus();
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [obs, setObs] = useState('');
  const [filtroConsultor, setFiltroConsultor] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('mes');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [searchVenda, setSearchVenda] = useState('');

  const consultores = profiles ?? [];

  const userStats = useMemo(() => {
    const map: Record<string, { ligacoes: number; mensagens: number; cotacoes_enviadas: number; cotacoes_fechadas: number; follow_up: number; faturamento: number }> = {};
    for (const a of atividades) {
      if (!map[a.user_id]) map[a.user_id] = { ligacoes: 0, mensagens: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, follow_up: 0, faturamento: 0 };
      map[a.user_id].ligacoes += a.ligacoes;
      map[a.user_id].mensagens += a.mensagens;
      map[a.user_id].cotacoes_enviadas += a.cotacoes_enviadas;
      map[a.user_id].cotacoes_fechadas += a.cotacoes_fechadas;
      map[a.user_id].follow_up += a.follow_up;
    }
    for (const v of vendas) {
      if (v.status === 'aprovado') {
        if (!map[v.user_id]) map[v.user_id] = { ligacoes: 0, mensagens: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, follow_up: 0, faturamento: 0 };
        map[v.user_id].faturamento += v.valor ?? 0;
      }
    }
    return map;
  }, [atividades, vendas]);

  const totalVidas = vendas.reduce((sum, v) => sum + v.vidas, 0);
  const totalFaturamento = Object.values(userStats).reduce((sum, s) => sum + s.faturamento, 0);
  const metaEquipe = consultores.reduce((sum, c) => sum + (c.meta_faturamento ?? 75000), 0);
  const percentMetaEquipe = metaEquipe > 0 ? Math.round((totalFaturamento / metaEquipe) * 100) : 0;
  const totalLigacoes = Object.values(userStats).reduce((sum, s) => sum + s.ligacoes, 0);
  const totalCotEnviadas = Object.values(userStats).reduce((sum, s) => sum + s.cotacoes_enviadas, 0);
  const totalCotFechadas = Object.values(userStats).reduce((sum, s) => sum + s.cotacoes_fechadas, 0);
  const taxaConversaoEquipe = totalCotEnviadas > 0 ? Math.round((totalCotFechadas / totalCotEnviadas) * 100) : 0;

  // Filter vendas for kanban
  const filteredVendas = vendas.filter(v => {
    const matchesConsultor = filtroConsultor === 'todos' || v.user_id === filtroConsultor;
    const matchesStatus = filtroStatus === 'todos' || v.status === filtroStatus;
    const matchesSearch = !searchVenda || v.nome_titular.toLowerCase().includes(searchVenda.toLowerCase());
    return matchesConsultor && matchesStatus && matchesSearch;
  });

  const kanbanColumns = [
    { status: 'analise', label: 'Em Análise', items: filteredVendas.filter(v => v.status === 'analise') },
    { status: 'pendente', label: 'Pendência', items: filteredVendas.filter(v => v.status === 'pendente') },
    { status: 'aprovado', label: 'Aprovado', items: filteredVendas.filter(v => v.status === 'aprovado') },
  ];

  const ranking = useMemo(() => {
    return consultores.map(c => {
      const stats = userStats[c.id] ?? { ligacoes: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, faturamento: 0, mensagens: 0, follow_up: 0 };
      const percentMeta = (c.meta_faturamento ?? 75000) > 0 ? Math.round((stats.faturamento / (c.meta_faturamento ?? 75000)) * 100) : 0;
      return { ...c, stats, percentMeta };
    }).sort((a, b) => b.percentMeta - a.percentMeta);
  }, [consultores, userStats]);

  const riskConsultores = ranking.filter(c => c.percentMeta < 80);

  const comparativoData = ranking.map(c => ({
    nome: c.apelido || c.nome_completo.split(' ')[0],
    faturamento: Math.round(c.stats.faturamento / 1000),
    meta: Math.round((c.meta_faturamento ?? 75000) / 1000),
    conversao: c.stats.cotacoes_enviadas > 0 ? Math.round((c.stats.cotacoes_fechadas / c.stats.cotacoes_enviadas) * 100) : 0,
  }));

  const getConsultorName = (userId: string) => {
    const p = consultores.find(c => c.id === userId);
    return p?.apelido || p?.nome_completo?.split(' ')[0] || '—';
  };

  const handleAction = async (action: string) => {
    if (!selectedVenda) return;
    try {
      await updateStatus.mutateAsync({
        id: selectedVenda.id,
        status: action === 'aprovada' ? 'aprovado' : 'recusado',
        observacoes: obs,
      });
      toast.success(`Venda ${action} com sucesso!`);
      setSelectedVenda(null);
      setObs('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar venda.');
    }
  };

  if (loadingProfiles || loadingVendas) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Painel de Gestão</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral da equipe e vendas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-border/40">
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
            <SelectTrigger className="w-[160px] h-9 text-xs border-border/40">
              <Users className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Consultores</SelectItem>
              {consultores.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.apelido || c.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="analise">Em Análise</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Consultores" value={consultores.length} icon={Users} />
        <StatCard title="Faturamento" value={`R$ ${(totalFaturamento / 1000).toFixed(0)}k`} subtitle={`Meta: R$ ${(metaEquipe / 1000).toFixed(0)}k`} icon={TrendingUp} variant="brand" />
        <StatCard title="Total de Vidas" value={totalVidas} icon={Users} variant="success" />
        <StatCard title="Alertas" value={riskConsultores.length} icon={AlertTriangle} />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Meta da Equipe</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{percentMetaEquipe}%</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full transition-all ${percentMetaEquipe >= 100 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(percentMetaEquipe, 100)}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Conversão</span>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{taxaConversaoEquipe}%</p>
          <p className="text-xs text-muted-foreground mt-1">{totalCotFechadas}/{totalCotEnviadas}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Ligações</span>
            <Phone className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{totalLigacoes}</p>
          <p className="text-xs text-muted-foreground mt-1">Média: {consultores.length > 0 ? Math.round(totalLigacoes / consultores.length) : 0}/consultor</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Em Análise</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{vendas.filter(v => v.status === 'analise').length}</p>
          <p className="text-xs text-muted-foreground mt-1">{vendas.filter(v => v.status === 'pendente').length} pendentes</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
          <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Faturamento por Consultor (R$ mil)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparativoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px hsl(220 25% 10% / 0.08)' }} />
              <Bar dataKey="faturamento" name="Faturamento" fill="hsl(194 53% 26%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="meta" name="Meta" fill="hsl(220 13% 90%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
          <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Conversão por Consultor
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparativoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px hsl(220 25% 10% / 0.08)' }} />
              <Bar dataKey="conversao" name="Conversão %" fill="hsl(152 60% 40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking with Flags */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <h3 className="text-xs font-bold text-muted-foreground font-display uppercase tracking-[0.08em] flex items-center gap-2 mb-5">
          <Trophy className="w-4 h-4 text-primary" /> Ranking de Desempenho
        </h3>
        <div className="space-y-2">
          {ranking.map((c, idx) => {
            const patente = getPatente(c.percentMeta);
            // Gestores see risk flags; mesesAbaixo would come from historical data, using 0 for now
            const mesesAbaixo = c.percentMeta < 100 ? 1 : 0; // Simplified: would need historical tracking
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/20 hover:border-primary/15 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center text-sm font-bold text-primary shrink-0 font-display">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{c.nome_completo}</p>
                    {patente && <PatenteBadge percentMeta={c.percentMeta} size="sm" />}
                    {/* Risk flags visible to gestores/admins */}
                    <FlagRiscoBadge percentAtual={c.percentMeta} mesesAbaixo={mesesAbaixo} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    <span>R$ {(c.stats.faturamento / 1000).toFixed(1)}k</span>
                    <span className="text-border">•</span>
                    <span>{c.percentMeta}% da meta</span>
                    <span className="text-border">•</span>
                    <span>{c.stats.cotacoes_fechadas} vendas</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {c.percentMeta >= 100 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success"><ArrowUpRight className="w-3.5 h-3.5" />{c.percentMeta}%</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-destructive"><ArrowDownRight className="w-3.5 h-3.5" />{c.percentMeta}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban with search */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-xs font-bold text-muted-foreground font-display uppercase tracking-[0.08em]">Kanban de Vendas</h3>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar venda..."
              value={searchVenda}
              onChange={(e) => setSearchVenda(e.target.value)}
              className="pl-9 h-8 text-xs bg-card border-border/40"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => (
            <div key={col.status} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${statusColors[col.status]} border text-[11px] font-semibold`}>
                  {col.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVenda(v)}
                    className="bg-card rounded-lg p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer border border-border/30"
                  >
                    <p className="text-sm font-semibold text-foreground">{v.nome_titular}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{getConsultorName(v.user_id)} • {v.modalidade}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground">{v.vidas} vida(s)</span>
                      <span className="text-xs font-semibold text-primary">{v.valor ? `R$ ${v.valor.toLocaleString('pt-BR')}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Titular</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.nome_titular}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Modalidade</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.modalidade}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Consultor</span><p className="font-semibold text-foreground mt-0.5">{getConsultorName(selectedVenda.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Vidas</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.vidas}</p></div>
                {selectedVenda.valor && <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Valor</span><p className="font-semibold text-foreground mt-0.5">R$ {selectedVenda.valor.toLocaleString('pt-BR')}</p></div>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Observações</label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Motivo da aprovação/reprovação..." rows={3} className="border-border/40" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleAction('aprovada')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                </Button>
                <Button onClick={() => handleAction('reprovada')} variant="destructive" className="flex-1 font-semibold">
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
