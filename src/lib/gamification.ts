import { getMotivationalTier, getRandomPhrase, getMotivationalPhrase } from './motivationalPhrases';

export type Patente = 'diamante' | 'platina' | 'ouro' | 'prata' | 'bronze' | null;
export type FlagRisco = 'amarelo' | 'laranja' | 'vermelho' | null;

export interface PatenteInfo {
  id: Patente;
  label: string;
  icon: string;
  frase: string;
  minPercent: number;
  borderClass: string;
  textClass: string;
}

export const PATENTES: PatenteInfo[] = [
  {
    id: 'diamante',
    label: 'Diamante',
    icon: '💎',
    frase: 'Desempenho lendário! Você é a referência do time.',
    minPercent: 200,
    borderClass: 'border-patente-diamante',
    textClass: 'text-patente-diamante',
  },
  {
    id: 'platina',
    label: 'Platina',
    icon: '🔘',
    frase: 'Incrível! Você superou todas as expectativas.',
    minPercent: 150,
    borderClass: 'border-patente-platina',
    textClass: 'text-patente-platina',
  },
  {
    id: 'ouro',
    label: 'Ouro',
    icon: '🥇',
    frase: 'Meta batida! Excelente trabalho, continue assim.',
    minPercent: 100,
    borderClass: 'border-patente-ouro',
    textClass: 'text-patente-ouro',
  },
  {
    id: 'prata',
    label: 'Prata',
    icon: '🥈',
    frase: 'Está muito perto! Faltam poucos detalhes.',
    minPercent: 90,
    borderClass: 'border-patente-prata',
    textClass: 'text-patente-prata',
  },
  {
    id: 'bronze',
    label: 'Bronze',
    icon: '🥉',
    frase: 'Continue acelerando, o ouro é logo ali.',
    minPercent: 80,
    borderClass: 'border-patente-bronze',
    textClass: 'text-patente-bronze',
  },
];

export function getPatente(percentMeta: number): PatenteInfo | null {
  for (const p of PATENTES) {
    if (percentMeta >= p.minPercent) return p;
  }
  return null;
}

/** Returns the original motivational phrase based on monthly meta percent. */
export function getPatenteFrase(percentMeta: number): string {
  const patente = getPatente(percentMeta);
  return patente ? patente.frase : 'Continue focado em seus objetivos para alcançar novos níveis!';
}

/**
 * Maps daily volume to a performance tier.
 */
export function getPerformanceTierInfo(volume: number): { color: string; name: string; id: string } {
  const tier = getMotivationalTier(volume);
  return { color: tier.color, name: tier.name, id: tier.id };
}

/** Returns a random motivational phrase based on daily volume (from the 250 phrases). */
export function getDailyFraseMotivacional(volume: number): string {
  return getMotivationalPhrase(volume);
}

export function getFlagRisco(
  percentAtual: number,
  mesesConsecutivosAbaixo: number
): FlagRisco {
  if (mesesConsecutivosAbaixo >= 3) return 'vermelho';
  if (mesesConsecutivosAbaixo >= 2) return 'laranja';
  if (percentAtual < 80) return 'amarelo';
  return null;
}
