import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeDay, describeRule, dueDates, isMonthEnd, materialize, nextDue, pendingOccurrences, resolveOccurrence } from '../src/domain/recurring';
import type { RecurringRule } from '../src/domain/types';

const rule = (patch: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'rent', type: 'expense', amount: 1500000, categoryId: 'home', note: 'Rent', frequency: 'monthly', interval: 1,
  anchorDate: '2026-01-31', endDate: null, lastRunDate: null, active: true, askAmount: false, monthEnd: false, ...patch,
});

test('recurring: monthly rules on the 31st clamp to the last day and recover', () => {
  assert.deepEqual(dueDates(rule(), '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(dueDates(rule({ anchorDate: '2024-01-30' }), '2024-02-01', '2024-03-31'), ['2024-02-29', '2024-03-30']);
});

test('recurring: daily, weekly, yearly and intervals', () => {
  assert.deepEqual(dueDates(rule({ frequency: 'daily', anchorDate: '2026-11-10' }), '2026-11-11', '2026-11-13'), ['2026-11-11', '2026-11-12', '2026-11-13']);
  assert.deepEqual(dueDates(rule({ frequency: 'weekly', interval: 2, anchorDate: '2026-11-02' }), '2026-11-01', '2026-11-30'), ['2026-11-02', '2026-11-16', '2026-11-30']);
  assert.deepEqual(dueDates(rule({ frequency: 'yearly', anchorDate: '2024-02-29' }), '2024-01-01', '2026-12-31'), ['2024-02-29', '2025-02-28', '2026-02-28']);
  assert.deepEqual(dueDates(rule({ interval: 3, anchorDate: '2026-01-15' }), '2026-01-01', '2026-12-31'), ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
  // A range far from the anchor still lands on the right dates.
  assert.deepEqual(dueDates(rule({ frequency: 'daily', interval: 10, anchorDate: '2020-01-01' }), '2026-11-01', '2026-11-20'), ['2026-11-05', '2026-11-15']);
});

test('recurring: catches up after months closed and never duplicates', () => {
  const first = materialize([rule({ anchorDate: '2026-08-05' })], '2026-11-12', 1000);
  assert.deepEqual(first.transactions.map((t) => t.date), ['2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05']);
  assert.equal(new Set(first.transactions.map((t) => t.id)).size, 4);
  assert.equal(first.transactions[0].amount, 1500000);
  assert.equal(first.updatedRules[0].lastRunDate, '2026-11-12');

  // Same day again: nothing new. Next month: exactly one more.
  const again = materialize(first.updatedRules, '2026-11-12');
  assert.equal(again.transactions.length, 0);
  assert.equal(again.updatedRules.length, 0);
  const later = materialize(first.updatedRules, '2026-12-05');
  assert.deepEqual(later.transactions.map((t) => t.date), ['2026-12-05']);
});

test('recurring: end date respected, paused rules skipped without back-fill', () => {
  const ended = materialize([rule({ anchorDate: '2026-08-05', endDate: '2026-09-30' })], '2026-11-12');
  assert.deepEqual(ended.transactions.map((t) => t.date), ['2026-08-05', '2026-09-05']);

  const paused = materialize([rule({ anchorDate: '2026-08-05', active: false })], '2026-11-12');
  assert.equal(paused.transactions.length, 0);
  const resumed = materialize([{ ...paused.updatedRules[0], active: true }], '2026-12-06');
  assert.deepEqual(resumed.transactions.map((t) => t.date), ['2026-12-05']);
});

test('recurring: next due date and labels', () => {
  assert.equal(nextDue(rule({ anchorDate: '2026-08-05' }), '2026-11-12'), '2026-12-05');
  assert.equal(nextDue(rule({ anchorDate: '2026-12-01' }), '2026-11-12'), '2026-12-01');
  assert.equal(nextDue(rule({ anchorDate: '2026-08-05', endDate: '2026-11-30' }), '2026-11-12'), null);
  assert.equal(describeRule({ frequency: 'monthly', interval: 1 }), 'Every month');
  assert.equal(describeRule({ frequency: 'weekly', interval: 2 }), 'Every 2 weeks');
});

test('recurring: a variable amount waits for the user instead of logging itself', () => {
  const salary = rule({ id: 'pay', type: 'income', categoryId: 'salary', note: 'Salary', amount: 5000000, anchorDate: '2026-08-31', askAmount: true });
  const sip = rule({ id: 'sip', anchorDate: '2026-08-05', amount: 500000 });

  // The fixed rule logs itself; the variable one is left alone.
  const run = materialize([salary, sip], '2026-11-12', 1);
  assert.deepEqual(run.transactions.map((t) => t.id.slice(0, 5)), ['r-sip', 'r-sip', 'r-sip', 'r-sip']);
  assert.deepEqual(run.updatedRules.map((r) => r.id), ['sip']);

  // Aug 31, Sep 30, Oct 31 are due (Nov 30 is not yet): the oldest is asked first.
  let waiting = pendingOccurrences([salary, sip], '2026-11-12');
  assert.equal(waiting.length, 1);
  assert.equal(waiting[0].date, '2026-08-31');
  assert.equal(waiting[0].more, 2);

  // Enter this month's real figure.
  const paid = resolveOccurrence(salary, '2026-08-31', 5230000, 7);
  assert.equal(paid.transaction?.amount, 5230000);
  assert.equal(paid.transaction?.type, 'income');
  assert.equal(paid.transaction?.date, '2026-08-31');
  waiting = pendingOccurrences([paid.rule], '2026-11-12');
  assert.equal(waiting[0].date, '2026-09-30');
  assert.equal(waiting[0].more, 1);

  // Skip one: no transaction, but it stops asking.
  const skipped = resolveOccurrence(paid.rule, '2026-09-30', null);
  assert.equal(skipped.transaction, null);
  const last = resolveOccurrence(skipped.rule, '2026-10-31', 4100000);
  assert.deepEqual(pendingOccurrences([last.rule], '2026-11-12'), []);
  assert.equal(pendingOccurrences([last.rule], '2026-11-30')[0].date, '2026-11-30');

  // Paused rules ask nothing, and do not pile up while paused.
  assert.deepEqual(pendingOccurrences([{ ...salary, active: false }], '2026-11-12'), []);
  const pausedRun = materialize([{ ...salary, active: false }], '2026-11-12');
  assert.deepEqual(pendingOccurrences([{ ...pausedRun.updatedRules[0], active: true }], '2026-11-20'), []);
});

test('recurring: last day of the month follows each month, including leap years', () => {
  // Set up on Nov 30. Without monthEnd it is the 30th; with it, the real last day.
  const on30th = rule({ anchorDate: '2026-11-30' });
  assert.deepEqual(dueDates(on30th, '2026-11-01', '2027-03-31'), ['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28', '2027-03-30']);
  const lastDay = rule({ anchorDate: '2026-11-30', monthEnd: true });
  assert.deepEqual(dueDates(lastDay, '2026-11-01', '2027-03-31'), ['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31']);
  assert.deepEqual(dueDates(rule({ anchorDate: '2027-02-28', monthEnd: true }), '2028-01-01', '2028-03-31'), ['2028-01-31', '2028-02-29', '2028-03-31']);
  assert.deepEqual(dueDates(rule({ anchorDate: '2027-02-28', monthEnd: true, frequency: 'yearly' }), '2027-01-01', '2029-12-31'), ['2027-02-28', '2028-02-29', '2029-02-28']);
  assert.equal(nextDue(lastDay, '2026-12-31'), '2027-01-31');
  // The flag means nothing to daily and weekly rules.
  assert.deepEqual(dueDates(rule({ anchorDate: '2026-11-30', monthEnd: true, frequency: 'weekly' }), '2026-11-30', '2026-12-14'), ['2026-11-30', '2026-12-07', '2026-12-14']);

  assert.equal(isMonthEnd('2026-11-30'), true);
  assert.equal(isMonthEnd('2026-12-30'), false);
  assert.equal(isMonthEnd('2028-02-29'), true);
  assert.equal(isMonthEnd('2027-02-28'), true);
  assert.equal(describeDay(lastDay), 'on the last day');
  assert.equal(describeDay(on30th), 'on the 30th');
  assert.equal(describeDay(rule({ anchorDate: '2026-11-03' })), 'on the 3rd');
  assert.equal(describeDay(rule({ frequency: 'weekly' })), '');
});
