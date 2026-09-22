import { OrdinancePeriod } from '../types';
import { formatDateBRL } from './formatters';

/**
 * Utility functions for handling Ordinance Periods (Portarias),
 * automatic execution state detection, period expiration,
 * formatted status labels, and sorting priority.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(referenceDate?: Date | string): string {
  const date = referenceDate
    ? typeof referenceDate === 'string'
      ? new Date(referenceDate)
      : referenceDate
    : new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if the ordinance's period has passed (expired/already executed).
 * Returns true if:
 * 1. The status is explicitly 'ENCERRADA', OR
 * 2. The ordinance has an endDate and today's date is strictly greater than endDate.
 */
export function isOrdinancePeriodExpired(
  ordinance: OrdinancePeriod,
  referenceDate?: Date | string
): boolean {
  if (!ordinance) return false;
  if (ordinance.status === 'ENCERRADA') return true;

  if (ordinance.endDate) {
    const todayStr = getTodayDateString(referenceDate);
    // Comparison on ISO date strings 'YYYY-MM-DD' is lexicographically accurate
    if (todayStr > ordinance.endDate) {
      return true;
    }
  }

  return false;
}

/**
 * Returns formatted period text, e.g. "20/08/2026 a 21/09/2026"
 */
export function getOrdinancePeriodText(ordinance: OrdinancePeriod): string {
  if (!ordinance) return '';
  const start = formatDateBRL(ordinance.startDate);
  const end = formatDateBRL(ordinance.endDate);
  if (start && end && start !== '—' && end !== '—') {
    return `${start} a ${end}`;
  }
  if (start && start !== '—') return `A partir de ${start}`;
  return 'Período não definido';
}

export interface OfficialCotaItem {
  joes: number;
  amount: number;
}

// Cotas Oficiais do Anexo I da Portaria nº 127/2026 – GCG (SEI 2026.190110.39762 / 017554882)
// Período: 22/09/2026 a 26/10/2026 - Total CPI: 1.105 JOEs / R$ 386.750,00
export const OFFICIAL_127_COTAS: Record<string, OfficialCotaItem> = {
  'CPI': { joes: 25, amount: 8750 },
  'CPA/I-1': { joes: 106, amount: 37100 },
  'CPA/I-2': { joes: 106, amount: 37100 },
  'CPA/I-3': { joes: 200, amount: 70000 },
  'CPA/I-4': { joes: 106, amount: 37100 },
  'CPA/I-5': { joes: 137, amount: 47950 },
  'CPA/I-6': { joes: 100, amount: 35000 },
  'CPA/I-7': { joes: 105, amount: 36750 },
  'CPA/I-8': { joes: 105, amount: 36750 },
  'CPA/I-9': { joes: 115, amount: 40250 },
};

// Cotas Oficiais Anteriores da Portaria nº 122/2026 – GCG (Histórica)
// Período: 20/08/2026 a 21/09/2026 - Total CPI: 1.886 JOEs / R$ 660.100,00
export const OFFICIAL_122_COTAS: Record<string, OfficialCotaItem> = {
  'CPI': { joes: 30, amount: 10500 },
  'CPA/I-1': { joes: 186, amount: 65100 },
  'CPA/I-2': { joes: 186, amount: 65100 },
  'CPA/I-3': { joes: 300, amount: 105000 },
  'CPA/I-4': { joes: 186, amount: 65100 },
  'CPA/I-5': { joes: 230, amount: 80500 },
  'CPA/I-6': { joes: 170, amount: 59500 },
  'CPA/I-7': { joes: 186, amount: 65100 },
  'CPA/I-8': { joes: 186, amount: 65100 },
  'CPA/I-9': { joes: 226, amount: 79100 },
};

export function getOfficialCotasForOrdinance(
  ordinance?: OrdinancePeriod | null
): Record<string, OfficialCotaItem> {
  if (!ordinance) return OFFICIAL_127_COTAS;
  const is122 =
    ordinance.number?.includes('122') ||
    ordinance.id?.includes('122') ||
    ordinance.name?.includes('122') ||
    ordinance.status === 'ENCERRADA';

  if (is122) return OFFICIAL_122_COTAS;
  return OFFICIAL_127_COTAS;
}

export interface OrdinanceStatusInfo {
  isCurrentInEffect: boolean;
  isExpired: boolean;
  periodText: string;
  selectorLabel: string;
  badgeLabel: string;
  displayStatus: 'EM_VIGOR' | 'JA_EXECUTADO' | 'RASCUNHO' | 'SUSPENSA';
}

/**
 * Returns comprehensive status info for an ordinance,
 * dynamically determining whether it is "Em Vigor" or "Já Executado no período XX a XX".
 */
