import assert from 'node:assert/strict';
import { test } from 'node:test';
import { byCategory, filterByPeriod, groupByDay, periodLabel, series, shiftPeriod, summarize } from '../src/domain/analytics';
import { toCSV } from '../src/domain/csv';
import { addDays, addMonths, diffDays, endOfMonth, relativeLabel } from '../src/domain/dates';
import { demoData } from '../src/domain/demo';
import { TITLES, XP, dailyQuests, levelFor, levelStart, streak, titleFor, totalXp } from '../src/domain/game';
import { contributionDates, goalProgress } from '../src/domain/goals';
import { buildInsights } from '../src/domain/insights';
import { formatMoney, parseAmount, toInput } from '../src/domain/money';
import { computePlan } from '../src/domain/plan';
import type { Goal, Transaction } from '../src/domain/types';

let n = 0;
const tx = (type: 'expense' | 'income', amount: number, date: string, categoryId = 'food'): Transaction => ({
  id: String(n), type, amount, date, categoryId, note: '', createdAt: n++,
});

test('dates: month arithmetic clamps and crosses years', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2026-11-11', 2), '2027-01-11');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-15');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(endOfMonth('2026-02-10'), '2026-02-28');
  assert.equal(diffDays('2026-11-11', '2026-11-30'), 19);
  assert.equal(relativeLabel('2026-11-10', '2026-11-11'), 'Yesterday');
});

test('money: indian and western grouping, parsing', () => {
  assert.equal(formatMoney(12450000, 'INR'), '₹1,24,500');
  assert.equal(formatMoney(123456789, 'USD'), '$1,234,567.89');
  assert.equal(formatMoney(-34000, 'INR'), '-₹340');
  assert.equal(formatMoney(1050, 'INR'), '₹10.50');
  assert.equal(formatMoney(1500, 'JPY'), '¥1,500');
  assert.equal(formatMoney(500, 'USD', { sign: true }), '+$5');
  assert.equal(parseAmount('1,200.50', 'INR'), 120050);
  assert.equal(parseAmount('19.99', 'USD'), 1999);
  assert.equal(parseAmount('500', 'JPY'), 500);
  assert.equal(parseAmount('abc', 'INR'), 0);
  assert.equal(toInput(120050, 'INR'), '1200.5');
});

test('analytics: day, month and year views', () => {
  const txs = [
    tx('income', 60000, '2026-11-01', 'salary'),
    tx('expense', 340, '2026-11-11', 'food'),
    tx('expense', 60, '2026-11-11', 'travel'),
    tx('expense', 600, '2026-11-10', 'food'),
    tx('expense', 1000, '2026-10-05', 'bills'),
    tx('expense', 50, '2025-12-31', 'food'),
  ];
  const day = { kind: 'day', anchor: '2026-11-11' } as const;
  const month = { kind: 'month', anchor: '2026-11-11' } as const;
  const year = { kind: 'year', anchor: '2026-11-11' } as const;

  assert.deepEqual(summarize(filterByPeriod(txs, day)), { income: 0, expense: 400, net: -400, count: 2 });
  assert.equal(summarize(filterByPeriod(txs, month)).expense, 1000);
  assert.equal(summarize(filterByPeriod(txs, year)).expense, 2000);

  const cats = byCategory(filterByPeriod(txs, month));
  assert.equal(cats[0].categoryId, 'food');
  assert.equal(cats[0].total, 940);
  assert.ok(Math.abs(cats[0].share - 0.94) < 1e-9);

  const d = series(txs, day);
  assert.equal(d.length, 7);
  assert.equal(d[6].expense, 400);
  assert.equal(d[5].expense, 600);
  const m = series(txs, month);
  assert.equal(m.length, 30);
  assert.equal(m[0].income, 60000);
  const y = series(txs, year);
  assert.equal(y.length, 12);
  assert.equal(y[9].expense, 1000);
  assert.equal(y[10].expense, 1000);

  assert.equal(periodLabel(shiftPeriod(month, -1)), 'Oct 2026');
  assert.equal(periodLabel(shiftPeriod(year, 1)), '2027');
  assert.equal(periodLabel(shiftPeriod(day, 1)), 'Nov 12, 2026');

  const groups = groupByDay(filterByPeriod(txs, month));
  assert.equal(groups[0].date, '2026-11-11');
  assert.equal(groups[0].total, -400);
});

