import { addDays } from './dates';
import type { Budget, Goal, ISODate, Transaction } from './types';
import type { PlanResult } from './plan';

/** Consecutive days with at least one logged transaction. Today not being logged yet does not break it. */
export function streak(txs: Transaction[], today: ISODate) {
  const days = new Set(txs.map((t) => t.date));
  let cur = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

const TITLES = ['Coin Rookie', 'Penny Scout', 'Budget Squire', 'Ledger Knight', 'Vault Keeper', 'Gold Sage', 'Finance Legend'];

export interface Level {
  level: number;
  title: string;
  xp: number;
  xpIntoLevel: number;
  xpForNext: number;
}

/** Level L starts at 100 * L * (L - 1) / 2 XP, so each level needs 100 more than the last. */
export function levelFor(xp: number): Level {
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2));
  const floor = (100 * level * (level - 1)) / 2;
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
    xp,
    xpIntoLevel: xp - floor,
    xpForNext: 100 * level,
  };
}

export function totalXp(txs: Transaction[], goals: Goal[], budgets: Budget[], today: ISODate) {
  const done = goals.filter((g) => g.targetAmount > 0 && g.savedAmount >= g.targetAmount).length;
  return txs.length * 10 + streak(txs, today) * 5 + goals.length * 30 + done * 200 + budgets.length * 20;
}

export interface Quest {
  id: string;
  title: string;
  done: boolean;
}

export function dailyQuests(txs: Transaction[], goals: Goal[], budgets: Budget[], plan: PlanResult, today: ISODate): Quest[] {
  const loggedToday = txs.some((t) => t.date === today);
  return [
    { id: 'log', title: 'Log a transaction today', done: loggedToday },
    { id: 'allowance', title: 'Stay within your daily allowance', done: plan.configured && loggedToday && plan.remainingToday >= 0 },
    { id: 'budget', title: 'Set a monthly budget', done: budgets.length > 0 },
    { id: 'goal', title: 'Create a savings goal', done: goals.length > 0 },
  ];
}
