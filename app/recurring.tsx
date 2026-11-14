import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { formatLong, today } from '../src/domain/dates';
import { describeDay, describeRule, nextDue } from '../src/domain/recurring';
import type { RecurringRule } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { confirm } from '../src/ui/dialog';
import { useCategories, useMoney } from '../src/ui/hooks';
import { Badge, Button, Panel, Row, Screen, Txt } from '../src/ui/kit';
import { useTheme } from '../src/ui/theme';

export default function Recurring() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const getCategory = useCategories().get;
  const rules = useStore((s) => s.recurring);
  const saveRecurring = useStore((s) => s.saveRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);
  const now = today();

  const status = (rule: RecurringRule) => {
    if (!rule.active) return 'Paused';
    const next = nextDue(rule, now);
    return next ? `Next: ${formatLong(next)}` : 'Finished';
  };

  return (
    <Screen title="Repeating" back>
      <Txt dim>Rent, salary and subscriptions that log themselves.</Txt>

      {rules.length === 0 ? (
        <Panel style={{ alignItems: 'center', gap: 10 }}>
          <Txt dim style={{ textAlign: 'center' }}>Nothing repeats yet. Add a transaction and choose how often it repeats.</Txt>
        </Panel>
      ) : null}

      {rules.map((rule) => {
        const cat = getCategory(rule.categoryId);
        return (
          <Panel key={rule.id} style={{ gap: 6 }}>
            <Row
              sprite={cat.sprite}
              title={rule.note || cat.name}
              subtitle={`${[describeRule(rule), describeDay(rule)].filter(Boolean).join(' ')} · ${status(rule)}`}
              right={
                <Txt v="h" color={rule.type === 'income' ? t.good : t.bad}>
                  {rule.askAmount ? (rule.amount > 0 ? `~${fmt(rule.amount)}` : 'Varies') : fmt(rule.type === 'income' ? rule.amount : -rule.amount, { sign: true })}
                </Txt>
              }
              onPress={() => router.push({ pathname: '/transaction', params: { rule: rule.id } })}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Badge label={!rule.active ? 'Paused' : rule.askAmount ? 'Asks you the amount' : 'Logs itself'} color={!rule.active ? t.dim : rule.askAmount ? t.info : t.good} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Edit" kind="ghost" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/transaction', params: { rule: rule.id } })} />
              <Button label={rule.active ? 'Pause' : 'Resume'} kind="ghost" style={{ flex: 1 }} onPress={() => saveRecurring({ ...rule, active: !rule.active })} />
              <Button
                label="Delete"
                kind="danger"
                style={{ flex: 1 }}
                onPress={() => confirm('Stop repeating?', 'Transactions it has already logged stay where they are.', 'Stop', () => deleteRecurring(rule.id))}
              />
            </View>
          </Panel>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Expense" sprite="plus" kind="danger" style={{ flex: 1 }} onPress={() => router.push('/transaction?type=expense')} />
        <Button label="Income" sprite="plus" style={{ flex: 1 }} onPress={() => router.push('/transaction?type=income')} />
      </View>
      {rules.length > 0 ? <Txt v="small" dim style={{ textAlign: 'center' }}>A paused rule skips the days it was paused.</Txt> : null}
    </Screen>
  );
}