export function getOrdinanceStatusInfo(
  ordinance: OrdinancePeriod,
  referenceDate?: Date | string
): OrdinanceStatusInfo {
  const isExpired = isOrdinancePeriodExpired(ordinance, referenceDate);
  const periodText = getOrdinancePeriodText(ordinance);

  if (ordinance.status === 'RASCUNHO') {
    return {
      isCurrentInEffect: false,
      isExpired: false,
      periodText,
      selectorLabel: '(Rascunho)',
      badgeLabel: 'Rascunho',
      displayStatus: 'RASCUNHO',
    };
  }

  if (ordinance.status === 'SUSPENSA') {
    return {
      isCurrentInEffect: false,
      isExpired: false,
      periodText,
      selectorLabel: '(Suspensa)',
      badgeLabel: 'Suspensa',
      displayStatus: 'SUSPENSA',
    };
  }

  // If the period has passed or status is ENCERRADA
  if (isExpired) {
    return {
      isCurrentInEffect: false,
      isExpired: true,
      periodText,
      selectorLabel: `(Já Executado no período ${periodText})`,
      badgeLabel: `Já Executado no período ${periodText}`,
      displayStatus: 'JA_EXECUTADO',
    };
  }

  // Otherwise, it is currently in effect
  return {
    isCurrentInEffect: true,
    isExpired: false,
    periodText,
    selectorLabel: '⭐ (Em Vigor)',
    badgeLabel: 'Portaria em Vigor',
    displayStatus: 'EM_VIGOR',
  };
}

/**
 * Sorts ordinances so that the in-effect ordinance is ALWAYS on top (first position),
 * followed by already executed / historical ordinances in descending order by end date.
 * "AS PORTARIA JÁ EXECUTADAS DEVERÃO PERMANECER NO BANCO DE DADOS PARA CONSULTA E A EM VIGOR SEMPRE FICARÁ NA FRENTE, SENDO EXIBIDA"
 */
export function sortOrdinancesWithInEffectFirst(
  ordinances: OrdinancePeriod[],
  referenceDate?: Date | string
): OrdinancePeriod[] {
  if (!ordinances || ordinances.length === 0) return [];

  return [...ordinances].sort((a, b) => {
    const infoA = getOrdinanceStatusInfo(a, referenceDate);
    const infoB = getOrdinanceStatusInfo(b, referenceDate);

    // 1. Ordinance in effect ALWAYS first
    if (infoA.isCurrentInEffect && !infoB.isCurrentInEffect) return -1;
    if (!infoA.isCurrentInEffect && infoB.isCurrentInEffect) return 1;

    // 2. If both are in effect, favor the one with highest year or latest start date
    if (infoA.isCurrentInEffect && infoB.isCurrentInEffect) {
      const startA = a.startDate || '';
      const startB = b.startDate || '';
      return startB.localeCompare(startA);
    }

    // 3. Historical / already executed sorted by end date descending (latest first)
    const endA = a.endDate || a.startDate || '';
    const endB = b.endDate || b.startDate || '';
    return endB.localeCompare(endA);
  });
}

/**
 * Synchronizes and repairs ordinance statuses based on actual dates.
 * If an ordinance's period has passed, ensures its status is updated to 'ENCERRADA',
 * and ensures the active period is set to 'VIGENTE'.
 */
export function syncOrdinancesWithPeriodDates(
  ordinances: OrdinancePeriod[],
  referenceDate?: Date | string
): { updatedOrdinances: OrdinancePeriod[]; changed: boolean } {
  let changed = false;
  const todayStr = getTodayDateString(referenceDate);

  const updatedOrdinances = ordinances.map((ord) => {
    // If the period has ended
    if (ord.endDate && todayStr > ord.endDate) {
      if (ord.status === 'VIGENTE') {
        changed = true;
        return {
          ...ord,
          status: 'ENCERRADA' as const,
        };
      }
    }

    // If it's Portaria 127/2026 and we are in its period (2026-09-22 to 2026-10-26)
    if (
      (ord.id === 'ord-127-2026' || ord.number?.includes('127')) &&
      todayStr >= (ord.startDate || '2026-09-22') &&
      todayStr <= (ord.endDate || '2026-10-26')
    ) {
      if (ord.status !== 'VIGENTE') {
        changed = true;
        return {
          ...ord,
          status: 'VIGENTE' as const,
        };
      }
    }

    return ord;
  });

  // Ensure at least one ordinance is marked VIGENTE if within valid date
  const hasVigente = updatedOrdinances.some(
    (o) => o.status === 'VIGENTE' && !isOrdinancePeriodExpired(o, referenceDate)
  );

  if (!hasVigente && updatedOrdinances.length > 0) {
    // Find non-expired ordinance or the most recent one
    const candidateIdx = updatedOrdinances.findIndex(
      (o) => !isOrdinancePeriodExpired(o, referenceDate)
    );
    if (candidateIdx >= 0) {
      updatedOrdinances[candidateIdx] = {
        ...updatedOrdinances[candidateIdx],
        status: 'VIGENTE',
      };
      changed = true;
    }
  }

  const sorted = sortOrdinancesWithInEffectFirst(updatedOrdinances, referenceDate);
  return { updatedOrdinances: sorted, changed };
}
