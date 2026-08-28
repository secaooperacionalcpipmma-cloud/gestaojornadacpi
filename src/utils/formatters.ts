/**
 * Accounting and Currency formatters for Brazilian Real (BRL)
 * and police operational metrics (JOEs).
 */

/**
 * Formats a number to Brazilian Real accounting currency string.
 * Example: 10500 -> "R$ 10.500,00"
 * Example: 660100 -> "R$ 660.100,00"
 */
export function formatCurrencyBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a number to Brazilian accounting standard number (with thousands separators and 2 decimals)
 * Example: 10500 -> "10.500,00"
 */
export function formatAccountingNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00';
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats an integer (like quantity of JOEs) with thousands separator.
 * Example: 1886 -> "1.886"
 */
export function formatInteger(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString('pt-BR');
}

/**
 * Parses a Brazilian currency string (e.g. "65.100,00", "R$ 65.100,00", "65100") into a raw float number.
 */
export function parseBRLInput(input: string): number {
  if (!input) return 0;
  // Remove currency symbol, spaces, and dots
  const clean = input
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats an ISO date string or YYYY-MM-DD to Brazilian date format: DD/MM/AAAA
 */
export function formatDateBRL(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Formats an ISO timestamp or date to full Brazilian date and time: DD/MM/AAAA às HH:MM
 */
export function formatDateTimeBRL(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

