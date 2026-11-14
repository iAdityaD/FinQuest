import { addDays, addMonths, diffDays, endOfMonth, parts } from './dates';
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
      return monthly(rule, step);
    case 'yearly':
      return monthly(rule, step * 12);
  }
}

const monthly = (rule: RecurringRule, months: number) => {
  const date = addMonths(rule.anchorDate, months);
  return rule.monthEnd ? endOfMonth(date) : date;
};

/** True when a date is the last day of its month: the form then offers "last day of every month". */
export const isMonthEnd = (date: ISODate) => endOfMonth(date) === date;

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
    // Variable amounts are never logged for the user: they wait in pendingOccurrences.
    if (rule.active && rule.askAmount) continue;
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

export interface PendingOccurrence {
  rule: RecurringRule;
  /** The oldest occurrence still waiting for an amount. */
  date: ISODate;
  /** How many more are queued behind it. */
  more: number;
}

/**
 * Occurrences of ask-for-the-amount rules that have come due and not been
 * answered yet: one entry per rule, oldest date first. They are answered in
 * order, so the rule's last-run date can keep marking how far it has got.
 */
export function pendingOccurrences(rules: RecurringRule[], today: ISODate): PendingOccurrence[] {
  const out: PendingOccurrence[] = [];
  for (const rule of rules) {
    if (!rule.active || !rule.askAmount) continue;
    const from = rule.lastRunDate ? addDays(rule.lastRunDate, 1) : rule.anchorDate;
    const dates = dueDates(rule, from, today);
    if (dates.length > 0) out.push({ rule, date: dates[0], more: dates.length - 1 });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Answers one waiting occurrence. A positive amount logs it; null or 0 skips it.
 * Either way the rule moves past that date.
 */
export function resolveOccurrence(rule: RecurringRule, date: ISODate, amount: number | null, stamp = Date.now()): { transaction: Transaction | null; rule: RecurringRule } {
  const transaction: Transaction | null =
    amount && amount > 0
      ? { id: occurrenceId(rule.id, date), type: rule.type, amount, categoryId: rule.categoryId, date, note: rule.note, createdAt: stamp }
      : null;
  return { transaction, rule: { ...rule, lastRunDate: date } };
}

export function describeRule(rule: Pick<RecurringRule, 'frequency' | 'interval'>): string {
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[rule.frequency];
  const n = Math.max(1, Math.floor(rule.interval));
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}

/** "on the 5th", "on the last day": which day a monthly or yearly rule lands on. Empty for daily and weekly rules. */
export function describeDay(rule: Pick<RecurringRule, 'frequency' | 'anchorDate' | 'monthEnd'>): string {
  if (rule.frequency !== 'monthly' && rule.frequency !== 'yearly') return '';
  if (rule.monthEnd) return 'on the last day';
  const d = parts(rule.anchorDate).d;
  const suffix = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th';
  return `on the ${d}${suffix}`;
}
