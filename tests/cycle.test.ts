import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterByPeriod, inPeriod, periodLabel, series, shiftPeriod } from '../src/domain/analytics';
import { cycleFor, cycleStartIn, describeStartDay, formatCycle, monthGrid, shiftCycle } from '../src/domain/dates';
import { contributionDates } from '../src/domain/goals';
import { computePlan } from '../src/domain/plan';
import type { Transaction } from '../src/domain/types';

const shiftDay = (d: string) => { const t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + 86400000); return t.toISOString().slice(0, 10); };
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

test('cycle: a start day the month does not have means its last day', () => {
  // 31 = always the last day, whatever the month and year.
  assert.equal(cycleStartIn(2026, 1, 31), '2026-01-31');
  assert.equal(cycleStartIn(2026, 2, 31), '2026-02-28');
  assert.equal(cycleStartIn(2028, 2, 31), '2028-02-29');
  assert.equal(cycleStartIn(2026, 4, 31), '2026-04-30');
  assert.equal(cycleStartIn(2026, 2, 30), '2026-02-28');
  assert.equal(cycleStartIn(2026, 3, 30), '2026-03-30');

  assert.deepEqual(cycleFor('2026-01-31', 31), { start: '2026-01-31', end: '2026-02-27' });
  assert.deepEqual(cycleFor('2026-02-27', 31), { start: '2026-01-31', end: '2026-02-27' });
  assert.deepEqual(cycleFor('2026-02-28', 31), { start: '2026-02-28', end: '2026-03-30' });
  assert.deepEqual(cycleFor('2026-03-30', 31), { start: '2026-02-28', end: '2026-03-30' });
  assert.deepEqual(cycleFor('2026-03-31', 31), { start: '2026-03-31', end: '2026-04-29' });
  assert.deepEqual(cycleFor('2028-02-29', 31), { start: '2028-02-29', end: '2028-03-30' });
  assert.deepEqual(cycleFor('2026-12-31', 31), { start: '2026-12-31', end: '2027-01-30' });
  // Every day of two years belongs to exactly one cycle, and cycles never overlap.
  let d = '2026-01-01';
  let last = cycleFor(d, 30);
  for (let i = 0; i < 730; i++) {
    const c = cycleFor(d, 30);
    assert.ok(c.start <= d && d <= c.end, d);
    if (c.start !== last.start) assert.equal(c.start > last.end, true, d);
    last = c;
    d = shiftDay(d);
  }
});

test('cycle: stepping months with a late start day never skips or repeats one', () => {
  const p = { kind: 'month', anchor: '2026-01-31', startDay: 31 } as const;
  const labels = [0, 1, 2, 3, 4].map((n) => periodLabel(shiftPeriod(p, n)));
  assert.deepEqual(labels, ['Jan 31 - Feb 27', 'Feb 28 - Mar 30', 'Mar 31 - Apr 29', 'Apr 30 - May 30', 'May 31 - Jun 29']);
  assert.equal(periodLabel(shiftPeriod(shiftPeriod(p, 5), -5)), 'Jan 31 - Feb 27');
  assert.equal(shiftCycle('2026-03-15', 31, 1), '2026-03-31');
  assert.equal(shiftCycle('2026-03-15', 31, -1), '2026-01-31');
  assert.deepEqual(contributionDates('2026-02-10', '2026-05-31', 'start', 31), ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  assert.deepEqual(contributionDates('2026-02-10', '2026-04-30', 'end', 31), ['2026-02-27', '2026-03-30', '2026-04-29']);
  assert.equal(describeStartDay(31), 'the last day');
  assert.equal(describeStartDay(1), 'the 1st');
  assert.equal(describeStartDay(22), 'the 22nd');
  assert.equal(describeStartDay(13), 'the 13th');
});

test('calendar: month grid is Monday-first and padded to whole weeks', () => {
  const nov = monthGrid(2026, 11); // Nov 1 2026 is a Sunday
  assert.equal(nov.length, 6);
  assert.ok(nov.every((w) => w.length === 7));
  assert.equal(nov[0][6].date, '2026-11-01');
  assert.equal(nov[0][0].date, '2026-10-26');
  assert.equal(nov[0][0].inMonth, false);
  assert.equal(nov[5][0].date, '2026-11-30');
  assert.equal(nov[5][1].inMonth, false);
  const feb = monthGrid(2027, 2); // Feb 1 2027 is a Monday, 28 days: exactly four weeks
  assert.equal(feb.length, 4);
  assert.equal(feb[0][0].date, '2027-02-01');
  assert.equal(feb[3][6].date, '2027-02-28');
  assert.equal(monthGrid(2028, 2).flat().filter((c) => c.inMonth).length, 29);
});
