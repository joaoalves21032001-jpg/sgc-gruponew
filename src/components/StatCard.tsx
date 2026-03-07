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

const VARIANT_CONFIG = {
  default: {
    gradient: 'none',
    bg: 'hsl(222 28% 13%)',
    border: 'hsl(222 20% 22%)',
    borderLeft: 'hsl(185 90% 48%)',
    text: 'hsl(210 60% 97%)',
    subtitle: 'hsl(215 30% 60%)',
    iconBg: 'hsl(185 90% 48% / 0.12)',
    iconColor: 'hsl(185 90% 55%)',
    glow: 'hsl(185 90% 48% / 0.3)',
    sparkStroke: 'hsl(185 90% 55%)',
    sparkFill: 'hsl(185 90% 55% / 0.08)',
    hoverBorder: 'hsl(185 90% 48% / 0.4)',
  },
  brand: {
    gradient: 'linear-gradient(145deg, hsl(185 90% 28%), hsl(185 85% 40%))',
    bg: 'none',
    border: 'hsl(185 90% 48% / 0.3)',
    borderLeft: 'hsl(185 90% 65%)',
    text: 'hsl(0 0% 100%)',
    subtitle: 'hsl(185 60% 85%)',
    iconBg: 'hsl(0 0% 100% / 0.12)',
    iconColor: 'hsl(0 0% 100%)',
    glow: 'hsl(185 90% 40% / 0.5)',
    sparkStroke: 'rgba(255,255,255,0.75)',
    sparkFill: 'rgba(255,255,255,0.08)',
    hoverBorder: 'hsl(185 90% 65% / 0.5)',
  },
  success: {
    gradient: 'linear-gradient(145deg, hsl(93 80% 30%), hsl(93 75% 42%))',
    bg: 'none',
    border: 'hsl(93 80% 50% / 0.3)',
    borderLeft: 'hsl(93 80% 65%)',
    text: 'hsl(0 0% 100%)',
    subtitle: 'hsl(93 60% 85%)',
    iconBg: 'hsl(0 0% 100% / 0.12)',
    iconColor: 'hsl(0 0% 100%)',
    glow: 'hsl(93 80% 35% / 0.5)',
    sparkStroke: 'rgba(255,255,255,0.75)',
    sparkFill: 'rgba(255,255,255,0.08)',
    hoverBorder: 'hsl(93 80% 65% / 0.5)',
  },
  accent: {
    gradient: 'linear-gradient(145deg, hsl(256 80% 38%), hsl(256 75% 52%))',
    bg: 'none',
    border: 'hsl(256 80% 65% / 0.3)',
    borderLeft: 'hsl(256 80% 75%)',
    text: 'hsl(0 0% 100%)',
    subtitle: 'hsl(256 60% 88%)',
    iconBg: 'hsl(0 0% 100% / 0.12)',
    iconColor: 'hsl(0 0% 100%)',
    glow: 'hsl(256 80% 50% / 0.5)',
    sparkStroke: 'rgba(255,255,255,0.75)',
    sparkFill: 'rgba(255,255,255,0.08)',
    hoverBorder: 'hsl(256 80% 75% / 0.5)',
  },
  warning: {
    gradient: 'linear-gradient(145deg, hsl(38 95% 36%), hsl(38 90% 48%))',
    bg: 'none',
    border: 'hsl(38 95% 52% / 0.3)',
    borderLeft: 'hsl(38 95% 70%)',
    text: 'hsl(0 0% 100%)',
    subtitle: 'hsl(38 70% 88%)',
    iconBg: 'hsl(0 0% 100% / 0.12)',
    iconColor: 'hsl(0 0% 100%)',
    glow: 'hsl(38 95% 45% / 0.5)',
    sparkStroke: 'rgba(255,255,255,0.75)',
    sparkFill: 'rgba(255,255,255,0.08)',
    hoverBorder: 'hsl(38 95% 70% / 0.5)',
  },
};

function MiniSparkline({ data, strokeColor, fillColor }: { data: number[]; strokeColor: string; fillColor: string }) {
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
  const areaPoints = `${pad},${h} ${points.join(' ')} ${w - pad},${h}`;

  return (
    <svg width={w} height={h} className="mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
      <polygon points={areaPoints} fill={fillColor} />
      <polyline points={points.join(' ')} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r="2.5"
        fill={strokeColor}
      />
    </svg>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, sparkline, variant = 'default' }: StatCardProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <div
      className="rounded-2xl p-5 card-interactive card-shine group cursor-default relative overflow-hidden"
      style={{
        background: cfg.gradient !== 'none' ? cfg.gradient : cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.borderLeft}`,
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px ${cfg.glow}, 0 4px 12px ${cfg.glow}`;
        (e.currentTarget as HTMLDivElement).style.borderColor = cfg.hoverBorder;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
        (e.currentTarget as HTMLDivElement).style.borderColor = cfg.border;
      }}
    >
      {/* Subtle background glow blob */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          transform: 'translate(30%, -30%)',
        }}
      />

      <div className="flex items-start justify-between relative">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: cfg.subtitle }}>{title}</p>
          <p className="text-[28px] font-bold font-display leading-none count-animate" style={{ color: cfg.text }}>{value}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: cfg.subtitle }}>{subtitle}</p>
          )}
          {trend && (
            <div
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: trend.positive ? 'hsl(93 80% 60%)' : 'hsl(0 84% 65%)' }}
            >
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span style={{ color: cfg.subtitle, fontWeight: 400 }}>vs mês ant.</span>
            </div>
          )}
          {sparkline && sparkline.length >= 2 && (
            <MiniSparkline data={sparkline} strokeColor={cfg.sparkStroke} fillColor={cfg.sparkFill} />
          )}
        </div>

        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
          style={{
            background: cfg.iconBg,
            border: `1px solid ${cfg.iconColor.replace(')', ' / 0.2)').replace('hsl', 'hsl')}`,
          }}
        >
          <Icon
            className="w-5 h-5"
            style={{
              color: cfg.iconColor,
              filter: `drop-shadow(0 0 6px ${cfg.iconColor.includes('hsl') ? cfg.iconColor.replace(')', ' / 0.6)') : 'rgba(255,255,255,0.4)'})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
