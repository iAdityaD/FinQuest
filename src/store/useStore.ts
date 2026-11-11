import { create } from 'zustand';
import * as repo from '../data/repo';
import { today } from '../domain/dates';
import { demoData } from '../domain/demo';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Budget, Goal, Settings, Transaction } from '../domain/types';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'> & { id?: string };
export type GoalInput = Omit<Goal, 'id' | 'createdAt'> & { id?: string };

interface State {
  ready: boolean;
  transactions: Transaction[]; // newest first
  goals: Goal[];
  budgets: Budget[];
  settings: Settings;
  hydrate: () => Promise<void>;
  saveTransaction: (input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  saveGoal: (input: GoalInput) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;
  setBudget: (categoryId: string, amount: number) => void;
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
  settings: DEFAULT_SETTINGS,

  hydrate: async () => {
    try {
      const snapshot = await repo.loadAll();
      set({ ...snapshot, ready: true });
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
    set({ transactions: [], goals: [], budgets: [], settings });
    persist(repo.replaceData({ transactions: [], goals: [], budgets: [] }).then(() => repo.putSettings(settings)));
  },
}));
