import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { categoriesFor } from '../src/domain/categories';
import { addDays, relativeLabel, today } from '../src/domain/dates';
import { CURRENCIES, parseAmount, toInput } from '../src/domain/money';
import type { TxType } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { Button, Field, Panel, Screen, Segmented, Stepper, Txt } from '../src/ui/kit';
import { Sprite } from '../src/ui/Sprite';
import { FONT_BOLD, useTheme } from '../src/ui/theme';

export default function TransactionForm() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const existing = useStore((s) => s.transactions.find((tx) => tx.id === params.id));
  const currency = useStore((s) => s.settings.currency);
  const saveTransaction = useStore((s) => s.saveTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const now = today();

  const [type, setType] = useState<TxType>(existing?.type ?? (params.type === 'income' ? 'income' : 'expense'));
  const [amountText, setAmountText] = useState(existing ? toInput(existing.amount, currency) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categoriesFor(type)[0].id);
  const [date, setDate] = useState(existing?.date ?? now);
  const [note, setNote] = useState(existing?.note ?? '');

  const amount = parseAmount(amountText, currency);
  const categories = categoriesFor(type);
  const color = type === 'expense' ? t.bad : t.good;

  const changeType = (next: TxType) => {
    setType(next);
    setCategoryId(categoriesFor(next)[0].id);
  };

  const save = () => {
    saveTransaction({ id: existing?.id, type, amount, categoryId, date, note: note.trim() });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (existing) deleteTransaction(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen title={existing ? 'Edit Transaction' : 'Add Transaction'} back>
      <Segmented
        value={type}
        onChange={changeType}
        activeColor={color}
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
      />

      <Panel style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Txt v="num" color={color} style={{ fontSize: 34 }}>{CURRENCIES[currency].symbol}</Txt>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={t.dim}
          autoFocus={!existing}
          accessibilityLabel="Amount"
          style={{ fontFamily: FONT_BOLD, fontSize: 34, color: t.text, minWidth: 90, minHeight: 60, textAlign: 'center' }}
        />
      </Panel>

      <Txt v="small" dim>Category</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((cat) => {
          const active = cat.id === categoryId;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategoryId(cat.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={cat.name}
              style={{
                width: '23%', minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, borderRadius: 8,
                borderWidth: 2, borderBottomWidth: 4, borderColor: active ? t.accent : t.border, backgroundColor: active ? t.panelAlt : t.panel,
              }}
            >
              <Sprite name={cat.sprite} size={30} />
              <Txt v="small" numberOfLines={1} color={active ? t.accent : t.text} style={{ fontSize: 10 }}>{cat.name}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt v="small" dim>Date</Txt>
      <Stepper label={relativeLabel(date, now)} onPrev={() => setDate(addDays(date, -1))} onNext={() => setDate(addDays(date, 1))} />

      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Lunch, metro, salary..." maxLength={80} />

      <Button label={existing ? 'Save changes' : type === 'expense' ? 'Add Expense' : 'Add Income'} kind={type === 'expense' ? 'danger' : 'primary'} disabled={amount <= 0} onPress={save} />
      {existing ? <Button label="Delete" kind="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
