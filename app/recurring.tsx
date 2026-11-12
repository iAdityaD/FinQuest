import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { getCategory } from '../src/domain/categories';
import { formatLong, today } from '../src/domain/dates';
import { describeRule, nextDue } from '../src/domain/recurring';
import type { RecurringRule } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { useMoney } from '../src/ui/hooks';
import { Badge, Button, Panel, Row, Screen, Txt } from '../src/ui/kit';
import { useTheme } from '../src/ui/theme';

export default function Recurring() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const rules = useStore((s) => s.recurring);
  const saveRecurring = useStore((s) => s.saveRecurring);
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
              subtitle={`${describeRule(rule)} · ${status(rule)}`}
              right={<Txt v="h" color={rule.type === 'income' ? t.good : t.bad}>{fmt(rule.type === 'income' ? rule.amount : -rule.amount, { sign: true })}</Txt>}
              onPress={() => router.push({ pathname: '/transaction', params: { rule: rule.id } })}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Badge label={rule.active ? 'Active' : 'Paused'} color={rule.active ? t.good : t.dim} />
              </View>
              <Button label={rule.active ? 'Pause' : 'Resume'} kind="ghost" onPress={() => saveRecurring({ ...rule, active: !rule.active })} />
            </View>
          </Panel>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Expense" sprite="plus" kind="danger" style={{ flex: 1 }} onPress={() => router.push('/transaction?type=expense')} />
        <Button label="Income" sprite="plus" style={{ flex: 1 }} onPress={() => router.push('/transaction?type=income')} />
      </View>
      {rules.length > 0 ? <Txt v="small" dim style={{ textAlign: 'center' }}>Tap to edit. A paused rule skips the days it was paused.</Txt> : null}
    </Screen>
  );
}
