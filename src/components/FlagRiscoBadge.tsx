import { getFlagRisco, type FlagRisco } from '@/lib/gamification';

interface FlagRiscoBadgeProps {
  percentAtual: number;
  mesesAbaixo: number;
}

const flagConfig: Record<string, { label: string; bgClass: string }> = {
  amarelo: { label: '🟡 Atenção', bgClass: 'bg-flag-amarelo' },
  laranja: { label: '🟠 Alerta', bgClass: 'bg-flag-laranja' },
  vermelho: { label: '🔴 Crítico', bgClass: 'bg-flag-vermelho' },
};

export function FlagRiscoBadge({ percentAtual, mesesAbaixo }: FlagRiscoBadgeProps) {
  const flag = getFlagRisco(percentAtual, mesesAbaixo);
  if (!flag) return null;

  const config = flagConfig[flag];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-primary-foreground ${config.bgClass}`}>
      {config.label}
    </span>
  );
}
