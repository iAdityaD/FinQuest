import type { TxType } from './types';

export interface Category {
  id: string;
  name: string;
  sprite: string;
  color: string;
  type: TxType;
}

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', sprite: 'food', color: '#ff9f43', type: 'expense' },
  { id: 'travel', name: 'Travel', sprite: 'travel', color: '#4aa8ff', type: 'expense' },
  { id: 'shopping', name: 'Shopping', sprite: 'shopping', color: '#ff7ac6', type: 'expense' },
  { id: 'bills', name: 'Bills', sprite: 'bills', color: '#9aa0b5', type: 'expense' },
  { id: 'home', name: 'Rent & Home', sprite: 'house', color: '#c98b4a', type: 'expense' },
  { id: 'health', name: 'Health', sprite: 'health', color: '#ff5a6e', type: 'expense' },
  { id: 'education', name: 'Education', sprite: 'education', color: '#5ce1e6', type: 'expense' },
  { id: 'fun', name: 'Entertainment', sprite: 'fun', color: '#a66bff', type: 'expense' },
  { id: 'other', name: 'Other', sprite: 'other', color: '#6f6a8a', type: 'expense' },
  { id: 'salary', name: 'Salary', sprite: 'salary', color: '#4cd964', type: 'income' },
  { id: 'gift', name: 'Gift', sprite: 'gift', color: '#ffd54a', type: 'income' },
  { id: 'other-income', name: 'Other income', sprite: 'coin', color: '#7bd88f', type: 'income' },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
const FALLBACK: Category = { id: 'other', name: 'Other', sprite: 'other', color: '#6f6a8a', type: 'expense' };

export const getCategory = (id: string): Category => byId.get(id) ?? FALLBACK;
export const categoriesFor = (type: TxType) => CATEGORIES.filter((c) => c.type === type);

export const GOAL_ICONS = ['target', 'device', 'shield', 'house', 'gift', 'star', 'chest', 'education'];
