import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { byCategory, filterByPeriod, periodLabel, series, shiftPeriod, summarize } from '../../src/domain/analytics';
import type { PeriodKind } from '../../src/domain/analytics';
import { today } from '../../src/domain/dates';
import { buildInsights } from '../../src/domain/insights';
import { useStore } from '../../src/store/useStore';
import { Bars, Legend, PixelDonut } from '../../src/ui/charts';
import { useCategories, useMoney, usePeriod, usePlan } from '../../src/ui/hooks';
import { Panel, Screen, Segmented, Stepper, Txt } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

const TREND_TITLE: Record<PeriodKind, string> = { day: 'Last 7 days', month: 'Day by day', year: 'Month by month' };

export default function Analytics() {
  const t = useTheme();
  const fmt = useMoney();
  const plan = usePlan();
  const getCategory = useCategories().get;
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const goals = useStore((s) => s.goals);
  const savingsTarget = useStore((s) => s.settings.monthlySavingsTarget);
  const saveRule = useStore((s) => s.settings.saveRule);
  const monthStartDay = useStore((s) => s.settings.monthStartDay);
  const now = today();
  const [period, setPeriod] = usePeriod();

  const data = useMemo(() => {
    const current = filterByPeriod(transactions, period);
    return {
      summary: summarize(current),
      categories: byCategory(current),
      // The day view charts the surrounding week, so it needs the full list.
      trend: series(period.kind === 'day' ? transactions : current, period),
      insights: buildInsights({ transactions, budgets, goals, period, today: now, plan, savingsTarget, saveRule, monthStartDay, getCategory, fmt }),
    };
  }, [transactions, budgets, goals, period, now, plan, savingsTarget, saveRule, monthStartDay, getCategory, fmt]);

  const toneColor = { good: t.good, warn: t.bad, info: t.info };
  const top = data.categories.slice(0, 6);

  return (
    <Screen title="Analytics">
      <Segmented
        value={period.kind}
        onChange={(kind) => setPeriod({ kind, anchor: now })}
        options={[{ value: 'day', label: 'Day' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]}
      />
      <Stepper label={periodLabel(period)} onPrev={() => setPeriod(shiftPeriod(period, -1))} onNext={() => setPeriod(shiftPeriod(period, 1))} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {([['Income', data.summary.income, t.good], ['Spent', data.summary.expense, t.bad], ['Net', data.summary.net, data.summary.net < 0 ? t.bad : t.text]] as const).map(([label, value, color]) => (
          <Panel key={label} style={{ flex: 1, padding: 8 }}>
            <Txt v="small" dim>{label}</Txt>
            <Txt v="h" color={color} numberOfLines={1} style={{ fontSize: 14 }}>{fmt(value)}</Txt>
          </Panel>
        ))}
      </View>

      <Panel style={{ gap: 10 }}>
        <Txt v="h">Where it went</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <PixelDonut size={140} slices={data.categories.map((c) => ({ share: c.share, color: getCategory(c.categoryId).color }))}>
            <Txt v="small" dim>Spent</Txt>
            <Txt v="h" style={{ fontSize: 13 }}>{fmt(data.summary.expense)}</Txt>
          </PixelDonut>
          {top.length ? (
            <Legend items={top.map((c) => ({ label: getCategory(c.categoryId).name, color: getCategory(c.categoryId).color, value: `${Math.round(c.share * 100)}%` }))} />
          ) : (
            <Txt dim style={{ flex: 1 }}>No expenses in this period.</Txt>
          )}
        </View>
      </Panel>

      <Panel style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="h">{TREND_TITLE[period.kind]}</Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Txt v="small" color={t.good}>Income</Txt>
            <Txt v="small" color={t.bad}>Expenses</Txt>
          </View>
        </View>
        <Bars points={data.trend} />
      </Panel>

      <Txt v="h">Your guide</Txt>
      {data.insights.map((insight) => (
        <Panel key={insight.id} style={{ borderLeftWidth: 8, borderLeftColor: toneColor[insight.tone], gap: 4 }}>
          <Txt v="h">{insight.title}</Txt>
          <Txt v="small" dim>{insight.body}</Txt>
        </Panel>
      ))}
    </Screen>
  );
}
