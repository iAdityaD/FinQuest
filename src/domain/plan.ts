import { summarize } from './analytics';
import { cycleFor, diffDays } from './dates';
import type { ISODate, SaveRule, Transaction } from './types';

export interface PlanInput {
  transactions: Transaction[];
  today: ISODate;
  monthlyIncome: number; // planned
  monthlySavingsTarget: number;
  saveRule: SaveRule;
  /** Day the budgeting month starts on (1-28). Defaults to the 1st. */
  monthStartDay?: number;
}

export interface PlanResult {
  configured: boolean;
  /** Income the plan is calculated from (depends on the rule). */
  incomeBasis: number;
  /** What can be spent this month after savings are set aside. */
  spendable: number;
  spentSoFar: number;
  spentToday: number;
  /** Days left in the month, including today. */
  daysLeft: number;
  /** Fixed for the whole day: based on what was spent before today. */
  dailyAllowance: number;
  /** dailyAllowance - spentToday. Negative when overspent today. */
  remainingToday: number;
  /** Savings at month end if spending continues at the current daily average. */
  projectedSavings: number;
  onTrack: boolean;
}

/**
 * "Safe to spend": how much can be spent per day so that the monthly savings
 * target is still met at the end of the month.
 */
export function computePlan(input: PlanInput): PlanResult {
  const { transactions, today, monthlyIncome, monthlySavingsTarget, saveRule } = input;
  const cycle = cycleFor(today, input.monthStartDay);
  const month = transactions.filter((t) => t.date >= cycle.start && t.date <= today);
  const { income: actualIncome, expense: spentSoFar } = summarize(month);
  const spentToday = summarize(month.filter((t) => t.date === today)).expense;

  // start: savings come out of the planned pay on day 1 (extra income still counts).
  // end: only money that has actually arrived counts; fall back to the plan until some does.
  const incomeBasis = saveRule === 'start' ? Math.max(monthlyIncome, actualIncome) : actualIncome || monthlyIncome;

  const spendable = incomeBasis - monthlySavingsTarget;
  const daysLeft = diffDays(today, cycle.end) + 1;
  const spentBeforeToday = spentSoFar - spentToday;
  const dailyAllowance = Math.max(0, Math.floor((spendable - spentBeforeToday) / daysLeft));

  const dayOfMonth = diffDays(cycle.start, today) + 1;
  const avgPerDay = spentSoFar / dayOfMonth;
  const projectedSavings = Math.round(incomeBasis - spentSoFar - avgPerDay * (daysLeft - 1));

  return {
    configured: incomeBasis > 0,
    incomeBasis,
    spendable,
    spentSoFar,
    spentToday,
    daysLeft,
    dailyAllowance,
    remainingToday: dailyAllowance - spentToday,
    projectedSavings,
    onTrack: projectedSavings >= monthlySavingsTarget,
  };
}
