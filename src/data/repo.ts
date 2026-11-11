import { DEFAULT_SETTINGS } from '../domain/types';
import type { Budget, Goal, Settings, Transaction, TxType } from '../domain/types';
import { getDb } from './db';

/** The only module that talks SQL. Swap this file to change the storage engine. */

interface TxRow { id: string; type: string; amount: number; category_id: string; date: string; note: string; created_at: number }
interface GoalRow { id: string; name: string; icon: string; target_amount: number; saved_amount: number; target_date: string | null; created_at: number }
interface BudgetRow { category_id: string; amount: number }

export interface Snapshot {
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  settings: Settings;
}

export async function loadAll(): Promise<Snapshot> {
  const db = await getDb();
  const txRows = await db.getAllAsync<TxRow>('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
  const goalRows = await db.getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY created_at ASC');
  const budgetRows = await db.getAllAsync<BudgetRow>('SELECT * FROM budgets');
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
