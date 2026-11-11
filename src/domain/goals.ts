import { addMonths, diffDays, endOfMonth, parts, startOfMonth } from './dates';
import type { Goal, ISODate, SaveRule } from './types';

/**
 * Dates on which money should be moved towards a goal, from today up to the target date.
 * 'start' -> the 1st of each month, 'end' -> the last day of each month.
 */
export function contributionDates(today: ISODate, target: ISODate, rule: SaveRule): ISODate[] {
  const out: ISODate[] = [];
  let cur: ISODate;
  if (rule === 'start') cur = parts(today).d === 1 ? today : startOfMonth(addMonths(today, 1));
  else cur = endOfMonth(today);
  while (cur <= target && out.length < 1200) {
    out.push(cur);
    const nextMonth = addMonths(startOfMonth(cur), 1);
    cur = rule === 'start' ? nextMonth : endOfMonth(nextMonth);
  }
  return out;
}

export type GoalStatus = 'done' | 'overdue' | 'active' | 'open';

export interface GoalProgress {
  status: GoalStatus;
  percent: number; // 0..100
  remaining: number;
  daysLeft: number | null;
  /** Number of monthly contributions left before the target date. */
  contributionsLeft: number | null;
  perMonth: number | null;
  perDay: number | null;
  nextContribution: ISODate | null;
}

export function goalProgress(goal: Goal, today: ISODate, rule: SaveRule): GoalProgress {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const percent = goal.targetAmount > 0 ? Math.min(100, Math.floor((goal.savedAmount / goal.targetAmount) * 100)) : 0;
  const base = { percent, remaining, daysLeft: null, contributionsLeft: null, perMonth: null, perDay: null, nextContribution: null };
  if (remaining === 0) return { ...base, status: 'done' };
  if (!goal.targetDate) return { ...base, status: 'open' };

  const daysLeft = diffDays(today, goal.targetDate);
  if (daysLeft < 0) return { ...base, status: 'overdue', daysLeft };

  const dates = contributionDates(today, goal.targetDate, rule);
  // Target falls before the next contribution date: one final payment, due on the target date.
  const count = Math.max(1, dates.length);
  return {
    status: 'active',
    percent,
    remaining,
    daysLeft,
    contributionsLeft: count,
    perMonth: Math.ceil(remaining / count),
    perDay: Math.ceil(remaining / (daysLeft + 1)),
    nextContribution: dates[0] ?? goal.targetDate,
  };
}

/** Total needed per month to keep every dated goal on schedule. */
export function monthlyGoalNeed(goals: Goal[], today: ISODate, rule: SaveRule) {
  return goals.reduce((sum, g) => sum + (goalProgress(g, today, rule).perMonth ?? 0), 0);
}
