import type { CurrencyCode } from './types';

interface CurrencyInfo {
  symbol: string;
  name: string;
  decimals: number;
  grouping: 'indian' | 'western';
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { symbol: '₹', name: 'Indian Rupee', decimals: 2, grouping: 'indian' },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, grouping: 'western' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, grouping: 'western' },
  GBP: { symbol: '£', name: 'Pound Sterling', decimals: 2, grouping: 'western' },
  JPY: { symbol: '¥', name: 'Japanese Yen', decimals: 0, grouping: 'western' },
};

function group(digits: string, style: 'indian' | 'western') {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const size = style === 'indian' ? 2 : 3;
  const chunks: string[] = [];
  for (let end = rest.length; end > 0; end -= size) chunks.unshift(rest.slice(Math.max(0, end - size), end));
  return `${chunks.join(',')},${last3}`;
}

/** Formats minor units, e.g. 12450000 INR -> "₹1,24,500". Decimals are shown only when non-zero. */
export function formatMoney(minor: number, code: CurrencyCode, opts: { sign?: boolean } = {}) {
  const c = CURRENCIES[code];
  const factor = 10 ** c.decimals;
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / factor);
  const frac = abs % factor;
  let out = c.symbol + group(String(whole), c.grouping);
  if (c.decimals > 0 && frac > 0) out += '.' + String(frac).padStart(c.decimals, '0');
  if (minor < 0) return '-' + out;
  return opts.sign && minor > 0 ? '+' + out : out;
}

/** Parses user input ("1,200.50") to minor units. Returns 0 for anything unusable. */
export function parseAmount(text: string, code: CurrencyCode): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const [w, ...rest] = cleaned.split('.');
  const value = Number(`${w || '0'}.${rest.join('') || '0'}`);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10 ** CURRENCIES[code].decimals);
}

/** Minor units to a plain editable string ("1200.5"). */
export function toInput(minor: number, code: CurrencyCode): string {
  if (!minor) return '';
  return String(minor / 10 ** CURRENCIES[code].decimals);
}
