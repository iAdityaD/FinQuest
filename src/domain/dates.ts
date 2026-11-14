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

/** Keeps a month-start setting usable: a whole day from 1 to 31. */
export const clampStartDay = (day: number | undefined) => Math.min(31, Math.max(1, Math.floor(day || 1)));

/**
 * The day a budgeting month starts on in one particular month. A start day
 * the month does not have (the 31st in April, the 30th in February) falls on
 * that month's last day, so "31" always means "the last day of the month".
 */
export function cycleStartIn(y: number, m: number, startDay = 1): ISODate {
  return iso(y, m, Math.min(clampStartDay(startDay), daysInMonth(y, m)));
}

/** First day of the budgeting month that begins `delta` months after the one that begins in (y, m). */
function cycleStartAfter(start: ISODate, startDay: number, delta: number): ISODate {
  const { y, m } = parts(start);
  const t = y * 12 + (m - 1) + delta;
  return cycleStartIn(Math.floor(t / 12), (((t % 12) + 12) % 12) + 1, startDay);
}

/**
 * The budgeting month a date belongs to, for people whose month starts on
 * pay day rather than the 1st. startDay 25 on Nov 11 gives Oct 25 - Nov 24.
 * startDay 31 gives Jan 31 - Feb 27, then Feb 28 - Mar 30 (Feb 29 in a leap year).
 */
export function cycleFor(date: ISODate, startDay = 1): { start: ISODate; end: ISODate } {
  const { y, m } = parts(date);
  const thisStart = cycleStartIn(y, m, startDay);
  const start = date >= thisStart ? thisStart : cycleStartAfter(thisStart, startDay, -1);
  return { start, end: addDays(cycleStartAfter(start, startDay, 1), -1) };
}

/** First day of the budgeting month `delta` months away from the one `date` is in. */
export function shiftCycle(date: ISODate, startDay: number | undefined, delta: number): ISODate {
  return cycleStartAfter(cycleFor(date, startDay).start, startDay ?? 1, delta);
}

/** "Nov 2026" for calendar months, "Oct 25 - Nov 24" when the month starts on another day. */
export function formatCycle(date: ISODate, startDay = 1) {
  if (clampStartDay(startDay) === 1) return formatMonth(date);
  const { start, end } = cycleFor(date, startDay);
  const a = parts(start);
  const b = parts(end);
  return `${monthShort(a.m)} ${a.d} - ${monthShort(b.m)} ${b.d}`;
}

/** "the 25th", "the 1st", or "the last day" for 31: how a start day reads in a sentence. */
export function describeStartDay(startDay: number) {
  const day = clampStartDay(startDay);
  if (day === 31) return 'the last day';
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `the ${day}${suffix}`;
}

export interface CalendarCell {
  date: ISODate;
  day: number;
  /** False for the leading and trailing days borrowed from the neighbouring months. */
  inMonth: boolean;
}

/** The weeks of a month as rows of seven days, Monday first, padded with neighbouring days. */
export function monthGrid(y: number, m: number): CalendarCell[][] {
  const first = iso(y, m, 1);
  // getUTCDay: 0 = Sunday. Shift so Monday is column 0.
  const lead = (new Date(utc(first)).getUTCDay() + 6) % 7;
  const total = Math.ceil((lead + daysInMonth(y, m)) / 7) * 7;
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < total; i++) {
    const date = addDays(first, i - lead);
    const p = parts(date);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ date, day: p.d, inMonth: p.m === m && p.y === y });
  }
  return weeks;
}

export const WEEKDAY_INITIALS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
