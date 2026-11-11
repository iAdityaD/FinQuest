import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { GOAL_ICONS } from '../src/domain/categories';
import { addDays, addMonths, formatLong, today } from '../src/domain/dates';
import { goalProgress } from '../src/domain/goals';
import { parseAmount, toInput } from '../src/domain/money';
import { useStore } from '../src/store/useStore';
import { useMoney } from '../src/ui/hooks';
import { Button, Field, Panel, Screen, Segmented, Stepper, Txt } from '../src/ui/kit';
import { Sprite } from '../src/ui/Sprite';
import { useTheme } from '../src/ui/theme';

export default function GoalForm() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const params = useLocalSearchParams<{ id?: string }>();
  const existing = useStore((s) => s.goals.find((g) => g.id === params.id));
  const currency = useStore((s) => s.settings.currency);
  const saveRule = useStore((s) => s.settings.saveRule);
  const saveGoal = useStore((s) => s.saveGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const now = today();

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? GOAL_ICONS[0]);
  const [targetText, setTargetText] = useState(existing ? toInput(existing.targetAmount, currency) : '');
  const [savedText, setSavedText] = useState(existing ? toInput(existing.savedAmount, currency) : '');
  const [hasDate, setHasDate] = useState<'yes' | 'no'>(existing && !existing.targetDate ? 'no' : 'yes');
  const [date, setDate] = useState(existing?.targetDate ?? addMonths(now, 6));

  const targetAmount = parseAmount(targetText, currency);
  const savedAmount = parseAmount(savedText, currency);
  const targetDate = hasDate === 'yes' ? date : null;
  const valid = name.trim().length > 0 && targetAmount > 0;
  const preview = goalProgress({ id: '', name, icon, targetAmount, savedAmount, targetDate, createdAt: 0 }, now, saveRule);

  const save = () => {
    saveGoal({ id: existing?.id, name: name.trim(), icon, targetAmount, savedAmount, targetDate });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete goal?', 'Your transactions are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (existing) deleteGoal(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen title={existing ? 'Edit Goal' : 'New Goal'} back>
      <Field label="What are you saving for?" value={name} onChangeText={setName} placeholder="Japan trip" maxLength={40} />

      <Txt v="small" dim>Icon</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {GOAL_ICONS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setIcon(id)}
            accessibilityRole="button"
            accessibilityState={{ selected: id === icon }}
            accessibilityLabel={`Icon ${id}`}
            style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 2, borderColor: id === icon ? t.accent : t.border, backgroundColor: t.panel }}
          >
            <Sprite name={id} size={30} />
          </Pressable>
        ))}
      </View>

      <Field label="Target amount" value={targetText} onChangeText={setTargetText} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Already saved" value={savedText} onChangeText={setSavedText} keyboardType="decimal-pad" placeholder="0" />

      <Txt v="small" dim>Target date</Txt>
      <Segmented value={hasDate} onChange={setHasDate} options={[{ value: 'yes', label: 'Set a date' }, { value: 'no', label: 'No deadline' }]} />
      {hasDate === 'yes' ? (
        <>
          <Stepper label={formatLong(date)} onPrev={() => setDate(addMonths(date, -1))} onNext={() => setDate(addMonths(date, 1))} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="- 1 day" kind="ghost" style={{ flex: 1 }} onPress={() => setDate(addDays(date, -1))} />
            <Button label="+ 1 day" kind="ghost" style={{ flex: 1 }} onPress={() => setDate(addDays(date, 1))} />
          </View>
        </>
      ) : null}

      {valid && preview.status === 'active' ? (
        <Panel alt>
          <Txt v="small">
            Save {fmt(preview.perMonth ?? 0)} a month ({preview.contributionsLeft} payment{preview.contributionsLeft === 1 ? '' : 's'}, at the {saveRule === 'start' ? 'start' : 'end'} of each month) to get there on time.
          </Txt>
        </Panel>
      ) : null}
      {valid && preview.status === 'overdue' ? (
        <Panel alt>
          <Txt v="small" color={t.bad}>That date is in the past. Pick a later one.</Txt>
        </Panel>
      ) : null}

      <Button label={existing ? 'Save changes' : 'Create Goal'} disabled={!valid} onPress={save} />
      {existing ? <Button label="Delete goal" kind="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
