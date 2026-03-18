import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  sparkline?: number[];
  variant?: 'default' | 'brand' | 'success' | 'accent' | 'warning';
}

function MiniSparkline({ data, positive }: { data: number[]; positive?: boolean }) {
  if (data.length < 2) return null;
  const w = 80, h = 28, pad = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const color = positive === false ? 'hsl(0,84%,60%)' : 'hsl(194, 53%, 26%)';
  const fillColor = positive === false ? 'hsl(0,84%,60%,0.08)' : 'hsl(194, 53%, 26%, 0.08)';
  const areaPoints = `${pad},${h} ${points.join(' ')} ${w - pad},${h}`;

  return (
    <svg width={w} height={h} className="mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
      <polygon points={areaPoints} fill={fillColor} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(',')[0]} cy={points[points.length - 1].split(',')[1]} r="2" fill={color} />
    </svg>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, sparkline, variant = 'default' }: StatCardProps) {
  const isDark = variant === 'brand' || variant === 'success';

  const styles: Record<string, { wrapper: string; text: string; subtitle: string; iconBg: string; iconColor: string }> = {
    default: {
      wrapper: 'bg-card border-l-[3px] border-l-primary',
      text: 'text-foreground',
      subtitle: 'text-muted-foreground',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    brand: {
      wrapper: 'gradient-brand-subtle border-l-[3px] border-l-white/20',
      text: 'text-white',
      subtitle: 'text-white/60',
      iconBg: 'bg-white/10',
      iconColor: 'text-white',
    },
    success: {
      wrapper: 'gradient-success border-l-[3px] border-l-white/20',
      text: 'text-white',
      subtitle: 'text-white/60',
      iconBg: 'bg-white/10',
      iconColor: 'text-white',
    },
    accent: {
      wrapper: 'bg-card border-l-[3px] border-l-orange-400',
      text: 'text-foreground',
      subtitle: 'text-muted-foreground',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    warning: {
      wrapper: 'bg-card border-l-[3px] border-l-amber-400',
      text: 'text-foreground',
      subtitle: 'text-muted-foreground',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
  };

  const s = styles[variant];

  return (
    <div className={`rounded-xl p-5 shadow-card card-interactive hover-lift border border-border/30 ${s.wrapper} group cursor-default`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${s.subtitle}`}>{title}</p>
          <p className={`text-[28px] font-bold font-display leading-none ${s.text} count-animate`}>{value}</p>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${s.subtitle}`}>{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className={`font-normal ${isDark ? 'opacity-60' : 'text-muted-foreground'}`}>vs mês ant.</span>
            </div>
          )}
          {sparkline && sparkline.length >= 2 && <MiniSparkline data={sparkline} positive={trend?.positive} />}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
