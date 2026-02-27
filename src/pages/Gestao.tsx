import { useState, useMemo } from 'react';
import {
  Users, AlertTriangle, TrendingUp, CheckCircle2, X, Filter, BarChart3, Target,
  ArrowUpRight, ArrowDownRight, Trophy, Phone, FileText, MessageSquare, CalendarIcon,
  Search, Calendar, Activity, DollarSign, Layers, GitCompareArrows, Zap, Clock
} from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatCard } from '@/components/StatCard';
import { PatenteBadge } from '@/components/PatenteBadge';
import { FlagRiscoBadge } from '@/components/FlagRiscoBadge';
import { useTeamProfiles } from '@/hooks/useProfile';
import { useTeamVendas, useUpdateVendaStatus, type Venda } from '@/hooks/useVendas';
import { useTeamAtividades } from '@/hooks/useAtividades';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useProfile';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';

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
  const [exploreDimension, setExploreDimension] = useState<string>('consultor');
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [filtroDia, setFiltroDia] = useState('');

  const { user } = useAuth();
  const { data: currentRole } = useUserRole();
  const consultores = profiles ?? [];
  const dateRange = useMemo(() => getDateRange(filtroPeriodo, filtroDia), [filtroPeriodo, filtroDia]);

  // RN-07: If the user is a consultor (granted dashboard access via tab permissions), auto-filter to their own data
  const isConsultorOnly = currentRole === 'consultor';
  const effectiveConsultor = isConsultorOnly && user ? user.id : filtroConsultor;

  // Filter atividades and vendas by date range and consultor
  const filteredAtividades = useMemo(() => {
    return atividades.filter(a => {
      const d = parseISO(a.data);
      const inRange = isWithinInterval(d, dateRange);
      const matchConsultor = effectiveConsultor === 'todos' || a.user_id === effectiveConsultor;
      return inRange && matchConsultor;
    });
  }, [atividades, dateRange, filtroConsultor]);

  const filteredVendasByPeriod = useMemo(() => {
    return vendas.filter(v => {
      const d = parseISO(v.created_at);
      const inRange = isWithinInterval(d, dateRange);
      const matchConsultor = effectiveConsultor === 'todos' || v.user_id === effectiveConsultor;
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

  // --- Phase 5.2: New Dashboard Data ---

  // Recent activity feed (last 15 entries)
  const recentFeed = useMemo(() => {
    const items: { type: string; name: string; detail: string; time: string; raw: Date }[] = [];
    for (const a of atividades.slice(0, 20)) {
      const p = consultores.find(c => c.id === a.user_id);
      items.push({
        type: 'atividade',
        name: p?.apelido || p?.nome_completo?.split(' ')[0] || '—',
        detail: `${a.ligacoes} lig · ${a.cotacoes_enviadas} cot`,
        time: format(parseISO(a.data), "dd/MM HH:mm", { locale: ptBR }),
        raw: parseISO(a.data),
      });
    }
    for (const v of vendas.slice(0, 20)) {
      const p = consultores.find(c => c.id === v.user_id);
      items.push({
        type: 'venda',
        name: p?.apelido || p?.nome_completo?.split(' ')[0] || '—',
        detail: `${v.nome_titular} · ${v.modalidade}`,
        time: format(parseISO(v.created_at), "dd/MM HH:mm", { locale: ptBR }),
        raw: parseISO(v.created_at),
      });
    }
    return items.sort((a, b) => b.raw.getTime() - a.raw.getTime()).slice(0, 15);
  }, [atividades, vendas, consultores]);

  // Exploration table: pivot by dimension
  const exploreData = useMemo(() => {
    const grouped: Record<string, { ligacoes: number; cotEnv: number; cotFech: number; vendas: number; faturamento: number }> = {};
    for (const a of filteredAtividades) {
      let key = '';
      if (exploreDimension === 'consultor') {
        const p = consultores.find(c => c.id === a.user_id);
        key = p?.apelido || p?.nome_completo?.split(' ')[0] || a.user_id;
      } else {
        key = format(parseISO(a.data), 'dd/MM', { locale: ptBR });
      }
      if (!grouped[key]) grouped[key] = { ligacoes: 0, cotEnv: 0, cotFech: 0, vendas: 0, faturamento: 0 };
      grouped[key].ligacoes += a.ligacoes;
      grouped[key].cotEnv += a.cotacoes_enviadas;
      grouped[key].cotFech += a.cotacoes_fechadas;
    }
    for (const v of filteredVendasByPeriod) {
      let key = '';
      if (exploreDimension === 'consultor') {
        const p = consultores.find(c => c.id === v.user_id);
        key = p?.apelido || p?.nome_completo?.split(' ')[0] || v.user_id;
      } else if (exploreDimension === 'modalidade') {
        key = v.modalidade || 'Outro';
      } else {
        key = format(parseISO(v.created_at), 'dd/MM', { locale: ptBR });
      }
      if (!grouped[key]) grouped[key] = { ligacoes: 0, cotEnv: 0, cotFech: 0, vendas: 0, faturamento: 0 };
      grouped[key].vendas += 1;
      if (v.status === 'aprovado') grouped[key].faturamento += v.valor ?? 0;
    }
    return Object.entries(grouped).map(([dim, data]) => ({ dim, ...data })).sort((a, b) => b.faturamento - a.faturamento);
  }, [filteredAtividades, filteredVendasByPeriod, exploreDimension, consultores]);

  // Monetization: revenue by future vigency month
  const monetizationData = useMemo(() => {
    const months: Record<string, { valor: number; count: number }> = {};
    const approved = filteredVendasByPeriod.filter(v => v.status === 'aprovado');
    for (const v of approved) {
      const m = format(parseISO(v.created_at), 'MMM/yy', { locale: ptBR });
      if (!months[m]) months[m] = { valor: 0, count: 0 };
      months[m].valor += v.valor ?? 0;
      months[m].count += 1;
    }
    return Object.entries(months).map(([mes, d]) => ({ mes, valor: Math.round(d.valor), count: d.count }));
  }, [filteredVendasByPeriod]);

  const ticketMedio = useMemo(() => {
    const approved = filteredVendasByPeriod.filter(v => v.status === 'aprovado');
    const total = approved.reduce((s, v) => s + (v.valor ?? 0), 0);
    const totalVidas = approved.reduce((s, v) => s + v.vidas, 0);
    return {
      porVenda: approved.length > 0 ? total / approved.length : 0,
      porVida: totalVidas > 0 ? total / totalVidas : 0,
    };
  }, [filteredVendasByPeriod]);

  // Comparison: overlay 2 consultores on the same line chart
  const comparisonData = useMemo(() => {
    if (!compareA || !compareB) return [];
    const weeks: Record<string, { label: string;[key: string]: number | string }> = {};
    const nameA = consultores.find(c => c.id === compareA);
    const nameB = consultores.find(c => c.id === compareB);
    const labelA = nameA?.apelido || nameA?.nome_completo?.split(' ')[0] || 'A';
    const labelB = nameB?.apelido || nameB?.nome_completo?.split(' ')[0] || 'B';
    for (const a of filteredAtividades) {
      if (a.user_id !== compareA && a.user_id !== compareB) continue;
      const w = format(startOfWeek(parseISO(a.data), { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR });
      if (!weeks[w]) weeks[w] = { label: w, [labelA]: 0, [labelB]: 0 };
      if (a.user_id === compareA) (weeks[w] as any)[labelA] = ((weeks[w] as any)[labelA] || 0) + a.cotacoes_enviadas;
      if (a.user_id === compareB) (weeks[w] as any)[labelB] = ((weeks[w] as any)[labelB] || 0) + a.cotacoes_enviadas;
    }
    return { data: Object.values(weeks), labelA, labelB };
  }, [filteredAtividades, compareA, compareB, consultores]);

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
        <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg flex flex-wrap">
          <TabsTrigger value="comparativo" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <BarChart3 className="w-3.5 h-3.5" /> Comparativo
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <TrendingUp className="w-3.5 h-3.5" /> Evolução
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <Trophy className="w-3.5 h-3.5" /> Ranking
          </TabsTrigger>
          <TabsTrigger value="temporeal" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <Zap className="w-3.5 h-3.5" /> Tempo Real
          </TabsTrigger>
          <TabsTrigger value="exploracao" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <Layers className="w-3.5 h-3.5" /> Exploração
          </TabsTrigger>
          <TabsTrigger value="monetizacao" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <DollarSign className="w-3.5 h-3.5" /> Monetização
          </TabsTrigger>
          <TabsTrigger value="comparativos" className="gap-1.5 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs rounded-md">
            <GitCompareArrows className="w-3.5 h-3.5" /> Comparar
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

        {/* Tempo Real Tab */}
        <TabsContent value="temporeal">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Active Users */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-4 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Consultores Ativos
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <span className="text-2xl font-bold font-display text-success">{consultores.length}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Equipe Completa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{consultores.length} membro(s) registrado(s)</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                {ranking.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(c.apelido || c.nome_completo)[0]}
                    </div>
                    <span className="text-xs text-foreground flex-1">{c.apelido || c.nome_completo.split(' ')[0]}</span>
                    <span className="text-[10px] text-muted-foreground">{c.percentMeta}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Recent Activity Feed */}
            <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-4 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Feed de Ações Recentes
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {recentFeed.length === 0 && <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma ação recente.</p>}
                {recentFeed.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/15 hover:border-primary/15 transition-colors">
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${item.type === 'venda' ? 'bg-success/10' : 'bg-primary/10'}`}>
                      {item.type === 'venda' ? <DollarSign className="w-3.5 h-3.5 text-success" /> : <Activity className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Exploração Livre Tab */}
        <TabsContent value="exploracao">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h3 className="text-xs font-bold text-muted-foreground font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Exploração por Dimensão
              </h3>
              <Select value={exploreDimension} onValueChange={setExploreDimension}>
                <SelectTrigger className="w-[160px] h-8 text-xs border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultor">Por Consultor</SelectItem>
                  <SelectItem value="modalidade">Por Modalidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">{exploreDimension === 'consultor' ? 'Consultor' : 'Modalidade'}</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">Ligações</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">Cot. Env.</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">Cot. Fech.</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">Conv. %</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">Vendas</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-[0.08em]">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {exploreData.map((row, i) => (
                    <tr key={row.dim} className={`border-b border-border/15 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{row.dim}</td>
                      <td className="py-2.5 px-3 text-right text-foreground">{row.ligacoes}</td>
                      <td className="py-2.5 px-3 text-right text-foreground">{row.cotEnv}</td>
                      <td className="py-2.5 px-3 text-right text-foreground">{row.cotFech}</td>
                      <td className="py-2.5 px-3 text-right text-foreground">{row.cotEnv > 0 ? Math.round((row.cotFech / row.cotEnv) * 100) : 0}%</td>
                      <td className="py-2.5 px-3 text-right text-foreground">{row.vendas}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-primary">R$ {row.faturamento.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {exploreData.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-6 text-muted-foreground italic">Sem dados no período selecionado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Monetização Tab */}
        <TabsContent value="monetizacao">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card border border-border/30">
              <h3 className="text-xs font-bold text-muted-foreground mb-5 font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Receita por Período
              </h3>
              {monetizationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monetizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']} />
                    <Bar dataKey="valor" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-12">Nenhuma venda aprovada no período.</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Ticket Médio / Venda</span>
                </div>
                <p className="text-2xl font-bold font-display text-foreground">R$ {ticketMedio.porVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-success/8 flex items-center justify-center">
                    <Users className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Ticket Médio / Vida</span>
                </div>
                <p className="text-2xl font-bold font-display text-foreground">R$ {ticketMedio.porVida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-warning/8 flex items-center justify-center">
                    <Target className="w-4 h-4 text-warning" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Vendas Aprovadas</span>
                </div>
                <p className="text-2xl font-bold font-display text-foreground">{filteredVendasByPeriod.filter(v => v.status === 'aprovado').length}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Comparativos Tab */}
        <TabsContent value="comparativos">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h3 className="text-xs font-bold text-muted-foreground font-display uppercase tracking-[0.08em] flex items-center gap-2">
                <GitCompareArrows className="w-4 h-4 text-primary" /> Comparar Consultores
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Select value={compareA} onValueChange={setCompareA}>
                  <SelectTrigger className="w-[160px] h-8 text-xs border-border/40">
                    <SelectValue placeholder="Consultor A" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.apelido || c.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground self-center">vs</span>
                <Select value={compareB} onValueChange={setCompareB}>
                  <SelectTrigger className="w-[160px] h-8 text-xs border-border/40">
                    <SelectValue placeholder="Consultor B" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.apelido || c.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {typeof comparisonData === 'object' && 'data' in comparisonData && comparisonData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey={comparisonData.labelA} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                  <Line type="monotone" dataKey={comparisonData.labelB} stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--success))' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16">
                <GitCompareArrows className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecione dois consultores acima para comparar o desempenho.</p>
              </div>
            )}
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
                      <span className="text-xs font-semibold text-primary">{v.valor ? `R$ ${v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</span>
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
                {selectedVenda.valor && <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Valor</span><p className="font-semibold text-foreground mt-0.5">R$ {selectedVenda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>}
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
