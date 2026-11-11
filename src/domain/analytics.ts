import { addDays, addMonths, daysInMonth, formatLong, formatMonth, iso, monthKey, monthShort, parts, weekdayShort, yearKey } from './dates';
import type { ISODate, Transaction } from './types';

export type PeriodKind = 'day' | 'month' | 'year';
export interface Period {
  kind: PeriodKind;
  anchor: ISODate;
}

export interface Summary {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export function inPeriod(date: ISODate, p: Period) {
  if (p.kind === 'day') return date === p.anchor;
  if (p.kind === 'month') return monthKey(date) === monthKey(p.anchor);
  return yearKey(date) === yearKey(p.anchor);
}

export const filterByPeriod = (txs: Transaction[], p: Period) => txs.filter((t) => inPeriod(t.date, p));

export function summarize(txs: Transaction[]): Summary {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense, count: txs.length };
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.kind === 'day') return { kind: 'day', anchor: addDays(p.anchor, delta) };
  if (p.kind === 'month') return { kind: 'month', anchor: addMonths(p.anchor, delta) };
  return { kind: 'year', anchor: addMonths(p.anchor, delta * 12) };
}

export function periodLabel(p: Period) {
  if (p.kind === 'day') return formatLong(p.anchor);
  if (p.kind === 'month') return formatMonth(p.anchor);
  return yearKey(p.anchor);
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  share: number; // 0..1
}

/** Expense totals per category, largest first. */
export function byCategory(txs: Transaction[], type: 'expense' | 'income' = 'expense'): CategoryTotal[] {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    sum += t.amount;
  }
  return [...totals.entries()]
    .map(([categoryId, total]) => ({ categoryId, total, share: sum ? total / sum : 0 }))
    .sort((a, b) => b.total - a.total);
}

export interface SeriesPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}

/**
 * Trend buckets for a period:
 * day -> the 7 days ending on the anchor, month -> each day, year -> each month.
 */
export function series(txs: Transaction[], p: Period): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  const keyOf: (d: ISODate) => string = p.kind === 'year' ? monthKey : (d) => d;
  if (p.kind === 'day') {
    for (let i = 6; i >= 0; i--) {
      const d = addDays(p.anchor, -i);
      points.push({ key: d, label: weekdayShort(d), income: 0, expense: 0 });
    }
  } else if (p.kind === 'month') {
    const { y, m } = parts(p.anchor);
    for (let d = 1; d <= daysInMonth(y, m); d++) points.push({ key: iso(y, m, d), label: String(d), income: 0, expense: 0 });
  } else {
    const { y } = parts(p.anchor);
    for (let m = 1; m <= 12; m++) points.push({ key: iso(y, m, 1).slice(0, 7), label: monthShort(m), income: 0, expense: 0 });
  }
  const index = new Map(points.map((pt, i) => [pt.key, i]));
  for (const t of txs) {
    const i = index.get(keyOf(t.date));
    if (i === undefined) continue;
    if (t.type === 'income') points[i].income += t.amount;
    else points[i].expense += t.amount;
  }
  return points;
}

/** Groups transactions by date, newest day first. Input order within a day is kept. */
export function groupByDay(txs: Transaction[]) {
  const map = new Map<ISODate, Transaction[]>();
  for (const t of txs) {
    const list = map.get(t.date);
    if (list) list.push(t);
    else map.set(t.date, [t]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items, total: summarize(items).net }));
}
