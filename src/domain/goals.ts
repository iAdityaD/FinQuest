import { addDays, addMonths, cycleFor, diffDays } from './dates';
import type { Goal, ISODate, SaveRule } from './types';

/**
 * Dates on which money should be moved towards a goal, from today up to the target date.
 * 'start' -> the first day of each budgeting month, 'end' -> its last day.
 * The budgeting month starts on `startDay` (the 1st unless the user is paid on another day).
 */
export function contributionDates(today: ISODate, target: ISODate, rule: SaveRule, startDay = 1): ISODate[] {
  const out: ISODate[] = [];
  const cycle = cycleFor(today, startDay);
  // First day of the cycle each contribution belongs to.
  let start = rule === 'start' && cycle.start !== today ? addMonths(cycle.start, 1) : cycle.start;
  for (; out.length < 1200; start = addMonths(start, 1)) {
    const due = rule === 'start' ? start : addDays(addMonths(start, 1), -1);
    if (due > target) break;
    out.push(due);
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

export function goalProgress(goal: Goal, today: ISODate, rule: SaveRule, startDay = 1): GoalProgress {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const percent = goal.targetAmount > 0 ? Math.min(100, Math.floor((goal.savedAmount / goal.targetAmount) * 100)) : 0;
  const base = { percent, remaining, daysLeft: null, contributionsLeft: null, perMonth: null, perDay: null, nextContribution: null };
  if (remaining === 0) return { ...base, status: 'done' };
  if (!goal.targetDate) return { ...base, status: 'open' };

  const daysLeft = diffDays(today, goal.targetDate);
  if (daysLeft < 0) return { ...base, status: 'overdue', daysLeft };

  const dates = contributionDates(today, goal.targetDate, rule, startDay);
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
export function monthlyGoalNeed(goals: Goal[], today: ISODate, rule: SaveRule, startDay = 1) {
  return goals.reduce((sum, g) => sum + (goalProgress(g, today, rule, startDay).perMonth ?? 0), 0);
}
