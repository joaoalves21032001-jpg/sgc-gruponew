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
  const bgVariants = {
    default: 'bg-card',
    brand: 'gradient-brand',
    success: 'gradient-success',
  };

  const textVariants = {
    default: 'text-card-foreground',
    brand: 'text-primary-foreground',
    success: 'text-secondary-foreground',
  };

  const subtitleVariants = {
    default: 'text-muted-foreground',
    brand: 'text-primary-foreground/70',
    success: 'text-secondary-foreground/70',
  };

  return (
    <div className={`rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/40 ${bgVariants[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${subtitleVariants[variant]}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 font-display ${textVariants[variant]}`}>{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${subtitleVariants[variant]}`}>{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variant === 'default' ? 'bg-accent' : 'bg-primary-foreground/10'}`}>
          <Icon className={`w-5 h-5 ${variant === 'default' ? 'text-primary' : textVariants[variant]}`} />
        </div>
      </div>
    </div>
  );
}
