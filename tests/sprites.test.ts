import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORIES, GOAL_ICONS } from '../src/domain/categories';
import { PALETTE, SPRITES } from '../src/ui/sprites';

test('every sprite is a 10x10 grid of known colours', () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    assert.equal(rows.length, 10, `${name} has ${rows.length} rows`);
    rows.forEach((row, i) => {
      assert.equal(row.length, 10, `${name} row ${i} is ${row.length} wide`);
      for (const ch of row) assert.ok(ch === '.' || ch === 'a' || ch in PALETTE, `${name} uses unknown colour "${ch}"`);
    });
  }
});

test('categories and goal icons point at sprites that exist', () => {
  for (const c of CATEGORIES) assert.ok(SPRITES[c.sprite], `missing sprite for ${c.id}`);
  for (const icon of GOAL_ICONS) assert.ok(SPRITES[icon], `missing goal icon ${icon}`);
});
