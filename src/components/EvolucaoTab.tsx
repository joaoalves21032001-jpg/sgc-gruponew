import { useMemo, useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, BarChart3, Target, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyAtividades } from '@/hooks/useAtividades';
import { useMyVendas } from '@/hooks/useVendas';
import { useProfile } from '@/hooks/useProfile';

type Periodo = '30d' | '60d' | '90d';

export default function EvolucaoTab() {
  const { data: atividades = [] } = useMyAtividades();
  const { data: vendas = [] } = useMyVendas();
  const { data: profile } = useProfile();
  const [periodo, setPeriodo] = useState<Periodo>('30d');

  const dias = periodo === '30d' ? 30 : periodo === '60d' ? 60 : 90;
  const inicio = subDays(new Date(), dias);

  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: inicio, end: new Date() }, { weekStartsOn: 1 });
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekAtividades = atividades.filter(a => {
        const d = parseISO(a.data);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      });
      const weekVendas = vendas.filter(v => {
        const d = parseISO(v.created_at);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      });

      return {
        label: format(weekStart, "dd/MM", { locale: ptBR }),
        ligacoes: weekAtividades.reduce((s, a) => s + a.ligacoes, 0),
        mensagens: weekAtividades.reduce((s, a) => s + a.mensagens, 0),
        cotacoes: weekAtividades.reduce((s, a) => s + a.cotacoes_enviadas, 0),
        followUp: weekAtividades.reduce((s, a) => s + a.follow_up, 0),
        vendas: weekVendas.length,
        faturamento: weekVendas.filter(v => v.status === 'aprovado').reduce((s, v) => s + (v.valor ?? 0), 0),
      };
    });
  }, [atividades, vendas, inicio]);

  const totais = useMemo(() => {
    const filtAtiv = atividades.filter(a => parseISO(a.data) >= inicio);
    const filtVendas = vendas.filter(v => parseISO(v.created_at) >= inicio);
    return {
      ligacoes: filtAtiv.reduce((s, a) => s + a.ligacoes, 0),
      mensagens: filtAtiv.reduce((s, a) => s + a.mensagens, 0),
      cotacoes: filtAtiv.reduce((s, a) => s + a.cotacoes_enviadas, 0),
      fechadas: filtAtiv.reduce((s, a) => s + a.cotacoes_fechadas, 0),
      vendas: filtVendas.length,
      aprovadas: filtVendas.filter(v => v.status === 'aprovado').length,
      faturamento: filtVendas.filter(v => v.status === 'aprovado').reduce((s, v) => s + (v.valor ?? 0), 0),
    };
  }, [atividades, vendas, inicio]);

  const conversao = totais.cotacoes > 0 ? Math.round((totais.fechadas / totais.cotacoes) * 100) : 0;
  const metaFat = profile?.meta_faturamento ?? 75000;
  const percentMeta = metaFat > 0 ? Math.round((totais.faturamento / metaFat) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header + Período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground font-display">Evolução CRM</h2>
            <p className="text-xs text-muted-foreground">Acompanhe sua performance ao longo do tempo</p>
          </div>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[140px] h-9 border-border/40 text-sm">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="60d">Últimos 60 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ligações', value: totais.ligacoes.toLocaleString('pt-BR') },
          { label: 'Cotações Env.', value: totais.cotacoes.toLocaleString('pt-BR') },
          { label: 'Conversão', value: `${conversao}%` },
          { label: 'Faturamento', value: `R$ ${(totais.faturamento / 1000).toFixed(1)}k` },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl p-4 border border-border/30 shadow-card text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            <p className="text-xl font-bold font-display text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Atividades Chart */}
      <div className="bg-card rounded-xl p-6 border border-border/30 shadow-card">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-display">Atividades por Semana</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area type="monotone" dataKey="ligacoes" name="Ligações" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
            <Area type="monotone" dataKey="cotacoes" name="Cotações" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.1)" strokeWidth={2} />
            <Area type="monotone" dataKey="followUp" name="Follow-up" stroke="hsl(var(--warning))" fill="hsl(var(--warning) / 0.1)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Vendas/Faturamento Chart */}
      <div className="bg-card rounded-xl p-6 border border-border/30 shadow-card">
        <div className="flex items-center gap-2 mb-5">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-display">Faturamento por Semana</h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
            />
            <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
          </LineChart>
        </ResponsiveContainer>
        {metaFat > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
            <Target className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso da Meta</span>
                <span className="font-bold text-foreground">{percentMeta}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${percentMeta >= 100 ? 'bg-success' : percentMeta >= 80 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${Math.min(percentMeta, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
