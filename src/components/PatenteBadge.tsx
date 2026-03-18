import { getPatente, type PatenteInfo } from '@/lib/gamification';

interface PatenteBadgeProps {
  percentMeta: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PatenteBadge({ percentMeta, size = 'md', showLabel = true }: PatenteBadgeProps) {
  const patente = getPatente(percentMeta);
  if (!patente) return null;

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2',
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      <span className="leading-none">{patente.icon}</span>
      {showLabel && (
        <span className={`font-semibold ${patente.textClass}`}>
          {patente.label}
        </span>
      )}
    </div>
  );
}
