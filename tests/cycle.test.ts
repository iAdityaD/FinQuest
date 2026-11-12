import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterByPeriod, inPeriod, periodLabel, series, shiftPeriod } from '../src/domain/analytics';
import { cycleFor, formatCycle } from '../src/domain/dates';
import { contributionDates } from '../src/domain/goals';
import { computePlan } from '../src/domain/plan';
import type { Transaction } from '../src/domain/types';

let n = 0;
const tx = (type: 'expense' | 'income', amount: number, date: string): Transaction => ({
  id: String(n), type, amount, date, categoryId: 'food', note: '', createdAt: n++,
});

test('cycle: a month can start on pay day', () => {
  assert.deepEqual(cycleFor('2026-11-11', 25), { start: '2026-10-25', end: '2026-11-24' });
  assert.deepEqual(cycleFor('2026-11-25', 25), { start: '2026-11-25', end: '2026-12-24' });
  assert.deepEqual(cycleFor('2027-01-03', 25), { start: '2026-12-25', end: '2027-01-24' });
  assert.deepEqual(cycleFor('2026-02-10', 1), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(cycleFor('2026-02-10'), { start: '2026-02-01', end: '2026-02-28' });
  // Out-of-range settings fall back to something every month has.
  assert.deepEqual(cycleFor('2026-03-30', 31), { start: '2026-03-28', end: '2026-04-27' });
  assert.equal(formatCycle('2026-11-11', 25), 'Oct 25 - Nov 24');
  assert.equal(formatCycle('2026-11-11', 1), 'Nov 2026');
});

test('cycle: month analytics follow the cycle', () => {
  const p = { kind: 'month', anchor: '2026-11-11', startDay: 25 } as const;
  assert.equal(inPeriod('2026-10-25', p), true);
  assert.equal(inPeriod('2026-11-24', p), true);
  assert.equal(inPeriod('2026-11-25', p), false);
  assert.equal(inPeriod('2026-10-24', p), false);
  assert.equal(periodLabel(p), 'Oct 25 - Nov 24');
  assert.equal(periodLabel(shiftPeriod(p, 1)), 'Nov 25 - Dec 24');
  assert.equal(periodLabel(shiftPeriod(p, -1)), 'Sep 25 - Oct 24');
  assert.equal(periodLabel(shiftPeriod(shiftPeriod(p, 3), -3)), 'Oct 25 - Nov 24');

  const txs = [tx('expense', 100, '2026-10-24'), tx('expense', 200, '2026-10-25'), tx('expense', 300, '2026-11-24'), tx('expense', 400, '2026-11-25')];
  assert.deepEqual(filterByPeriod(txs, p).map((t) => t.amount), [200, 300]);
  const points = series(txs, p);
  assert.equal(points.length, 31);
  assert.equal(points[0].key, '2026-10-25');
  assert.equal(points[0].label, '25');
  assert.equal(points[0].expense, 200);
  assert.equal(points[30].key, '2026-11-24');
  assert.equal(points[30].expense, 300);
});

test('cycle: days left and allowance follow the cycle', () => {
  const txs = [tx('expense', 9000, '2026-10-20'), tx('expense', 3000, '2026-10-26'), tx('expense', 500, '2026-11-11')];
  const plan = computePlan({ transactions: txs, today: '2026-11-11', monthlyIncome: 60000, monthlySavingsTarget: 15000, saveRule: 'start', monthStartDay: 25 });
  // Nov 11..Nov 24 = 14 days. Oct 20 is in the previous cycle and does not count.
  assert.equal(plan.daysLeft, 14);
  assert.equal(plan.spentSoFar, 3500);
  assert.equal(plan.dailyAllowance, Math.floor((45000 - 3000) / 14));
  assert.equal(plan.remainingToday, 3000 - 500);
});

test('cycle: goal contributions fall on the cycle start or end', () => {
  assert.deepEqual(contributionDates('2026-11-11', '2027-01-30', 'start', 25), ['2026-11-25', '2026-12-25', '2027-01-25']);
  assert.deepEqual(contributionDates('2026-11-25', '2026-12-30', 'start', 25), ['2026-11-25', '2026-12-25']);
  assert.deepEqual(contributionDates('2026-11-11', '2027-01-30', 'end', 25), ['2026-11-24', '2026-12-24', '2027-01-24']);
});
