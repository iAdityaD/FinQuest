import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeRule, dueDates, materialize, nextDue } from '../src/domain/recurring';
import type { RecurringRule } from '../src/domain/types';

const rule = (patch: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'rent', type: 'expense', amount: 1500000, categoryId: 'home', note: 'Rent', frequency: 'monthly', interval: 1,
  anchorDate: '2026-01-31', endDate: null, lastRunDate: null, active: true, ...patch,
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