test('plan: daily allowance to hit a monthly savings target', () => {
  // Earn 60,000, save 15,000, spent 9,000 before Nov 11 -> 36,000 over the 20 days left = 1,800/day.
  const txs = [tx('income', 60000, '2026-11-01', 'salary'), tx('expense', 9000, '2026-11-05'), tx('expense', 500, '2026-11-11')];
  const plan = computePlan({ transactions: txs, today: '2026-11-11', monthlyIncome: 60000, monthlySavingsTarget: 15000, saveRule: 'start' });
  assert.equal(plan.daysLeft, 20);
  assert.equal(plan.spendable, 45000);
  assert.equal(plan.dailyAllowance, 1800);
  assert.equal(plan.remainingToday, 1300);
  assert.equal(plan.onTrack, true);

  // Overspending never produces a negative allowance.
  const broke = computePlan({ transactions: [tx('expense', 99999, '2026-11-02')], today: '2026-11-11', monthlyIncome: 60000, monthlySavingsTarget: 15000, saveRule: 'start' });
  assert.equal(broke.dailyAllowance, 0);
  assert.equal(broke.onTrack, false);
});

test('plan: start rule uses planned income, end rule uses income received', () => {
  const txs = [tx('income', 20000, '2026-11-03', 'salary')];
  const base = { transactions: txs, today: '2026-11-11', monthlyIncome: 60000, monthlySavingsTarget: 10000 };
  assert.equal(computePlan({ ...base, saveRule: 'start' }).incomeBasis, 60000);
  assert.equal(computePlan({ ...base, saveRule: 'end' }).incomeBasis, 20000);
  assert.equal(computePlan({ ...base, saveRule: 'end' }).dailyAllowance, 500);
  // Nothing received yet: the end rule falls back to the plan.
  assert.equal(computePlan({ ...base, transactions: [], saveRule: 'end' }).incomeBasis, 60000);
  assert.equal(computePlan({ ...base, transactions: [], monthlyIncome: 0, saveRule: 'end' }).configured, false);
});

test('goals: contribution schedule follows the rule', () => {
  assert.deepEqual(contributionDates('2026-11-11', '2027-01-20', 'start'), ['2026-12-01', '2027-01-01']);
  assert.deepEqual(contributionDates('2026-11-11', '2027-01-20', 'end'), ['2026-11-30', '2026-12-31']);
  assert.deepEqual(contributionDates('2026-11-11', '2027-01-31', 'end'), ['2026-11-30', '2026-12-31', '2027-01-31']);
  assert.deepEqual(contributionDates('2026-12-01', '2026-12-15', 'start'), ['2026-12-01']);

  const goal: Goal = { id: 'g', name: 'Trip', icon: 'star', targetAmount: 250000, savedAmount: 120000, targetDate: '2027-01-20', createdAt: 0 };
  const p = goalProgress(goal, '2026-11-11', 'start');
  assert.equal(p.status, 'active');
  assert.equal(p.percent, 48);
  assert.equal(p.perMonth, 65000);
  assert.equal(p.nextContribution, '2026-12-01');

  assert.equal(goalProgress({ ...goal, targetDate: '2026-11-20' }, '2026-11-11', 'start').perMonth, 130000);
  assert.equal(goalProgress({ ...goal, targetDate: '2026-11-01' }, '2026-11-11', 'end').status, 'overdue');
  assert.equal(goalProgress({ ...goal, savedAmount: 250000 }, '2026-11-11', 'end').status, 'done');
  assert.equal(goalProgress({ ...goal, targetDate: null }, '2026-11-11', 'end').status, 'open');
});

