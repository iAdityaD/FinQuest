import { create } from 'zustand';
import * as repo from '../data/repo';
import { CATEGORIES, canDelete, moveCategory as moveCategoryIn, nextSort, replacementFor } from '../domain/categories';
import type { Category } from '../domain/categories';
import { today } from '../domain/dates';
import { demoData } from '../domain/demo';
import { materialize, resolveOccurrence as resolveIn } from '../domain/recurring';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Budget, Goal, RecurringRule, Settings, Transaction } from '../domain/types';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'> & { id?: string };
export type GoalInput = Omit<Goal, 'id' | 'createdAt'> & { id?: string };
export type RecurringInput = Omit<RecurringRule, 'id' | 'lastRunDate'> & { id?: string };
export type CategoryInput = Pick<Category, 'name' | 'sprite' | 'color' | 'type'> & { id?: string; archived?: boolean };

interface State {
  ready: boolean;
  transactions: Transaction[]; // newest first
  goals: Goal[];
  budgets: Budget[];
  recurring: RecurringRule[];
  /** Every category, archived ones included. Starts as the built-in list until the database answers. */
  categories: Category[];
  settings: Settings;
  hydrate: () => Promise<void>;
  saveTransaction: (input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  saveGoal: (input: GoalInput) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;
  setBudget: (categoryId: string, amount: number) => void;
  saveRecurring: (input: RecurringInput) => void;
  deleteRecurring: (id: string) => void;
  /** Logs every recurring occurrence that has come due. Safe to call as often as you like. */
  runRecurring: () => void;
  /** Answers a waiting variable-amount occurrence: an amount logs it, null skips it. */
  resolveOccurrence: (ruleId: string, date: string, amount: number | null) => void;
  /** Adds a category (no id) or changes an existing one, including archiving and restoring it. */
  saveCategory: (input: CategoryInput) => void;
  moveCategory: (id: string, direction: -1 | 1) => void;
  /** Removes a category for good; its transactions and repeating rules move to the catch-all of its type. */
  deleteCategory: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  loadDemo: () => void;
  eraseAll: () => void;
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const newestFirst = (a: Transaction, b: Transaction) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1);

/** State updates first so the UI never waits; the write to disk follows. */
const persist = (work: Promise<unknown>) => {
  work.catch((e) => console.warn('FinQuest: could not save to the device', e));
};

export const useStore = create<State>()((set, get) => ({
  ready: false,
  transactions: [],
  goals: [],
  budgets: [],
  recurring: [],
  categories: CATEGORIES,
  settings: DEFAULT_SETTINGS,

  hydrate: async () => {
    try {
      const snapshot = await repo.loadAll();
      set({ ...snapshot, ready: true });
      get().runRecurring();
    } catch (e) {
      console.warn('FinQuest: could not open the database', e);
      set({ ready: true });
    }
  },

  saveTransaction: (input) => {
    const existing = input.id ? get().transactions.find((t) => t.id === input.id) : undefined;
    const tx: Transaction = { ...input, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? Date.now() };
    set((s) => ({ transactions: [...s.transactions.filter((t) => t.id !== tx.id), tx].sort(newestFirst) }));
    persist(repo.putTransaction(tx));
  },

  deleteTransaction: (id) => {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
    persist(repo.removeTransaction(id));
  },

  saveGoal: (input) => {
    const existing = input.id ? get().goals.find((g) => g.id === input.id) : undefined;
    const goal: Goal = { ...input, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? Date.now() };
    set((s) => ({ goals: existing ? s.goals.map((g) => (g.id === goal.id ? goal : g)) : [...s.goals, goal] }));
    persist(repo.putGoal(goal));
  },

  deleteGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    persist(repo.removeGoal(id));
  },

  contributeToGoal: (id, amount) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const updated = { ...goal, savedAmount: Math.max(0, goal.savedAmount + amount) };
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
    persist(repo.putGoal(updated));
  },

  setBudget: (categoryId, amount) => {
    const others = get().budgets.filter((b) => b.categoryId !== categoryId);
    set({ budgets: amount > 0 ? [...others, { categoryId, amount }] : others });
    persist(repo.putBudget({ categoryId, amount }));
  },

  saveRecurring: (input) => {
    const existing = input.id ? get().recurring.find((r) => r.id === input.id) : undefined;
    // An edited rule keeps its place: only occurrences after today follow the new schedule.
    const rule: RecurringRule = { ...input, id: existing?.id ?? newId(), lastRunDate: existing?.lastRunDate ?? null };
    set((s) => ({ recurring: existing ? s.recurring.map((r) => (r.id === rule.id ? rule : r)) : [...s.recurring, rule] }));
    persist(repo.putRecurring(rule));
    get().runRecurring();
  },

  deleteRecurring: (id) => {
    set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) }));
    persist(repo.removeRecurring(id));
  },

  runRecurring: () => {
    const { transactions, updatedRules } = materialize(get().recurring, today());
    if (updatedRules.length === 0) return;
    const updated = new Map(updatedRules.map((r) => [r.id, r]));
    set((s) => {
      const known = new Set(s.transactions.map((t) => t.id));
      const fresh = transactions.filter((t) => !known.has(t.id));
      return {
        recurring: s.recurring.map((r) => updated.get(r.id) ?? r),
        transactions: fresh.length ? [...s.transactions, ...fresh].sort(newestFirst) : s.transactions,
      };
    });
    persist(repo.applyRecurringRun(transactions, updatedRules));
  },

  resolveOccurrence: (ruleId, date, amount) => {
    const current = get().recurring.find((r) => r.id === ruleId);
    if (!current) return;
    const { transaction, rule } = resolveIn(current, date, amount);
    set((s) => ({
      recurring: s.recurring.map((r) => (r.id === rule.id ? rule : r)),
      transactions: transaction && !s.transactions.some((t) => t.id === transaction.id) ? [...s.transactions, transaction].sort(newestFirst) : s.transactions,
    }));
    persist(repo.applyRecurringRun(transaction ? [transaction] : [], [rule]));
  },

  saveCategory: (input) => {
    const all = get().categories;
    const existing = input.id ? all.find((c) => c.id === input.id) : undefined;
    const category: Category = existing
      ? { ...existing, ...input, id: existing.id, type: existing.type }
      : { ...input, id: `c-${newId()}`, sort: nextSort(all, input.type), archived: false };
    set({ categories: existing ? all.map((c) => (c.id === category.id ? category : c)) : [...all, category] });
    persist(repo.putCategories([category]));
  },

  moveCategory: (id, direction) => {
    const changed = moveCategoryIn(get().categories, id, direction);
    if (changed.length === 0) return;
    const byId = new Map(changed.map((c) => [c.id, c]));
    set((s) => ({ categories: s.categories.map((c) => byId.get(c.id) ?? c) }));
    persist(repo.putCategories(changed));
  },

  deleteCategory: (id) => {
    const category = get().categories.find((c) => c.id === id);
    if (!category || !canDelete(category)) return;
    const to = replacementFor(category);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: to } : t)),
      recurring: s.recurring.map((r) => (r.categoryId === id ? { ...r, categoryId: to } : r)),
      budgets: s.budgets.filter((b) => b.categoryId !== id),
    }));
    persist(repo.removeCategory(id, to));
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    persist(repo.putSettings(settings));
  },

  loadDemo: () => {
    const data = demoData(today());
    const settings = { ...get().settings, monthlyIncome: 6000000, monthlySavingsTarget: 1500000 };
    set({ ...data, transactions: [...data.transactions].sort(newestFirst), settings });
    persist(repo.replaceData(data).then(() => repo.putSettings(settings)));
  },

  eraseAll: () => {
    const settings = { ...DEFAULT_SETTINGS, onboarded: true, currency: get().settings.currency, theme: get().settings.theme };
    set({ transactions: [], goals: [], budgets: [], recurring: [], categories: CATEGORIES, settings });
    persist(
      repo
        .replaceData({ transactions: [], goals: [], budgets: [] })
        .then(() => repo.clearRecurring())
        .then(() => repo.resetCategories())
        .then(() => repo.putSettings(settings)),
    );
  },
}));
