import { addDays, addMonths, diffDays } from './dates';
import type { ISODate, RecurringRule, Transaction } from './types';

/** The k-th occurrence of a rule (k = 0 is the anchor date itself). */
function occurrence(rule: RecurringRule, k: number): ISODate {
  const step = Math.max(1, Math.floor(rule.interval)) * k;
  switch (rule.frequency) {
    case 'daily':
      return addDays(rule.anchorDate, step);
    case 'weekly':
      return addDays(rule.anchorDate, step * 7);
    case 'monthly':
      // Always counted from the anchor, so a rule on the 31st gives Feb 28 and then Mar 31 again.
      return addMonths(rule.anchorDate, step);
    case 'yearly':
      return addMonths(rule.anchorDate, step * 12);
  }
}

/** A safe lower bound for the first occurrence index that can fall on or after `from`. */
function firstIndex(rule: RecurringRule, from: ISODate): number {
  const gap = diffDays(rule.anchorDate, from);
  if (gap <= 0) return 0;
  const interval = Math.max(1, Math.floor(rule.interval));
  const longest = { daily: 1, weekly: 7, monthly: 31, yearly: 366 }[rule.frequency] * interval;
  return Math.max(0, Math.floor(gap / longest) - 1);
}

/** Every date the rule falls on between `from` and `to`, both included. */
export function dueDates(rule: RecurringRule, from: ISODate, to: ISODate): ISODate[] {
  const last = rule.endDate && rule.endDate < to ? rule.endDate : to;
  const out: ISODate[] = [];
  if (from > last) return out;
  for (let k = firstIndex(rule, from); ; k++) {
    const d = occurrence(rule, k);
    if (d > last) break;
    if (d >= from) out.push(d);
  }
  return out;
}

/** The next date the rule will fire after `after`, or null when it has ended. */
export function nextDue(rule: RecurringRule, after: ISODate): ISODate | null {
  for (let k = firstIndex(rule, after); ; k++) {
    const d = occurrence(rule, k);
    if (rule.endDate && d > rule.endDate) return null;
    if (d > after) return d;
  }
}

/** Ids are derived from the rule and the date, so writing an occurrence twice can never duplicate it. */
export const occurrenceId = (ruleId: string, date: ISODate) => `r-${ruleId}-${date}`;

export interface Materialized {
  transactions: Transaction[];
  updatedRules: RecurringRule[];
}

/**
 * Creates every occurrence that came due since each rule last ran, up to and
 * including `today`. Paused rules are skipped and keep their place, so
 * resuming one later does not back-fill the paused stretch.
 */
export function materialize(rules: RecurringRule[], today: ISODate, stamp = Date.now()): Materialized {
  const transactions: Transaction[] = [];
  const updatedRules: RecurringRule[] = [];
  for (const rule of rules) {
    if (rule.lastRunDate && rule.lastRunDate >= today) continue;
    if (rule.active) {
      const from = rule.lastRunDate ? addDays(rule.lastRunDate, 1) : rule.anchorDate;
      for (const date of dueDates(rule, from, today)) {
        transactions.push({
          id: occurrenceId(rule.id, date),
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          date,
          note: rule.note,
          createdAt: stamp + transactions.length,
        });
      }
    }
    updatedRules.push({ ...rule, lastRunDate: today });
  }
  return { transactions, updatedRules };
}

export function describeRule(rule: Pick<RecurringRule, 'frequency' | 'interval'>): string {
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[rule.frequency];
  const n = Math.max(1, Math.floor(rule.interval));
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}
