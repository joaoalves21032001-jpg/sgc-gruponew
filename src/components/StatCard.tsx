import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'brand' | 'success';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const styles = {
    default: {
      bg: 'bg-card',
      text: 'text-foreground',
      subtitle: 'text-muted-foreground',
      iconBg: 'bg-primary/8',
      iconColor: 'text-primary',
    },
    brand: {
      bg: 'gradient-brand-subtle',
      text: 'text-white',
      subtitle: 'text-white/60',
      iconBg: 'bg-white/10',
      iconColor: 'text-white',
    },
    success: {
      bg: 'gradient-success',
      text: 'text-white',
      subtitle: 'text-white/60',
      iconBg: 'bg-white/10',
      iconColor: 'text-white',
    },
  };

  const s = styles[variant];

  return (
    <div className={`rounded-xl p-5 shadow-card card-interactive border border-border/30 ${s.bg} group cursor-default`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${s.subtitle}`}>{title}</p>
          <p className={`text-[28px] font-bold font-display leading-none ${s.text} number-animate`}>{value}</p>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${s.subtitle}`}>{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${s.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
