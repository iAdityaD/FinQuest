import { addDays, addMonths, startOfMonth } from './dates';
import type { Budget, Goal, ISODate, Transaction } from './types';

/** Small deterministic generator so demo data is the same on every device. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SPEND: [string, string, number, number][] = [
  ['food', 'Lunch', 12000, 45000],
  ['food', 'Groceries', 30000, 120000],
  ['travel', 'Metro', 4000, 12000],
  ['shopping', 'Stationery', 20000, 150000],
  ['bills', 'Mobile recharge', 29900, 59900],
  ['fun', 'Movie', 25000, 60000],
  ['health', 'Pharmacy', 15000, 80000],
];

/** About three months of sample activity ending today (amounts in paise). */
export function demoData(today: ISODate): { transactions: Transaction[]; goals: Goal[]; budgets: Budget[] } {
  const rand = rng(1902);
  const transactions: Transaction[] = [];
  const start = startOfMonth(addMonths(today, -2));
  let n = 0;
  const push = (t: Omit<Transaction, 'id' | 'createdAt'>) => transactions.push({ ...t, id: `demo-${n}`, createdAt: n++ });

  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (d.endsWith('-01')) {
      push({ type: 'income', amount: 6000000, categoryId: 'salary', date: d, note: 'Salary' });
      push({ type: 'expense', amount: 1500000, categoryId: 'home', date: d, note: 'Rent' });
    }
    const count = Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const [categoryId, note, min, max] = SPEND[Math.floor(rand() * SPEND.length)];
      const amount = Math.round((min + rand() * (max - min)) / 100) * 100;
      push({ type: 'expense', amount, categoryId, date: d, note });
    }
  }

  const goals: Goal[] = [
    { id: 'demo-g1', name: 'New tablet', icon: 'device', targetAmount: 8000000, savedAmount: 3500000, targetDate: addMonths(today, 5), createdAt: 1 },
    { id: 'demo-g2', name: 'Emergency fund', icon: 'shield', targetAmount: 10000000, savedAmount: 5000000, targetDate: null, createdAt: 2 },
  ];
  const budgets: Budget[] = [
    { categoryId: 'overall', amount: 5000000 },
    { categoryId: 'food', amount: 1000000 },
    { categoryId: 'shopping', amount: 800000 },
  ];
  return { transactions, goals, budgets };
}
