import { Phone, MessageSquare, FileText, CheckCircle2, DollarSign, Target, TrendingUp, RotateCcw } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { useMyAtividades } from '@/hooks/useAtividades';
import { useMyVendas } from '@/hooks/useVendas';
import { PatenteBadge } from '@/components/PatenteBadge';
import { getFraseMotivacional } from '@/lib/gamification';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const Index = () => {
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const { data: atividades } = useMyAtividades();
  const { data: vendas } = useMyVendas();

  const isAdmin = role === 'administrador';

  const stats = useMemo(() => {
    if (!atividades) return { ligacoes: 0, mensagens: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, follow_up: 0 };
    return atividades.reduce((acc, a) => ({
      ligacoes: acc.ligacoes + a.ligacoes,
      mensagens: acc.mensagens + a.mensagens,
      cotacoes_enviadas: acc.cotacoes_enviadas + a.cotacoes_enviadas,
      cotacoes_fechadas: acc.cotacoes_fechadas + a.cotacoes_fechadas,
      follow_up: acc.follow_up + a.follow_up,
    }), { ligacoes: 0, mensagens: 0, cotacoes_enviadas: 0, cotacoes_fechadas: 0, follow_up: 0 });
  }, [atividades]);

  const faturamento = useMemo(() => {
    if (!vendas) return 0;
    return vendas
      .filter(v => v.status === 'aprovado')
      .reduce((sum, v) => sum + (v.valor ?? 0), 0);
  }, [vendas]);

  const metaFaturamento = profile?.meta_faturamento ?? 75000;
  const percentMeta = metaFaturamento > 0 ? Math.round((faturamento / metaFaturamento) * 100) : 0;
  const frase = getFraseMotivacional(percentMeta);

  const activityData = useMemo(() => {
    if (!atividades || atividades.length === 0) return [];
    return atividades.slice(0, 7).reverse().map(a => ({
      day: new Date(a.data).toLocaleDateString('pt-BR', { weekday: 'short' }),
      ligacoes: a.ligacoes,
      cotacoes: a.cotacoes_enviadas,
    }));
  }, [atividades]);

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || '';

  // Confetti celebration when meta reaches 100%
  const confettiFired = useRef(false);
  useEffect(() => {
    if (percentMeta >= 100 && !confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  }, [percentMeta]);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">
            {displayName ? `Olá, ${displayName}` : 'Meu Progresso'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumo das suas atividades • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-muted-foreground/70 italic mt-2">{frase}</p>
        </div>
        {percentMeta >= 80 && <PatenteBadge percentMeta={percentMeta} size="md" />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
        <StatCard title="Ligações" value={stats.ligacoes} icon={Phone} subtitle="Este mês" />
        <StatCard title="Cotações Enviadas" value={stats.cotacoes_enviadas} icon={FileText} subtitle="Este mês" />
        <StatCard title="Cotações Fechadas" value={stats.cotacoes_fechadas} icon={CheckCircle2} variant="success" subtitle={`${stats.follow_up} follow-ups`} />
        <StatCard
          title="Faturamento"
          value={`R$ ${(faturamento / 1000).toFixed(1)}k`}
          subtitle={`Meta: R$ ${(metaFaturamento / 1000).toFixed(0)}k`}
          icon={DollarSign}
          variant="brand"
        />
      </div>

      {/* Progress Bar */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground font-display">Progresso da Meta</h3>
          </div>
          <div className="flex items-center gap-2">
            {percentMeta >= 80 && <PatenteBadge percentMeta={percentMeta} size="sm" showLabel={false} />}
            <span className={`text-lg font-bold font-display ${percentMeta >= 100 ? 'text-success' : percentMeta >= 80 ? 'text-warning' : 'text-destructive'}`}>
              {percentMeta}%
            </span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-1000 ease-out progress-animated ${percentMeta >= 100 ? 'bg-success' : percentMeta >= 80 ? 'bg-warning' : 'bg-destructive'
              }`}
            style={{ width: `${Math.min(percentMeta, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>R$ {faturamento.toLocaleString('pt-BR')}</span>
          <span>Meta: R$ {metaFaturamento.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Chart + Mini Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {activityData.length > 0 && (
          <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card border border-border/30">
            <h3 className="text-sm font-semibold text-foreground mb-5 font-display flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              Atividades Recentes
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={activityData} barGap={4}>
                <defs>
                  <linearGradient id="gradLigacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(194 53% 26%)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="hsl(194 53% 26%)" stopOpacity={0.15} />
                  </linearGradient>
                  <linearGradient id="gradCotacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152 60% 40%)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="hsl(152 60% 40%)" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220 10% 46%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(220 13% 90%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px hsl(220 25% 10% / 0.08)',
                  }}
                />
                <Bar dataKey="ligacoes" name="Ligações" fill="url(#gradLigacoes)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cotacoes" name="Cotações" fill="url(#gradCotacoes)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Mensagens</span>
            </div>
            <p className="text-3xl font-bold font-display text-foreground">{stats.mensagens}</p>
            <p className="text-xs text-muted-foreground mt-1">Enviadas este mês</p>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Follow-ups</span>
            </div>
            <p className="text-3xl font-bold font-display text-foreground">{stats.follow_up}</p>
            <p className="text-xs text-muted-foreground mt-1">Realizados este mês</p>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/30">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Conversão</span>
            </div>
            <p className="text-3xl font-bold font-display text-foreground">
              {stats.cotacoes_enviadas > 0 ? Math.round((stats.cotacoes_fechadas / stats.cotacoes_enviadas) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Fechadas / Enviadas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
