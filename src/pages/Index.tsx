import { Phone, MessageSquare, FileText, CheckCircle2, DollarSign, Target, TrendingUp, RotateCcw } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { currentUser } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const activityData = [
  { day: 'Seg', ligacoes: 12, cotacoes: 4 },
  { day: 'Ter', ligacoes: 8, cotacoes: 3 },
  { day: 'Qua', ligacoes: 15, cotacoes: 6 },
  { day: 'Qui', ligacoes: 10, cotacoes: 5 },
  { day: 'Sex', ligacoes: 14, cotacoes: 7 },
];

const Index = () => {
  const percentMeta = currentUser.percentMeta;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Meu Painel</h1>
        <p className="text-sm text-muted-foreground">
          Resumo das suas atividades • Fevereiro 2026
        </p>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ligações" value={currentUser.ligacoes} icon={Phone} subtitle="Este mês" />
        <StatCard title="Cotações Enviadas" value={currentUser.cotacoes_enviadas} icon={FileText} subtitle="Este mês" />
        <StatCard title="Cotações Fechadas" value={currentUser.cotacoes_fechadas} icon={CheckCircle2} variant="success" subtitle={`${currentUser.follow_up} follow-ups`} />
        <StatCard
          title="Meu Faturamento"
          value={`R$ ${(currentUser.faturamento / 1000).toFixed(1)}k`}
          subtitle={`Meta: R$ ${(currentUser.meta_faturamento / 1000).toFixed(0)}k`}
          icon={DollarSign}
          variant="brand"
        />
      </div>

      {/* Progress toward meta */}
      <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
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
          <span>R$ {currentUser.faturamento.toLocaleString('pt-BR')}</span>
          <span>Meta: R$ {currentUser.meta_faturamento.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Minhas Atividades da Semana
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mensagens</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{currentUser.mensagens}</p>
          <p className="text-xs text-muted-foreground mt-1">Enviadas este mês</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Follow-ups</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{currentUser.follow_up}</p>
          <p className="text-xs text-muted-foreground mt-1">Realizados este mês</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Conversão</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">
            {currentUser.cotacoes_enviadas > 0 ? Math.round((currentUser.cotacoes_fechadas / currentUser.cotacoes_enviadas) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Fechadas / Enviadas</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
