import { useCallback, useMemo, useState } from 'react';
import type { Period, PeriodKind } from '../domain/analytics';
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
  const monthStartDay = useStore((s) => s.settings.monthStartDay);
  const now = today();
  return useMemo(
    () => computePlan({ transactions, today: now, monthlyIncome, monthlySavingsTarget, saveRule, monthStartDay }),
    [transactions, now, monthlyIncome, monthlySavingsTarget, saveRule, monthStartDay],
  );
}

/**
 * A period the user can step through. Month periods always follow the
 * month-start day from Settings, even if it changes while a screen is open.
 */
export function usePeriod(initial: PeriodKind = 'month') {
  const startDay = useStore((s) => s.settings.monthStartDay);
  const [raw, setPeriod] = useState<Period>(() => ({ kind: initial, anchor: today() }));
  const period = useMemo<Period>(() => ({ ...raw, startDay }), [raw, startDay]);
  return [period, setPeriod] as const;
}
