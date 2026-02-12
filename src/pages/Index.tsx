import { Phone, MessageSquare, FileText, CheckCircle2, TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PatenteBadge } from '@/components/PatenteBadge';
import { FlagRiscoBadge } from '@/components/FlagRiscoBadge';
import { currentUser, consultores } from '@/lib/mock-data';
import { getPatente } from '@/lib/gamification';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const activityData = [
  { day: 'Seg', ligacoes: 12, cotacoes: 4 },
  { day: 'Ter', ligacoes: 8, cotacoes: 3 },
  { day: 'Qua', ligacoes: 15, cotacoes: 6 },
  { day: 'Qui', ligacoes: 10, cotacoes: 5 },
  { day: 'Sex', ligacoes: 14, cotacoes: 7 },
];

const statusData = [
  { name: 'Aprovado', value: 12, color: 'hsl(93, 53%, 51%)' },
  { name: 'Em Análise', value: 8, color: 'hsl(194, 53%, 26%)' },
  { name: 'Pendente', value: 5, color: 'hsl(38, 92%, 44%)' },
  { name: 'Recusado', value: 2, color: 'hsl(347, 82%, 41%)' },
];

const isGestor = ['supervisor', 'gerente', 'administrador'].includes(currentUser.perfil);

const Index = () => {
  const sortedConsultores = [...consultores].sort((a, b) => b.percentMeta - a.percentMeta);
  const totalFaturamento = consultores.reduce((sum, c) => sum + c.faturamento, 0);
  const metaEquipe = consultores.reduce((sum, c) => sum + c.meta_faturamento, 0);
  const percentEquipe = Math.round((totalFaturamento / metaEquipe) * 100);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Fevereiro 2026 • Fuso: Brasília (UTC-3)
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ligações Hoje"
          value={currentUser.ligacoes}
          icon={Phone}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Cotações Enviadas"
          value={currentUser.cotacoes_enviadas}
          icon={FileText}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Cotações Fechadas"
          value={currentUser.cotacoes_fechadas}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Faturamento"
          value={`R$ ${(currentUser.faturamento / 1000).toFixed(1)}k`}
          subtitle={`Meta: R$ ${(currentUser.meta_faturamento / 1000).toFixed(0)}k`}
          icon={DollarSign}
          variant="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Atividades da Semana</h3>
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

        {/* Sales Status Pie */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Status das Vendas</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard (Gestor view) */}
      {isGestor && (
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2">
              <Users className="w-4 h-4" /> Ranking da Equipe
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3.5 h-3.5" />
              Equipe: {percentEquipe}% da meta
            </div>
          </div>
          <div className="space-y-2">
            {sortedConsultores.map((c, i) => {
              const patente = getPatente(c.percentMeta);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg bg-background hover:bg-accent/50 transition-colors"
                >
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className={`w-8 h-8 rounded-full border-2 ${patente?.borderClass ?? 'border-border'} flex items-center justify-center bg-muted text-xs font-bold text-foreground`}>
                    {c.apelido.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{c.percentMeta}% da meta</p>
                  </div>
                  <PatenteBadge percentMeta={c.percentMeta} size="sm" />
                  <FlagRiscoBadge percentAtual={c.percentMeta} mesesAbaixo={c.mesesAbaixo} />
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">R$ {(c.faturamento / 1000).toFixed(1)}k</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
