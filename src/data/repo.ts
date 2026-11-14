import { DEFAULT_SETTINGS } from '../domain/types';
import type { Budget, Frequency, Goal, RecurringRule, Settings, Transaction, TxType } from '../domain/types';
import type { Category } from '../domain/categories';
import { getDb, seedCategories } from './db';

/** The only module that talks SQL. Swap this file to change the storage engine. */

interface TxRow { id: string; type: string; amount: number; category_id: string; date: string; note: string; created_at: number }
interface GoalRow { id: string; name: string; icon: string; target_amount: number; saved_amount: number; target_date: string | null; created_at: number }
interface BudgetRow { category_id: string; amount: number }
interface RecurringRow {
  id: string; type: string; amount: number; category_id: string; note: string; frequency: string; interval: number;
  anchor_date: string; end_date: string | null; last_run_date: string | null; active: number; ask_amount: number; month_end: number;
}

export interface Snapshot {
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  recurring: RecurringRule[];
  categories: Category[];
  settings: Settings;
}
interface CategoryRow { id: string; name: string; sprite: string; color: string; type: string; sort: number; archived: number }

async function readCategories(db: Awaited<ReturnType<typeof getDb>>): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, sprite: r.sprite, color: r.color, type: r.type as TxType, sort: r.sort, archived: r.archived !== 0 }));
}

export async function loadAll(): Promise<Snapshot> {
  const db = await getDb();
  const txRows = await db.getAllAsync<TxRow>('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
  const goalRows = await db.getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY created_at ASC');
  const budgetRows = await db.getAllAsync<BudgetRow>('SELECT * FROM budgets');
  const recurringRows = await db.getAllAsync<RecurringRow>('SELECT * FROM recurring ORDER BY anchor_date ASC');
  const kv = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', ['settings']);

  let saved: Partial<Settings> = {};
  try {
    if (kv) saved = JSON.parse(kv.value);
  } catch {
    saved = {};
  }

  return {
    transactions: txRows.map((r) => ({ id: r.id, type: r.type as TxType, amount: r.amount, categoryId: r.category_id, date: r.date, note: r.note, createdAt: r.created_at })),
    goals: goalRows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, targetAmount: r.target_amount, savedAmount: r.saved_amount, targetDate: r.target_date, createdAt: r.created_at })),
    budgets: budgetRows.map((r) => ({ categoryId: r.category_id, amount: r.amount })),
    recurring: recurringRows.map((r) => ({
      id: r.id, type: r.type as TxType, amount: r.amount, categoryId: r.category_id, note: r.note, frequency: r.frequency as Frequency,
      interval: r.interval, anchorDate: r.anchor_date, endDate: r.end_date, lastRunDate: r.last_run_date, active: r.active !== 0, askAmount: r.ask_amount !== 0, monthEnd: r.month_end !== 0,
    })),
    categories: await readCategories(db),
    settings: { ...DEFAULT_SETTINGS, ...saved },
  };
}

export async function putTransaction(t: Transaction) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO transactions (id, type, amount, category_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [t.id, t.type, t.amount, t.categoryId, t.date, t.note, t.createdAt],
  );
}

export async function removeTransaction(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function putGoal(g: Goal) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO goals (id, name, icon, target_amount, saved_amount, target_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [g.id, g.name, g.icon, g.targetAmount, g.savedAmount, g.targetDate, g.createdAt],
  );
}

export async function removeGoal(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}

export async function putBudget(b: Budget) {
  const db = await getDb();
  if (b.amount > 0) await db.runAsync('INSERT OR REPLACE INTO budgets (category_id, amount) VALUES (?, ?)', [b.categoryId, b.amount]);
  else await db.runAsync('DELETE FROM budgets WHERE category_id = ?', [b.categoryId]);
}

const RECURRING_SQL =
  'INSERT OR REPLACE INTO recurring (id, type, amount, category_id, note, frequency, "interval", anchor_date, end_date, last_run_date, active, ask_amount, month_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
const recurringArgs = (r: RecurringRule) => [r.id, r.type, r.amount, r.categoryId, r.note, r.frequency, r.interval, r.anchorDate, r.endDate, r.lastRunDate, r.active ? 1 : 0, r.askAmount ? 1 : 0, r.monthEnd ? 1 : 0];

export async function putRecurring(rule: RecurringRule) {
  const db = await getDb();
  await db.runAsync(RECURRING_SQL, recurringArgs(rule));
}

export async function removeRecurring(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring WHERE id = ?', [id]);
}

/**
 * Saves the occurrences a recurring run produced together with the rules'
 * new last-run dates. One transaction, and INSERT OR IGNORE on the derived
 * ids, so a crash half way can never leave duplicates behind.
 */
export async function applyRecurringRun(transactions: Transaction[], rules: RecurringRule[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of transactions) {
      await db.runAsync(
        'INSERT OR IGNORE INTO transactions (id, type, amount, category_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.type, t.amount, t.categoryId, t.date, t.note, t.createdAt],
      );
    }
    for (const rule of rules) await db.runAsync(RECURRING_SQL, recurringArgs(rule));
  });
}

/** Saves one or more categories in a single transaction (a reorder touches several). */
export async function putCategories(categories: Category[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const c of categories) {
      await db.runAsync('INSERT OR REPLACE INTO categories (id, name, sprite, color, type, sort, archived) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        c.id, c.name, c.sprite, c.color, c.type, c.sort, c.archived ? 1 : 0,
      ]);
    }
  });
}

/**
 * Deletes a category for good. Its transactions and repeating rules move to
 * `replacementId` and its budget goes, all in one transaction.
 */
export async function removeCategory(id: string, replacementId: string) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [replacementId, id]);
    await db.runAsync('UPDATE recurring SET category_id = ? WHERE category_id = ?', [replacementId, id]);
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?', [id]);
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  });
}

/** Back to the built-in list. Returns what is now stored. */
export async function resetCategories(): Promise<Category[]> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories');
  await seedCategories(db);
  return readCategories(db);
}

export async function clearRecurring() {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring');
}

export async function putSettings(s: Settings) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', ['settings', JSON.stringify(s)]);
}

/** Replaces transactions, goals and budgets in one go (demo data, future restore). */
export async function replaceData(data: Pick<Snapshot, 'transactions' | 'goals' | 'budgets'>) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM transactions; DELETE FROM goals; DELETE FROM budgets;');
    for (const t of data.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, type, amount, category_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.type, t.amount, t.categoryId, t.date, t.note, t.createdAt],
      );
    }
    for (const g of data.goals) {
      await db.runAsync(
        'INSERT INTO goals (id, name, icon, target_amount, saved_amount, target_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [g.id, g.name, g.icon, g.targetAmount, g.savedAmount, g.targetDate, g.createdAt],
      );
    }
    for (const b of data.budgets) {
      await db.runAsync('INSERT INTO budgets (category_id, amount) VALUES (?, ?)', [b.categoryId, b.amount]);
    }
  });
}
