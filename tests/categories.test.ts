import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORIES, CATEGORY_SPRITES, archivedCategories, canArchive, categoriesFor, makeLookup, moveCategory, nameProblem, nextSort } from '../src/domain/categories';
import type { Category } from '../src/domain/categories';
import { toCSV } from '../src/domain/csv';
import { SPRITES } from '../src/ui/sprites';

const custom: Category = { id: 'c1', name: 'Pets', sprite: 'star', color: '#ffd54a', type: 'expense', sort: nextSort(CATEGORIES, 'expense'), archived: false };
const apply = (list: Category[], changed: Category[]) => list.map((c) => changed.find((x) => x.id === c.id) ?? c);

test('categories: lookup falls back to Other for unknown ids', () => {
  const get = makeLookup([...CATEGORIES, custom]);
  assert.equal(get('c1').name, 'Pets');
  assert.equal(get('food').name, 'Food & Dining');
  assert.equal(get('deleted-long-ago').id, 'other');
  // Even a list without "other" still answers.
  assert.equal(makeLookup([])('anything').name, 'Other');
});

test('categories: archived ones leave the picker but stay readable', () => {
  const list = apply([...CATEGORIES, custom], [{ ...custom, archived: true }]);
  assert.equal(categoriesFor('expense', list).some((c) => c.id === 'c1'), false);
  assert.equal(categoriesFor('expense', list, 'c1').some((c) => c.id === 'c1'), true);
  assert.deepEqual(archivedCategories(list).map((c) => c.id), ['c1']);
  assert.equal(makeLookup(list)('c1').name, 'Pets');
  assert.equal(categoriesFor('income', list).length, 3);
});

test('categories: the catch-all of each type cannot be archived', () => {
  const get = makeLookup(CATEGORIES);
  assert.equal(canArchive(get('other')), false);
  assert.equal(canArchive(get('other-income')), false);
  assert.equal(canArchive(get('food')), true);
});

test('categories: reorder moves one place and stops at the ends', () => {
  const ids = (list: Category[]) => categoriesFor('expense', list).map((c) => c.id);
  let list = [...CATEGORIES, custom];
  assert.deepEqual(moveCategory(list, 'food', -1), []);
  assert.deepEqual(moveCategory(list, 'c1', 1), []);
  assert.deepEqual(moveCategory(list, 'nope', 1), []);

  list = apply(list, moveCategory(list, 'food', 1));
  assert.deepEqual(ids(list).slice(0, 3), ['travel', 'food', 'shopping']);
  list = apply(list, moveCategory(list, 'c1', -1));
  assert.deepEqual(ids(list).slice(-2), ['c1', 'other']);
  // Income order is untouched by expense moves.
  assert.deepEqual(categoriesFor('income', list).map((c) => c.id), ['salary', 'gift', 'other-income']);

  // Archived categories are skipped over, not swapped with.
  list = apply(list, [{ ...makeLookup(list)('food'), archived: true }]);
  list = apply(list, moveCategory(list, 'shopping', -1));
  assert.deepEqual(ids(list).slice(0, 2), ['shopping', 'travel']);
});

test('categories: names are checked', () => {
  assert.equal(nameProblem(CATEGORIES, '  ', 'expense'), 'Give the category a name.');
  assert.match(nameProblem(CATEGORIES, 'x'.repeat(25), 'expense') ?? '', /under 25/);
  assert.match(nameProblem(CATEGORIES, ' travel ', 'expense') ?? '', /already have/);
  assert.equal(nameProblem(CATEGORIES, 'Travel', 'income'), null);
  assert.equal(nameProblem(CATEGORIES, 'Travel', 'expense', 'travel'), null);
  assert.equal(nameProblem(CATEGORIES, 'Pets', 'expense'), null);
});

test('categories: picker sprites exist and CSV uses the given names', () => {
  for (const s of CATEGORY_SPRITES) assert.ok(SPRITES[s], `missing sprite ${s}`);
  const tx = { id: '1', type: 'expense' as const, amount: 12000, categoryId: 'c1', date: '2026-11-12', note: '', createdAt: 0 };
  assert.match(toCSV([tx], 'INR', makeLookup([...CATEGORIES, custom])), /2026-11-12,expense,Pets,120,INR,/);
  assert.match(toCSV([tx], 'INR'), /2026-11-12,expense,Other,120,INR,/);
});