test('game: streaks, levels, quests', () => {
  const txs = [tx('expense', 1, '2026-11-10'), tx('expense', 1, '2026-11-09'), tx('expense', 1, '2026-11-07')];
  assert.equal(streak(txs, '2026-11-11'), 2);
  assert.equal(streak([...txs, tx('expense', 1, '2026-11-11')], '2026-11-11'), 3);
  assert.equal(streak([], '2026-11-11'), 0);

  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(99).level, 1);
  assert.equal(levelFor(100).level, 2);
  assert.equal(levelFor(299).level, 2);
  assert.equal(levelFor(300).level, 3);
  assert.deepEqual([levelFor(150).xpIntoLevel, levelFor(150).xpForNext], [50, 200]);

  const plan = computePlan({ transactions: txs, today: '2026-11-11', monthlyIncome: 0, monthlySavingsTarget: 0, saveRule: 'start' });
  assert.equal(dailyQuests(txs, [], [], plan, '2026-11-11').filter((q) => q.done).length, 0);
});

test('insights: warns on budgets and flags the top category', () => {
  const txs = [tx('income', 50000, '2026-11-01', 'salary'), tx('expense', 9000, '2026-11-03', 'food'), tx('expense', 2000, '2026-11-04', 'travel')];
  const plan = computePlan({ transactions: txs, today: '2026-11-11', monthlyIncome: 50000, monthlySavingsTarget: 10000, saveRule: 'start' });
  const list = buildInsights({
    transactions: txs, budgets: [{ categoryId: 'food', amount: 8000 }, { categoryId: 'overall', amount: 13000 }], goals: [],
    period: { kind: 'month', anchor: '2026-11-11' }, today: '2026-11-11', plan, savingsTarget: 10000, saveRule: 'start', fmt: (v) => `#${v}`,
  });
  const ids = list.map((i) => i.id);
  assert.ok(ids.includes('over-food'));
  assert.ok(ids.includes('near-overall'));
  assert.ok(ids.includes('plan-ok'));
  assert.ok(ids.includes('top'));
  assert.ok(ids.includes('quiet'));
  assert.equal(list.find((i) => i.id === 'top')?.title, 'Food & Dining is your biggest expense');

  const empty = buildInsights({ transactions: [], budgets: [], goals: [], period: { kind: 'day', anchor: '2026-11-11' }, today: '2026-11-11', plan, savingsTarget: 0, saveRule: 'end', fmt: String });
  assert.equal(empty[0].id, 'empty');
});

test('csv and demo data', () => {
  const csv = toCSV([{ ...tx('expense', 34050, '2026-11-11'), note: 'Lunch, "big"' }], 'INR');
  assert.equal(csv.split('\n')[1], '2026-11-11,expense,Food & Dining,340.5,INR,"Lunch, ""big"""');
  const demo = demoData('2026-11-11');
  assert.ok(demo.transactions.length > 50);
  assert.ok(demo.transactions.every((t) => t.date >= '2026-09-01' && t.date <= '2026-11-11' && t.amount > 0));
  assert.deepEqual(demoData('2026-11-11'), demo);
});

test('game: xp table, level starts and titles agree with levelFor', () => {
  assert.equal(levelStart(1), 0);
  assert.equal(levelStart(2), 100);
  assert.equal(levelStart(5), 1000);
  for (const level of [1, 2, 3, 7, 12]) {
    assert.equal(levelFor(levelStart(level)).level, level);
    assert.equal(levelFor(levelStart(level)).title, titleFor(level));
    if (level > 1) assert.equal(levelFor(levelStart(level) - 1).level, level - 1);
  }
  assert.equal(titleFor(1), TITLES[0]);
  assert.equal(titleFor(99), TITLES[TITLES.length - 1]);
  const txs = [tx('expense', 100, '2026-11-11'), tx('expense', 100, '2026-11-10')];
  assert.equal(totalXp(txs, [], [{ categoryId: 'food', amount: 1 }], '2026-11-11'), 2 * XP.transaction + 2 * XP.streakDay + XP.budget);
});
