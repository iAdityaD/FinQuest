import type { ISODate } from './types';

const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** month is 1-12 */
export const iso = (y: number, m: number, d: number): ISODate => `${y}-${pad(m)}-${pad(d)}`;

export function parts(s: ISODate) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

const utc = (s: ISODate) => {
  const { y, m, d } = parts(s);
  return Date.UTC(y, m - 1, d);
};

export const fromDate = (dt: Date): ISODate => iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
export const today = (): ISODate => fromDate(new Date());

export function addDays(s: ISODate, n: number): ISODate {
  const dt = new Date(utc(s) + n * DAY);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Moves by whole months, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(s: ISODate, n: number): ISODate {
  const { y, m, d } = parts(s);
  const t = y * 12 + (m - 1) + n;
  const ny = Math.floor(t / 12);
  const nm = (((t % 12) + 12) % 12) + 1;
  return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** b - a in days */
export const diffDays = (a: ISODate, b: ISODate) => Math.round((utc(b) - utc(a)) / DAY);

export const monthKey = (s: ISODate) => s.slice(0, 7);
export const yearKey = (s: ISODate) => s.slice(0, 4);
export const startOfMonth = (s: ISODate): ISODate => `${monthKey(s)}-01`;
export function endOfMonth(s: ISODate): ISODate {
  const { y, m } = parts(s);
  return iso(y, m, daysInMonth(y, m));
}

export const monthShort = (m: number) => MONTHS[m - 1];
export const weekdayShort = (s: ISODate) => WEEKDAYS[new Date(utc(s)).getUTCDay()];

export function formatLong(s: ISODate) {
  const { y, m, d } = parts(s);
  return `${monthShort(m)} ${d}, ${y}`;
}
export function formatMonth(s: ISODate) {
  const { y, m } = parts(s);
  return `${monthShort(m)} ${y}`;
}
export function relativeLabel(s: ISODate, now: ISODate) {
  const diff = diffDays(s, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return `${weekdayShort(s)}, ${formatLong(s)}`;
}

export const isValidDate = (y: number, m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
