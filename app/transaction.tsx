import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { addMonths, formatLong, parts, today } from '../src/domain/dates';
import { CURRENCIES, parseAmount, toInput } from '../src/domain/money';
import { describeRule, isMonthEnd } from '../src/domain/recurring';
import type { Frequency, TxType } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { DateField } from '../src/ui/calendar';
import { confirm } from '../src/ui/dialog';
import { useCategories } from '../src/ui/hooks';
import { Button, Field, Panel, Screen, Segmented, Stepper, Txt } from '../src/ui/kit';
import { Sprite } from '../src/ui/Sprite';
import { FONT, useTheme } from '../src/ui/theme';

export default function TransactionForm() {
  const t = useTheme();
  const router = useRouter();
  // `id` edits a logged transaction, `rule` edits a repeating one, neither adds a new transaction.
  const params = useLocalSearchParams<{ id?: string; type?: string; rule?: string }>();
  const existing = useStore((s) => s.transactions.find((tx) => tx.id === params.id));
  const rule = useStore((s) => s.recurring.find((r) => r.id === params.rule));
  const currency = useStore((s) => s.settings.currency);
  const saveTransaction = useStore((s) => s.saveTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const saveRecurring = useStore((s) => s.saveRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);
  const now = today();
  const source = existing ?? rule;
  // An archived category stays selectable while editing the entry that already uses it.
  const { forType } = useCategories();
  const categoriesFor = (kind: TxType) => forType(kind, source?.categoryId);

  const [type, setType] = useState<TxType>(source?.type ?? (params.type === 'income' ? 'income' : 'expense'));
  const [amountText, setAmountText] = useState(source ? toInput(source.amount, currency) : '');
  const [categoryId, setCategoryId] = useState(source?.categoryId ?? categoriesFor(type)[0].id);
  const [date, setDate] = useState(existing?.date ?? rule?.anchorDate ?? now);
  const [note, setNote] = useState(source?.note ?? '');
  const [repeat, setRepeat] = useState<Frequency | 'none'>(rule?.frequency ?? 'none');
  const [interval, setEvery] = useState(rule?.interval ?? 1);
  const [hasEnd, setHasEnd] = useState<'no' | 'yes'>(rule?.endDate ? 'yes' : 'no');
  const [endDate, setEndDate] = useState(rule?.endDate ?? addMonths(now, 12));
  const [askAmount, setAskAmount] = useState<'fixed' | 'ask'>(rule?.askAmount ? 'ask' : 'fixed');
  const [onLastDay, setOnLastDay] = useState<'day' | 'last'>(rule?.monthEnd ? 'last' : 'day');

  const amount = parseAmount(amountText, currency);
  const categories = categoriesFor(type);
  const color = type === 'expense' ? t.bad : t.good;
  const repeats = repeat !== 'none';
  // Only a rule can ask for its amount later; then the figure here is just the usual one.
  const asks = repeats && !existing && askAmount === 'ask';
  // "Last day of the month" is offered when the start date is one and the rule runs by months.
  const byMonth = repeat === 'monthly' || repeat === 'yearly';
  const canBeLastDay = byMonth && isMonthEnd(date);
  const monthEnd = canBeLastDay && (onLastDay === 'last' || parts(date).d === 31);

  const changeType = (next: TxType) => {
    setType(next);
    setCategoryId(categoriesFor(next)[0].id);
  };

  const save = () => {
    if (repeat !== 'none' && !existing) {
      // The rule logs its own transactions, starting with today's if it is already due.
      saveRecurring({
        id: rule?.id, type, amount, categoryId, note: note.trim(), frequency: repeat, interval,
        anchorDate: date, endDate: hasEnd === 'yes' ? endDate : null, active: rule?.active ?? true, askAmount: asks, monthEnd,
      });
    } else {
      saveTransaction({ id: existing?.id, type, amount, categoryId, date, note: note.trim() });
    }
    router.back();
  };

  const remove = () =>
    confirm(
      rule ? 'Stop repeating?' : 'Delete transaction?',
      rule ? 'Transactions it has already logged stay where they are.' : 'This cannot be undone.',
      rule ? 'Stop' : 'Delete',
      () => {
        if (rule) deleteRecurring(rule.id);
        else if (existing) deleteTransaction(existing.id);
        router.back();
      },
    );

  return (
    <Screen title={rule ? 'Edit Repeat' : existing ? 'Edit Transaction' : 'Add Transaction'} back>
      <Segmented
        value={type}
        onChange={changeType}
        activeColor={color}
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
      />

      <Panel style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Txt v="num" color={color} style={{ fontSize: 40 }}>{CURRENCIES[currency].symbol}</Txt>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={t.dim}
          autoFocus={!existing}
          accessibilityLabel="Amount"
          style={{ fontFamily: FONT, fontSize: 40, color: t.text, minWidth: 90, minHeight: 60, textAlign: 'center' }}
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
              <Txt v="small" numberOfLines={1} color={active ? t.accent : t.text} style={{ fontSize: 13 }}>{cat.name}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt v="small" dim>{repeats ? 'Starts' : 'Date'}</Txt>
      <DateField value={date} onChange={setDate} title={repeats ? 'First date' : 'Transaction date'} />
      {canBeLastDay && parts(date).d < 31 ? (
        <>
          <Segmented
            value={onLastDay}
            onChange={setOnLastDay}
            options={[{ value: 'day', label: `On day ${parts(date).d}` }, { value: 'last', label: 'Last day of month' }]}
          />
          <Txt v="small" dim>
            {monthEnd
              ? 'Falls on the 31st, 30th, or 28th/29th of February: whatever the last day of that month is.'
              : `Falls on day ${parts(date).d} every time. Months that are shorter use their last day.`}
          </Txt>
        </>
      ) : null}
      {byMonth && parts(date).d === 31 ? <Txt v="small" dim>The 31st means the last day of every month, so shorter months are never skipped.</Txt> : null}
      {byMonth && !canBeLastDay && parts(date).d > 28 ? <Txt v="small" dim>Months without a day {parts(date).d} use their last day instead.</Txt> : null}

      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Lunch, metro, salary..." maxLength={80} />

      {!existing ? (
        <>
          <Txt v="small" dim>Repeat</Txt>
          <Segmented
            value={repeat}
            onChange={setRepeat}
            options={[
              ...(rule ? [] : [{ value: 'none' as const, label: 'Once' }]),
              { value: 'daily' as const, label: 'Day' },
              { value: 'weekly' as const, label: 'Week' },
              { value: 'monthly' as const, label: 'Month' },
              { value: 'yearly' as const, label: 'Year' },
            ]}
          />
        </>
      ) : null}
      {repeats && !existing ? (
        <>
          <Stepper label={describeRule({ frequency: repeat, interval })} onPrev={() => setEvery(Math.max(1, interval - 1))} onNext={() => setEvery(Math.min(12, interval + 1))} />
          <Segmented value={hasEnd} onChange={setHasEnd} options={[{ value: 'no', label: 'No end' }, { value: 'yes', label: 'Ends on' }]} />
          {hasEnd === 'yes' ? (
            <>
              <DateField value={endDate} onChange={setEndDate} title="Last date" min={date} format={formatLong} />
            </>
          ) : null}

          <Txt v="small" dim>Amount</Txt>
          <Segmented value={askAmount} onChange={setAskAmount} options={[{ value: 'fixed', label: 'Same each time' }, { value: 'ask', label: 'Ask me each time' }]} />
          <Txt v="small" dim>
            {asks
              ? 'For amounts that change, like a variable salary or an electricity bill. Nothing is logged on its own: when it comes due, Home asks you for the real figure. The amount above is only your usual one, and can be left empty.'
              : 'For fixed amounts, like rent or a SIP. FinQuest logs it each time it comes due, including any it missed while the app was closed. Edit the rule later to change the amount from then on.'}
          </Txt>
        </>
      ) : null}

      <Button
        label={source ? 'Save changes' : repeats ? 'Add Repeating' : type === 'expense' ? 'Add Expense' : 'Add Income'}
        kind={type === 'expense' ? 'danger' : 'primary'}
        disabled={amount <= 0 && !asks}
        onPress={save}
      />
      {source ? <Button label={rule ? 'Stop repeating' : 'Delete'} kind="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
