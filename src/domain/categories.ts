import type { TxType } from './types';

export interface Category {
  id: string;
  name: string;
  sprite: string;
  color: string;
  type: TxType;
  /** Position in the picker, lowest first. */
  sort: number;
  /** Archived categories stay on old transactions but leave the picker. */
  archived: boolean;
}

const seed = (rows: [id: string, name: string, sprite: string, color: string, type: TxType][]): Category[] =>
  rows.map(([id, name, sprite, color, type], sort) => ({ id, name, sprite, color, type, sort, archived: false }));

/**
 * The categories every install starts with. They are copied into the
 * database on first run; after that the user's own list is the truth.
 * Never change an id here: saved transactions point at them.
 */
export const CATEGORIES: Category[] = seed([
  ['food', 'Food & Dining', 'food', '#ff9f43', 'expense'],
  ['travel', 'Travel', 'travel', '#4aa8ff', 'expense'],
  ['shopping', 'Shopping', 'shopping', '#ff7ac6', 'expense'],
  ['bills', 'Bills', 'bills', '#9aa0b5', 'expense'],
  ['home', 'Rent & Home', 'house', '#c98b4a', 'expense'],
  ['health', 'Health', 'health', '#ff5a6e', 'expense'],
  ['education', 'Education', 'education', '#5ce1e6', 'expense'],
  ['fun', 'Entertainment', 'fun', '#a66bff', 'expense'],
  ['other', 'Other', 'other', '#6f6a8a', 'expense'],
  ['salary', 'Salary', 'salary', '#4cd964', 'income'],
  ['gift', 'Gift', 'gift', '#ffd54a', 'income'],
  ['other-income', 'Other income', 'coin', '#7bd88f', 'income'],
]);

/** Each type keeps one catch-all that cannot be archived, so the picker is never empty. */
const CATCH_ALL: Record<TxType, string> = { expense: 'other', income: 'other-income' };
const FALLBACK: Category = { id: 'other', name: 'Other', sprite: 'other', color: '#6f6a8a', type: 'expense', sort: 9999, archived: false };

export type CategoryLookup = (id: string) => Category;

/** Lookup by id over a category list. Unknown ids (deleted, imported) read as "Other". */
export function makeLookup(list: Category[]): CategoryLookup {
  const byId = new Map(list.map((c) => [c.id, c]));
  const other = byId.get('other') ?? FALLBACK;
  return (id) => byId.get(id) ?? other;
}

/** Lookup over the built-in list, for code that runs without the user's categories. */
export const getCategory: CategoryLookup = makeLookup(CATEGORIES);

const bySort = (a: Category, b: Category) => a.sort - b.sort || a.name.localeCompare(b.name);

/** Categories offered when adding a transaction. `keepId` keeps an archived one visible while editing an old entry. */
export function categoriesFor(type: TxType, list: Category[] = CATEGORIES, keepId?: string): Category[] {
  return list.filter((c) => c.type === type && (!c.archived || c.id === keepId)).sort(bySort);
}

export const archivedCategories = (list: Category[]) => list.filter((c) => c.archived).sort(bySort);

export const canArchive = (category: Category) => category.id !== CATCH_ALL[category.type];

export const MAX_CATEGORY_NAME = 24;

/** Returns why a name cannot be used, or null when it is fine. */
export function nameProblem(list: Category[], name: string, type: TxType, exceptId?: string): string | null {
  const clean = name.trim();
  if (!clean) return 'Give the category a name.';
  if (clean.length > MAX_CATEGORY_NAME) return `Keep the name under ${MAX_CATEGORY_NAME + 1} letters.`;
  const taken = list.some((c) => c.id !== exceptId && c.type === type && !c.archived && c.name.trim().toLowerCase() === clean.toLowerCase());
  return taken ? 'You already have a category with that name.' : null;
}

/** Sort value that puts a new category at the end of its type. */
export const nextSort = (list: Category[], type: TxType) => list.reduce((max, c) => (c.type === type ? Math.max(max, c.sort) : max), -1) + 1;

/**
 * Moves a category one place up (-1) or down (+1) among the visible
 * categories of its type. Returns only the categories whose sort changed.
 */
export function moveCategory(list: Category[], id: string, direction: -1 | 1): Category[] {
  const moving = list.find((c) => c.id === id);
  if (!moving) return [];
  const row = categoriesFor(moving.type, list);
  const from = row.findIndex((c) => c.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= row.length) return [];
  const order = [...row];
  [order[from], order[to]] = [order[to], order[from]];
  // Renumber the whole row: seeded and user-made sorts may collide.
  return order.map((c, sort) => ({ ...c, sort })).filter((c) => list.find((old) => old.id === c.id)?.sort !== c.sort);
}

/** Sprites and colours offered when making a category. */
export const CATEGORY_SPRITES = ['food', 'travel', 'shopping', 'bills', 'house', 'health', 'education', 'fun', 'gift', 'salary', 'coin', 'device', 'chest', 'shield', 'star', 'target', 'flame', 'other'];
export const CATEGORY_COLORS = ['#ff9f43', '#ffd54a', '#4cd964', '#7bd88f', '#5ce1e6', '#4aa8ff', '#a66bff', '#ff7ac6', '#ff5a6e', '#c98b4a', '#9aa0b5', '#6f6a8a'];

export const GOAL_ICONS = ['target', 'device', 'shield', 'house', 'gift', 'star', 'chest', 'education'];
