import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  sparkline?: number[];
  variant?: 'default' | 'brand' | 'success';
}

function MiniSparkline({ data, variant }: { data: number[]; variant: string }) {
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
  const strokeColor = variant === 'default' ? 'hsl(194, 53%, 26%)' : 'rgba(255,255,255,0.7)';
  const fillColor = variant === 'default' ? 'hsl(194, 53%, 26%, 0.08)' : 'rgba(255,255,255,0.08)';
  const areaPoints = `${pad},${h} ${points.join(' ')} ${w - pad},${h}`;

  return (
    <svg width={w} height={h} className="mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
      <polygon points={areaPoints} fill={fillColor} />
      <polyline points={points.join(' ')} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(',')[0]} cy={points[points.length - 1].split(',')[1]} r="2" fill={strokeColor} />
    </svg>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, sparkline, variant = 'default' }: StatCardProps) {
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
    <div className={`rounded-xl p-5 shadow-card card-interactive card-shine hover-lift border border-border/30 ${s.bg} group cursor-default`}>
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
              <span className={`font-normal ${variant === 'default' ? 'text-muted-foreground' : 'opacity-60'}`}>vs mês ant.</span>
            </div>
          )}
          {sparkline && sparkline.length >= 2 && <MiniSparkline data={sparkline} variant={variant} />}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
