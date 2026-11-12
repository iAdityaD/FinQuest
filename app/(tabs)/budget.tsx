import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { byCategory, filterByPeriod, periodLabel, shiftPeriod, summarize } from '../../src/domain/analytics';
import { categoriesFor } from '../../src/domain/categories';
import { parseAmount, toInput } from '../../src/domain/money';
import { OVERALL } from '../../src/domain/types';
import { useStore } from '../../src/store/useStore';
import { useMoney, usePeriod } from '../../src/ui/hooks';
import { AmountPrompt, Button, Panel, ProgressBar, Screen, Stepper, Txt } from '../../src/ui/kit';
import { Sprite } from '../../src/ui/Sprite';
import { useTheme } from '../../src/ui/theme';

const EXPENSE_CATEGORIES = categoriesFor('expense');

export default function BudgetScreen() {
  const t = useTheme();
  const fmt = useMoney();
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const currency = useStore((s) => s.settings.currency);
  const setBudget = useStore((s) => s.setBudget);
  const [period, setPeriod] = usePeriod();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const { spentTotal, spentBy } = useMemo(() => {
    const current = filterByPeriod(transactions, period);
    return { spentTotal: summarize(current).expense, spentBy: new Map(byCategory(current).map((c) => [c.categoryId, c.total])) };
  }, [transactions, period]);

  const limitOf = (id: string) => budgets.find((b) => b.categoryId === id)?.amount ?? 0;
  const barColor = (ratio: number) => (ratio > 1 ? t.bad : ratio >= 0.8 ? t.accent : t.good);
  const overall = limitOf(OVERALL);
  const overallRatio = overall ? spentTotal / overall : 0;

  return (
    <Screen title="Budget">
      <Stepper label={periodLabel(period)} onPrev={() => setPeriod(shiftPeriod(period, -1))} onNext={() => setPeriod(shiftPeriod(period, 1))} />

      <Panel alt style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Sprite name="chest" size={50} />
          <View style={{ flex: 1 }}>
            <Txt v="small" dim>Overall monthly budget</Txt>
            <Txt v="num">{overall ? fmt(overall) : 'Not set'}</Txt>
          </View>
        </View>
        {overall ? (
          <>
            <ProgressBar value={overallRatio} color={barColor(overallRatio)} />
            <Txt v="small" dim>
              Spent {fmt(spentTotal)} ({Math.round(overallRatio * 100)}%). {overall >= spentTotal ? `${fmt(overall - spentTotal)} left.` : `${fmt(spentTotal - overall)} over.`}
            </Txt>
          </>
        ) : (
          <Txt v="small" dim>Spent {fmt(spentTotal)} so far. Set a limit to track it.</Txt>
        )}
        <Button label={overall ? 'Change budget' : 'Set budget'} kind="ghost" onPress={() => setEditing({ id: OVERALL, name: 'Overall budget' })} />
      </Panel>

      <Txt v="h">By category</Txt>
      {EXPENSE_CATEGORIES.map((cat) => {
        const limit = limitOf(cat.id);
        const spent = spentBy.get(cat.id) ?? 0;
        const ratio = limit ? spent / limit : 0;
        return (
          <Panel key={cat.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Sprite name={cat.sprite} size={30} />
              <Txt v="h" style={{ flex: 1 }} numberOfLines={1}>{cat.name}</Txt>
              <Txt v="small" dim>{limit ? `${fmt(spent)} / ${fmt(limit)}` : fmt(spent)}</Txt>
            </View>
            {limit ? <ProgressBar value={ratio} color={barColor(ratio)} /> : null}
            <Button label={limit ? `Change limit (${Math.round(ratio * 100)}% used)` : 'Set limit'} kind="ghost" onPress={() => setEditing({ id: cat.id, name: cat.name })} />
          </Panel>
        );
      })}

      <AmountPrompt
        visible={editing !== null}
        title={editing?.name ?? ''}
        hint="Monthly limit. Enter 0 to remove it."
        initial={editing ? toInput(limitOf(editing.id), currency) : ''}
        onCancel={() => setEditing(null)}
        onSubmit={(text) => {
          if (editing) setBudget(editing.id, parseAmount(text, currency));
          setEditing(null);
        }}
      />
    </Screen>
  );
}
