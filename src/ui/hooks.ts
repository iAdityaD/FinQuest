import { useCallback, useMemo } from 'react';
import { today } from '../domain/dates';
import { formatMoney } from '../domain/money';
import { computePlan } from '../domain/plan';
import { useStore } from '../store/useStore';

/** Money formatter bound to the user's currency. */
export function useMoney() {
  const currency = useStore((s) => s.settings.currency);
  return useCallback((minor: number, opts?: { sign?: boolean }) => formatMoney(minor, currency, opts), [currency]);
}

/** Today's safe-to-spend numbers from the saved savings plan. */
export function usePlan() {
  const transactions = useStore((s) => s.transactions);
  const monthlyIncome = useStore((s) => s.settings.monthlyIncome);
  const monthlySavingsTarget = useStore((s) => s.settings.monthlySavingsTarget);
  const saveRule = useStore((s) => s.settings.saveRule);
  const now = today();
  return useMemo(
    () => computePlan({ transactions, today: now, monthlyIncome, monthlySavingsTarget, saveRule }),
    [transactions, now, monthlyIncome, monthlySavingsTarget, saveRule],
  );
}
