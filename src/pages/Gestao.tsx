import { useState, useMemo } from 'react';
import {
  Users, AlertTriangle, TrendingUp, CheckCircle2, X, Filter, BarChart3, Target,
  ArrowUpRight, ArrowDownRight, Trophy, Phone, FileText, MessageSquare, CalendarIcon,
  Search, Calendar
} from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const statusColors: Record<string, string> = {
  analise: 'bg-primary/8 text-primary border-primary/15',
  pendente: 'bg-warning/8 text-warning border-warning/15',
  aprovado: 'bg-success/8 text-success border-success/15',
  recusado: 'bg-destructive/8 text-destructive border-destructive/15',
};

function getDateRange(periodo: string, customDate?: string) {
  const now = new Date();
  if (periodo === 'dia' && customDate) {
    const d = parseISO(customDate);
    return { start: d, end: d };
  }
  switch (periodo) {
    case 'semana': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
    case 'mes': return { start: startOfMonth(now), end: now };
    case 'trimestre': return { start: subMonths(startOfMonth(now), 2), end: now };
    case '30d': return { start: subDays(now, 30), end: now };
    case '60d': return { start: subDays(now, 60), end: now };
    case '90d': return { start: subDays(now, 90), end: now };
    default: return { start: startOfMonth(now), end: now };
  }
}

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
  const [filtroDia, setFiltroDia] = useState('');

  const consultores = profiles ?? [];
  const dateRange = useMemo(() => getDateRange(filtroPeriodo, filtroDia), [filtroPeriodo, filtroDia]);

  // Filter atividades and vendas by date range and consultor
  const filteredAtividades = useMemo(() => {
    return atividades.filter(a => {
      const d = parseISO(a.data);
      const inRange = isWithinInterval(d, dateRange);
      const matchConsultor = filtroConsultor === 'todos' || a.user_id === filtroConsultor;
      return inRange && matchConsultor;
    });
  }, [atividades, dateRange, filtroConsultor]);

  const filteredVendasByPeriod = useMemo(() => {
    return vendas.filter(v => {
      const d = parseISO(v.created_at);
      const inRange = isWithinInterval(d, dateRange);
      const matchConsultor = filtroConsultor === 'todos' || v.user_id === filtroConsultor;
      return inRange && matchConsultor;
    });
  }, [vendas, dateRange, filtroConsultor]);

  const userStats = useMemo(() => {
    const map: Record<string, { ligacoes: number; mensagens: number; cotacoes_enviadas: number; cotacoes_fechadas: number; follow_up: number; faturamento: number }> = {};
    for (const a of filteredAtividades) {
      if (!map[a.user_id]) map[a.user_id] = { ligacoes: 0, mensagens: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, follow_up: 0, faturamento: 0 };
      map[a.user_id].ligacoes += a.ligacoes;
      map[a.user_id].mensagens += a.mensagens;
      map[a.user_id].cotacoes_enviadas += a.cotacoes_enviadas;
      map[a.user_id].cotacoes_fechadas += a.cotacoes_fechadas;
      map[a.user_id].follow_up += a.follow_up;
    }
    for (const v of filteredVendasByPeriod) {
      if (v.status === 'aprovado') {
        if (!map[v.user_id]) map[v.user_id] = { ligacoes: 0, mensagens: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, follow_up: 0, faturamento: 0 };
        map[v.user_id].faturamento += v.valor ?? 0;
      }
    }
    return map;
  }, [filteredAtividades, filteredVendasByPeriod]);

  const totalVidas = filteredVendasByPeriod.reduce((sum, v) => sum + v.vidas, 0);
  const totalFaturamento = Object.values(userStats).reduce((sum, s) => sum + s.faturamento, 0);
  const metaEquipe = consultores.reduce((sum, c) => sum + (c.meta_faturamento ?? 75000), 0);
  const percentMetaEquipe = metaEquipe > 0 ? Math.round((totalFaturamento / metaEquipe) * 100) : 0;
  const totalLigacoes = Object.values(userStats).reduce((sum, s) => sum + s.ligacoes, 0);
  const totalCotEnviadas = Object.values(userStats).reduce((sum, s) => sum + s.cotacoes_enviadas, 0);
  const totalCotFechadas = Object.values(userStats).reduce((sum, s) => sum + s.cotacoes_fechadas, 0);
  const taxaConversaoEquipe = totalCotEnviadas > 0 ? Math.round((totalCotFechadas / totalCotEnviadas) * 100) : 0;

  // Kanban vendas with status filter
  const kanbanVendas = filteredVendasByPeriod.filter(v => {
    const matchesStatus = filtroStatus === 'todos' || v.status === filtroStatus;
    const matchesSearch = !searchVenda || v.nome_titular.toLowerCase().includes(searchVenda.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const kanbanColumns = [
    { status: 'analise', label: 'Em Análise', items: kanbanVendas.filter(v => v.status === 'analise') },
    { status: 'pendente', label: 'Pendência', items: kanbanVendas.filter(v => v.status === 'pendente') },
    { status: 'aprovado', label: 'Aprovado', items: kanbanVendas.filter(v => v.status === 'aprovado') },
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

  // Weekly evolution chart
  const weeklyEvolution = useMemo(() => {
    const weeks: Record<string, { ligacoes: number; cotacoes: number; vendas: number; faturamento: number }> = {};
    for (const a of filteredAtividades) {
      const w = format(startOfWeek(parseISO(a.data), { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR });
      if (!weeks[w]) weeks[w] = { ligacoes: 0, cotacoes: 0, vendas: 0, faturamento: 0 };
      weeks[w].ligacoes += a.ligacoes;
      weeks[w].cotacoes += a.cotacoes_enviadas;
    }
    for (const v of filteredVendasByPeriod) {
      if (v.status === 'aprovado') {
        const w = format(startOfWeek(parseISO(v.created_at), { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR });
        if (!weeks[w]) weeks[w] = { ligacoes: 0, cotacoes: 0, vendas: 0, faturamento: 0 };
        weeks[w].vendas += 1;
        weeks[w].faturamento += v.valor ?? 0;
      }
    }
    return Object.entries(weeks).map(([label, data]) => ({ label, ...data }));
  }, [filteredAtividades, filteredVendasByPeriod]);

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
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da equipe • {format(dateRange.start, "dd/MM", { locale: ptBR })} a {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="w-[150px] h-9 text-xs border-border/40">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Dia Específico</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="60d">Últimos 60 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          {filtroPeriodo === 'dia' && (
            <Input type="date" value={filtroDia} onChange={e => setFiltroDia(e.target.value)} className="h-9 w-[160px] text-xs bg-card border-border/40" />
          )}
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
          <p className="text-2xl font-bold font-display text-foreground">{filteredVendasByPeriod.filter(v => v.status === 'analise').length}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredVendasByPeriod.filter(v => v.status === 'pendente').length} pendentes</p>
        </div>
      </div>

      <Tabs defaultValue="comparativo" className="space-y-4">
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
          <TabsTrigger value="comparativo" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <BarChart3 className="w-4 h-4" /> Comparativo
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <TrendingUp className="w-4 h-4" /> Evolução
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
            <Trophy className="w-4 h-4" /> Ranking
          </TabsTrigger>
        </TabsList>

        {/* Comparativo Tab */}
        <TabsContent value="comparativo">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Faturamento por Consultor (R$ mil)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparativoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="faturamento" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Conversão por Consultor
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparativoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="conversao" name="Conversão %" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Evolução Tab */}
        <TabsContent value="evolucao">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Atividades por Semana
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={weeklyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="ligacoes" name="Ligações" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="cotacoes" name="Cotações" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Faturamento Semanal
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']} />
                  <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
            <div className="space-y-2">
              {ranking.map((c, idx) => {
                const patente = getPatente(c.percentMeta);
                const mesesAbaixo = c.percentMeta < 100 ? 1 : 0;
                return (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/20 hover:border-primary/15 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center text-sm font-bold text-primary shrink-0 font-display">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{c.nome_completo}</p>
                        {patente && <PatenteBadge percentMeta={c.percentMeta} size="sm" />}
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
        </TabsContent>
      </Tabs>

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
