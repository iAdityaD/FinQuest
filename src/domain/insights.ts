import { byCategory, filterByPeriod, inPeriod, series, shiftPeriod, summarize } from './analytics';
import type { Period } from './analytics';
import { getCategory as builtInCategory } from './categories';
import type { CategoryLookup } from './categories';
import { formatLong } from './dates';
import { goalProgress } from './goals';
import type { PlanResult } from './plan';
import { OVERALL } from './types';
import type { Budget, Goal, ISODate, SaveRule, Transaction } from './types';

export type Tone = 'good' | 'warn' | 'info';
export interface Insight {
  id: string;
  tone: Tone;
  title: string;
  body: string;
}

export interface InsightInput {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  period: Period;
  today: ISODate;
  plan: PlanResult;
  savingsTarget: number;
  saveRule: SaveRule;
  monthStartDay?: number;
  /** The user's categories. Defaults to the built-in list. */
  getCategory?: CategoryLookup;
  fmt: (minor: number) => string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const NOUN = { day: 'day', month: 'month', year: 'year' } as const;

/** Plain-language guidance for the selected period. Ordered by importance. */
export function buildInsights(input: InsightInput): Insight[] {
  const { transactions, budgets, goals, period, today, plan, savingsTarget, saveRule, fmt } = input;
  const getCategory = input.getCategory ?? builtInCategory;
  const out: Insight[] = [];
  const current = filterByPeriod(transactions, period);
  const sum = summarize(current);
  const noun = NOUN[period.kind];
  const isCurrentMonth = period.kind === 'month' && inPeriod(today, period);

  if (sum.count === 0) {
    return [{ id: 'empty', tone: 'info', title: 'Nothing logged yet', body: `Add a transaction to see guidance for this ${noun}.` }];
  }

  // Budgets (month view only: budgets are monthly)
  if (period.kind === 'month') {
    const cats = byCategory(current);
    for (const b of budgets) {
      if (b.amount <= 0) continue;
      const spent = b.categoryId === OVERALL ? sum.expense : cats.find((c) => c.categoryId === b.categoryId)?.total ?? 0;
      const name = b.categoryId === OVERALL ? 'Overall budget' : getCategory(b.categoryId).name;
      const ratio = spent / b.amount;
      if (ratio > 1) out.push({ id: `over-${b.categoryId}`, tone: 'warn', title: `${name} is over budget`, body: `Spent ${fmt(spent)} of ${fmt(b.amount)}, which is ${fmt(spent - b.amount)} over.` });
      else if (ratio >= 0.8) out.push({ id: `near-${b.categoryId}`, tone: 'warn', title: `${name} is almost used up`, body: `${pct(ratio)} used. ${fmt(b.amount - spent)} left for the month.` });
    }
  }

  // Savings plan
  if (isCurrentMonth && plan.configured && savingsTarget > 0) {
    if (plan.onTrack) out.push({ id: 'plan-ok', tone: 'good', title: 'On track to hit your savings target', body: `At this pace you finish the month with about ${fmt(plan.projectedSavings)} saved. Target: ${fmt(savingsTarget)}.` });
    else out.push({ id: 'plan-behind', tone: 'warn', title: 'Savings target at risk', body: `At this pace you end the month with about ${fmt(plan.projectedSavings)}. Keep spending under ${fmt(plan.dailyAllowance)} a day to save ${fmt(savingsTarget)}.` });
  }

  // Savings rate
  if (sum.income > 0) {
    const rate = sum.net / sum.income;
    if (rate >= 0.2) out.push({ id: 'rate', tone: 'good', title: `You kept ${pct(rate)} of your income`, body: `${fmt(sum.net)} left after expenses this ${noun}.` });
    else if (rate >= 0) out.push({ id: 'rate', tone: 'info', title: `You kept ${pct(rate)} of your income`, body: 'A common guideline is to keep at least 20%.' });
    else out.push({ id: 'rate', tone: 'warn', title: 'Spending is higher than income', body: `You spent ${fmt(-sum.net)} more than you earned this ${noun}.` });
  }

  // Compared with the previous period
  const prev = summarize(filterByPeriod(transactions, shiftPeriod(period, -1)));
  if (prev.expense > 0 && sum.expense > 0) {
    const change = (sum.expense - prev.expense) / prev.expense;
    // A period that is still running would always look cheaper than a finished one.
    if (Math.abs(change) >= 0.1 && !inPeriod(today, period)) {
      out.push({
        id: 'trend',
        tone: change > 0 ? 'warn' : 'good',
        title: `Spending ${change > 0 ? 'up' : 'down'} ${pct(Math.abs(change))}`,
        body: `${fmt(sum.expense)} this ${noun} against ${fmt(prev.expense)} the ${noun} before.`,
      });
    }
  }

  // Top category
  const top = byCategory(current)[0];
  if (top) {
    out.push({ id: 'top', tone: 'info', title: `${getCategory(top.categoryId).name} is your biggest expense`, body: `${fmt(top.total)}, ${pct(top.share)} of spending this ${noun}.` });
  }

  // Heaviest bucket and no-spend days
  if (period.kind !== 'day') {
    const points = series(current, period);
    const peak = points.reduce((a, b) => (b.expense > a.expense ? b : a), points[0]);
    if (peak.expense > 0) {
      const when = period.kind === 'month' ? formatLong(peak.key) : peak.label;
      out.push({ id: 'peak', tone: 'info', title: `Highest spending: ${when}`, body: `${fmt(peak.expense)} went out.` });
    }
    if (period.kind === 'month') {
      const elapsed = points.filter((p) => p.key <= today);
      const quiet = elapsed.filter((p) => p.expense === 0).length;
      if (quiet > 0) out.push({ id: 'quiet', tone: 'good', title: `${quiet} no-spend day${quiet === 1 ? '' : 's'}`, body: 'Days with nothing spent help the most with saving.' });
    }
  }

  // Goals behind schedule
  for (const g of goals) {
    const p = goalProgress(g, today, saveRule, input.monthStartDay);
    if (p.status === 'overdue') out.push({ id: `goal-${g.id}`, tone: 'warn', title: `${g.name} passed its target date`, body: `${fmt(p.remaining)} still to go. Move the date or add to it.` });
  }

  return out;
}
