import { getCategory } from './categories';
import type { CategoryLookup } from './categories';
import { CURRENCIES } from './money';
import type { CurrencyCode, Transaction } from './types';

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCSV(txs: Transaction[], currency: CurrencyCode, lookup: CategoryLookup = getCategory) {
  const factor = 10 ** CURRENCIES[currency].decimals;
  const rows = txs.map((t) => [t.date, t.type, lookup(t.categoryId).name, String(t.amount / factor), currency, t.note].map(cell).join(','));
  return ['date,type,category,amount,currency,note', ...rows].join('\n');
}
