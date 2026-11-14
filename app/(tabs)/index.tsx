import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { filterByPeriod, summarize } from '../../src/domain/analytics';
import { formatCycle, formatLong, relativeLabel, today } from '../../src/domain/dates';
import { dailyQuests, levelFor, streak, totalXp } from '../../src/domain/game';
import { parseAmount, toInput } from '../../src/domain/money';
import { pendingOccurrences } from '../../src/domain/recurring';
import type { PendingOccurrence } from '../../src/domain/recurring';
import { useStore } from '../../src/store/useStore';
import { Coin3D } from '../../src/ui/Coin3D';
import { useCategories, useMoney, usePlan } from '../../src/ui/hooks';
import { AmountPrompt, Badge, Button, Panel, ProgressBar, Row, Screen, Txt } from '../../src/ui/kit';
import { PixelScene } from '../../src/ui/PixelScene';
import { Sprite } from '../../src/ui/Sprite';
import { useTheme } from '../../src/ui/theme';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const plan = usePlan();
  const getCategory = useCategories().get;
  const transactions = useStore((s) => s.transactions);
  const goals = useStore((s) => s.goals);
  const budgets = useStore((s) => s.budgets);
  const savingsTarget = useStore((s) => s.settings.monthlySavingsTarget);
  const startDay = useStore((s) => s.settings.monthStartDay);
  const now = today();
  const recurring = useStore((s) => s.recurring);
  const currency = useStore((s) => s.settings.currency);
  const resolveOccurrence = useStore((s) => s.resolveOccurrence);
  // Variable-amount repeats that have come due and need the real figure.
  const waiting = useMemo(() => pendingOccurrences(recurring, now), [recurring, now]);
  const [answering, setAnswering] = useState<PendingOccurrence | null>(null);

  const month = useMemo(() => summarize(filterByPeriod(transactions, { kind: 'month', anchor: now, startDay })), [transactions, now, startDay]);
  const balance = useMemo(() => summarize(transactions).net, [transactions]);
  const level = useMemo(() => levelFor(totalXp(transactions, goals, budgets, now)), [transactions, goals, budgets, now]);
  const days = useMemo(() => streak(transactions, now), [transactions, now]);
  const quests = useMemo(() => dailyQuests(transactions, goals, budgets, plan, now), [transactions, goals, budgets, plan, now]);
  const savedShare = month.income > 0 ? month.net / month.income : 0;
  const overToday = plan.remainingToday < 0;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt v="title">Home</Txt>
          <Txt v="small" dim>{formatCycle(now, startDay)}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Sprite name="flame" size={20} />
          <Txt v="h">{days}</Txt>
        </View>
        <Badge label={`LV ${level.level}`} color={t.accent} />
      </View>

      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Coin3D size={70} background={t.panel} />
        <View style={{ flex: 1 }}>
          <Txt v="small" dim>Total balance</Txt>
          <Txt v="num" numberOfLines={1}>{fmt(balance)}</Txt>
        </View>
      </Panel>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Panel style={{ flex: 1, borderColor: t.good }}>
          <Txt v="small" dim>Income</Txt>
          <Txt v="h" color={t.good} numberOfLines={1}>{fmt(month.income)}</Txt>
        </Panel>
        <Panel style={{ flex: 1, borderColor: t.bad }}>
          <Txt v="small" dim>Expenses</Txt>
          <Txt v="h" color={t.bad} numberOfLines={1}>{fmt(month.expense)}</Txt>
        </Panel>
      </View>

      <Panel alt style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt v="h">Safe to spend today</Txt>
          {plan.configured ? <Badge label={overToday ? 'Over' : 'On track'} color={overToday ? t.bad : t.good} /> : null}
        </View>
        {plan.configured ? (
          <>
            <Txt v="num" color={overToday ? t.bad : t.text}>{fmt(Math.max(0, plan.remainingToday))}</Txt>
            <ProgressBar value={plan.dailyAllowance > 0 ? plan.spentToday / plan.dailyAllowance : 1} color={overToday ? t.bad : t.good} />
            <Txt v="small" dim>
              {overToday
                ? `${fmt(-plan.remainingToday)} over today's ${fmt(plan.dailyAllowance)}. Tomorrow's allowance adjusts.`
                : `Spent ${fmt(plan.spentToday)} of ${fmt(plan.dailyAllowance)}. ${plan.daysLeft} day${plan.daysLeft === 1 ? '' : 's'} left to save ${fmt(savingsTarget)}.`}
            </Txt>
          </>
        ) : (
          <>
            <Txt dim>Tell FinQuest what you earn and what you want to save each month. It works out a daily spending limit for you.</Txt>
            <Button label="Set up savings plan" onPress={() => router.push('/plan')} />
          </>
        )}
      </Panel>

      {waiting.map((w) => {
        const cat = getCategory(w.rule.categoryId);
        return (
          <Panel key={w.rule.id} style={{ gap: 8, borderColor: t.info }}>
            <Row
              sprite={cat.sprite}
              title={w.rule.note || cat.name}
              subtitle={`Due ${relativeLabel(w.date, now) === 'Today' ? 'today' : formatLong(w.date)}${w.more > 0 ? ` · ${w.more} more waiting` : ''}`}
              right={<Badge label="How much?" color={t.info} />}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Enter amount" style={{ flex: 2 }} onPress={() => setAnswering(w)} />
              <Button label="Skip" kind="ghost" style={{ flex: 1 }} onPress={() => resolveOccurrence(w.rule.id, w.date, null)} />
            </View>
          </Panel>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Expense" sprite="plus" kind="danger" style={{ flex: 1 }} onPress={() => router.push('/transaction?type=expense')} />
        <Button label="Income" sprite="plus" style={{ flex: 1 }} onPress={() => router.push('/transaction?type=income')} />
      </View>

      <PixelScene height={110}>
        <Sprite name="flame" size={30} />
      </PixelScene>

      <Panel style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt v="h">{level.title}</Txt>
          <Txt v="small" dim>{level.xpIntoLevel} / {level.xpForNext} XP</Txt>
        </View>
        <ProgressBar value={level.xpIntoLevel / level.xpForNext} color={t.accent} />
        {quests.map((q) => (
          <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 14, height: 14, borderWidth: 2, borderColor: q.done ? t.good : t.borderLight, backgroundColor: q.done ? t.good : 'transparent' }} />
            <Txt v="small" color={q.done ? t.dim : t.text} style={q.done ? { textDecorationLine: 'line-through' } : undefined}>{q.title}</Txt>
          </View>
        ))}
      </Panel>

      {month.income > 0 ? (
        <Panel style={{ gap: 8 }}>
          <Txt v="h">This month</Txt>
          <Txt dim>
            {savedShare >= 0 ? `You kept ${Math.round(savedShare * 100)}% of your income so far.` : `You spent ${fmt(-month.net)} more than you earned.`}
          </Txt>
          <ProgressBar value={savedShare} />
        </Panel>
      ) : null}

      <Panel>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="h">Recent</Txt>
          <Txt v="small" color={t.accent} style={{ padding: 6 }}>{transactions.length} logged</Txt>
        </View>
        {transactions.length === 0 ? <Txt dim>No transactions yet. Add your first one above.</Txt> : null}
        {transactions.slice(0, 5).map((tx) => {
          const cat = getCategory(tx.categoryId);
          return (
            <Row
              key={tx.id}
              sprite={cat.sprite}
              title={tx.note || cat.name}
              subtitle={`${cat.name} · ${relativeLabel(tx.date, now)}`}
              right={<Txt v="h" color={tx.type === 'income' ? t.good : t.bad}>{fmt(tx.type === 'income' ? tx.amount : -tx.amount, { sign: true })}</Txt>}
              onPress={() => router.push({ pathname: '/transaction', params: { id: tx.id } })}
            />
          );
        })}
      </Panel>

      <AmountPrompt
        visible={answering !== null}
        title={answering ? answering.rule.note || getCategory(answering.rule.categoryId).name : ''}
        hint={answering ? `How much was it on ${formatLong(answering.date)}?` : undefined}
        initial={answering ? toInput(answering.rule.amount, currency) : ''}
        confirmLabel="Log it"
        onCancel={() => setAnswering(null)}
        onSubmit={(text) => {
          const amount = parseAmount(text, currency);
          if (answering && amount > 0) resolveOccurrence(answering.rule.id, answering.date, amount);
          setAnswering(null);
        }}
      />
    </Screen>
  );
}
