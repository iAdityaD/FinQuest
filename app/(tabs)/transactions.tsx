import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { filterByPeriod, groupByDay, periodLabel, shiftPeriod } from '../../src/domain/analytics';
import type { Period } from '../../src/domain/analytics';
import { getCategory } from '../../src/domain/categories';
import { relativeLabel, today } from '../../src/domain/dates';
import type { Transaction } from '../../src/domain/types';
import { useStore } from '../../src/store/useStore';
import { useMoney } from '../../src/ui/hooks';
import { Button, Field, Panel, Row, Screen, Segmented, Stepper, Txt } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

type Filter = 'all' | 'expense' | 'income';

export default function Transactions() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const transactions = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const now = today();
  const [period, setPeriod] = useState<Period>({ kind: 'month', anchor: now });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = filterByPeriod(transactions, period).filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (!q) return true;
      return tx.note.toLowerCase().includes(q) || getCategory(tx.categoryId).name.toLowerCase().includes(q);
    });
    return groupByDay(list);
  }, [transactions, period, filter, query]);

  const confirmDelete = (tx: Transaction) =>
    Alert.alert('Delete transaction?', `${tx.note || getCategory(tx.categoryId).name} · ${fmt(tx.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
    ]);

  return (
    <Screen title="Transactions">
      <Stepper label={periodLabel(period)} onPrev={() => setPeriod(shiftPeriod(period, -1))} onNext={() => setPeriod(shiftPeriod(period, 1))} />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]}
      />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Note or category" autoCorrect={false} />

      {groups.length === 0 ? (
        <Panel style={{ alignItems: 'center', gap: 10 }}>
          <Txt dim>Nothing here for {periodLabel(period)}.</Txt>
          <Button label="Add a transaction" onPress={() => router.push('/transaction?type=expense')} />
        </Panel>
      ) : null}

      {groups.map((g) => (
        <Panel key={g.date}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4, borderBottomWidth: 2, borderColor: t.border }}>
            <Txt v="h">{relativeLabel(g.date, now)}</Txt>
            <Txt v="h" color={g.total < 0 ? t.bad : t.good}>{fmt(g.total, { sign: true })}</Txt>
          </View>
          {g.items.map((tx) => {
            const cat = getCategory(tx.categoryId);
            return (
              <Row
                key={tx.id}
                sprite={cat.sprite}
                title={tx.note || cat.name}
                subtitle={cat.name}
                right={<Txt v="h" color={tx.type === 'income' ? t.good : t.bad}>{fmt(tx.type === 'income' ? tx.amount : -tx.amount, { sign: true })}</Txt>}
                onPress={() => router.push({ pathname: '/transaction', params: { id: tx.id } })}
                onLongPress={() => confirmDelete(tx)}
              />
            );
          })}
        </Panel>
      ))}
      {groups.length > 0 ? <Txt v="small" dim style={{ textAlign: 'center' }}>Tap to edit. Hold to delete.</Txt> : null}
    </Screen>
  );
}
