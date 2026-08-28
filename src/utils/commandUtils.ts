export const OFFICIAL_COMMAND_CODES = [
  'CPI',
  'CPA/I-1',
  'CPA/I-2',
  'CPA/I-3',
  'CPA/I-4',
  'CPA/I-5',
  'CPA/I-6',
  'CPA/I-7',
  'CPA/I-8',
  'CPA/I-9',
] as const;

export type OfficialCommandCode = typeof OFFICIAL_COMMAND_CODES[number];

/**
 * Normalizes any variation, typo, lowercase, or acronym (e.g. IPC, CPI - Direção Setorial, CPAI-1, cpai-2)
 * to the official standard acronym: CPI, CPA/I-1 ... CPA/I-9.
 */
export function normalizeCommandName(raw: string | undefined | null): string {
  if (!raw) return 'CPI';
  const str = String(raw).trim();
  const upper = str.toUpperCase();

  // Check CPI variants (including accidental inversion IPC, Direção Setorial, Gabinete)
  if (
    upper === 'CPI' ||
    upper === 'IPC' ||
    upper.startsWith('CPI') ||
    upper.startsWith('IPC') ||
    upper.includes('DIREÇÃO SETORIAL') ||
    upper.includes('DIRECAO SETORIAL') ||
    upper.includes('GABINETE CPI') ||
    upper.includes('SEÇÃO OPERACIONAL CPI') ||
    upper.includes('SECAO OPERACIONAL CPI') ||
    upper === 'CPI - DIREÇÃO SETORIAL' ||
    upper === 'CPI - DIRECAO SETORIAL' ||
    upper === 'DIREÇÃO' ||
    upper === 'DIRECAO'
  ) {
    // Only if it doesn't explicitly specify CPA/I-X
    if (!upper.includes('CPA/I-') && !upper.includes('CPAI-') && !upper.includes('CPA-')) {
      return 'CPI';
    }
  }

  // Check CPA/I-1 through CPA/I-9
  for (let i = 1; i <= 9; i++) {
    if (
      upper === `CPA/I-${i}` ||
      upper === `CPAI-${i}` ||
      upper === `CPA-${i}` ||
      upper === `CPAI${i}` ||
      upper === `CPA/I ${i}` ||
      upper === `CPA I - ${i}` ||
      upper === `CPA I-${i}` ||
      upper.includes(`CPA/I-${i}`) ||
      upper.includes(`CPAI-${i}`) ||
      upper.includes(`CPA-${i}`) ||
      upper.includes(`CPA I - ${i}`) ||
      upper.includes(`CPA I-${i}`) ||
      upper.includes(`INTERIOR ${i}`) ||
      upper.includes(`INTERIOR - ${i}`) ||
      upper.includes(`INTERIOR 0${i}`) ||
      upper.includes(`INTERIOR - 0${i}`) ||
      upper.endsWith(`I-${i}`) ||
      upper.endsWith(`I ${i}`)
    ) {
      return `CPA/I-${i}`;
    }
  }

  // If nothing matched and starts with CPI
  if (upper.includes('CPI')) return 'CPI';

  return str;
}

/**
 * Returns the exact official index for sorting:
 * 0: CPI
 * 1: CPA/I-1
 * 2: CPA/I-2
 * 3: CPA/I-3
 * 4: CPA/I-4
 * 5: CPA/I-5
 * 6: CPA/I-6
 * 7: CPA/I-7
 * 8: CPA/I-8
 * 9: CPA/I-9
 */
export function getCommandOrderIndex(raw: string | undefined | null): number {
  const norm = normalizeCommandName(raw);
  const idx = OFFICIAL_COMMAND_CODES.indexOf(norm as any);
  return idx >= 0 ? idx : 99;
}

/**
 * Sorts any array of objects strictly by official command order:
 * CPI, CPA/I-1, CPA/I-2, CPA/I-3, CPA/I-4, CPA/I-5, CPA/I-6, CPA/I-7, CPA/I-8, CPA/I-9
 */
export function sortCommandsByOfficialOrder<T>(
  items: T[],
  getCode: (item: T) => string | undefined | null = (item: any) =>
    item?.code ?? item?.commandId ?? item?.id ?? item?.name ?? String(item)
): T[] {
  return [...items].sort((a, b) => {
    const codeA = getCode(a);
    const codeB = getCode(b);
    return getCommandOrderIndex(codeA) - getCommandOrderIndex(codeB);
  });
}

/**
 * Compares whether two command representations refer to the same unit
 */
export function areCommandsEqual(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  if (!a || !b) return false;
  return normalizeCommandName(a) === normalizeCommandName(b);
}
