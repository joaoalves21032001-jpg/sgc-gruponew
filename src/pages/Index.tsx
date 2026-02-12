import { Phone, MessageSquare, FileText, CheckCircle2, DollarSign, Target, TrendingUp, RotateCcw } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useProfile } from '@/hooks/useProfile';
import { useMyAtividades } from '@/hooks/useAtividades';
import { useMyVendas } from '@/hooks/useVendas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const Index = () => {
  const { data: profile } = useProfile();
  const { data: atividades } = useMyAtividades();
  const { data: vendas } = useMyVendas();

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

  const activityData = useMemo(() => {
    if (!atividades || atividades.length === 0) return [];
    return atividades.slice(0, 5).reverse().map(a => ({
      day: new Date(a.data).toLocaleDateString('pt-BR', { weekday: 'short' }),
      ligacoes: a.ligacoes,
      cotacoes: a.cotacoes_enviadas,
    }));
  }, [atividades]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Meu Painel</h1>
        <p className="text-sm text-muted-foreground">
          Resumo das suas atividades • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ligações" value={stats.ligacoes} icon={Phone} subtitle="Este mês" />
        <StatCard title="Cotações Enviadas" value={stats.cotacoes_enviadas} icon={FileText} subtitle="Este mês" />
        <StatCard title="Cotações Fechadas" value={stats.cotacoes_fechadas} icon={CheckCircle2} variant="success" subtitle={`${stats.follow_up} follow-ups`} />
        <StatCard
          title="Meu Faturamento"
          value={`R$ ${(faturamento / 1000).toFixed(1)}k`}
          subtitle={`Meta: R$ ${(metaFaturamento / 1000).toFixed(0)}k`}
          icon={DollarSign}
          variant="brand"
        />
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Progresso da Meta
          </h3>
          <span className={`text-sm font-bold ${percentMeta >= 100 ? 'text-success' : 'text-warning'}`}>
            {percentMeta}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${percentMeta >= 100 ? 'bg-success' : percentMeta >= 80 ? 'bg-warning' : 'bg-destructive'}`}
            style={{ width: `${Math.min(percentMeta, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>R$ {faturamento.toLocaleString('pt-BR')}</span>
          <span>Meta: R$ {metaFaturamento.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {activityData.length > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Minhas Atividades Recentes
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(214 20% 88%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="ligacoes" name="Ligações" fill="hsl(194, 53%, 26%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cotacoes" name="Cotações" fill="hsl(93, 53%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mensagens</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{stats.mensagens}</p>
          <p className="text-xs text-muted-foreground mt-1">Enviadas este mês</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Follow-ups</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{stats.follow_up}</p>
          <p className="text-xs text-muted-foreground mt-1">Realizados este mês</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Conversão</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">
            {stats.cotacoes_enviadas > 0 ? Math.round((stats.cotacoes_fechadas / stats.cotacoes_enviadas) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Fechadas / Enviadas</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
