import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { today } from '../src/domain/dates';
import { monthlyGoalNeed } from '../src/domain/goals';
import { parseAmount, toInput } from '../src/domain/money';
import { computePlan } from '../src/domain/plan';
import type { SaveRule } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { useMoney } from '../src/ui/hooks';
import { Button, Field, Panel, Screen, Segmented, Txt } from '../src/ui/kit';
import { useTheme } from '../src/ui/theme';

const RULE_HELP: Record<SaveRule, string> = {
  start: 'Pay yourself first. Your savings are set aside on day 1 from your planned income, and you spend what is left.',
  end: 'Save what is left. The limit is worked out from income that has actually arrived, and savings are moved on the last day.',
};

export default function Plan() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const goals = useStore((s) => s.goals);
  const updateSettings = useStore((s) => s.updateSettings);
  const now = today();

  const [incomeText, setIncomeText] = useState(toInput(settings.monthlyIncome, settings.currency));
  const [targetText, setTargetText] = useState(toInput(settings.monthlySavingsTarget, settings.currency));
  const [rule, setRule] = useState<SaveRule>(settings.saveRule);

  const monthlyIncome = parseAmount(incomeText, settings.currency);
  const monthlySavingsTarget = parseAmount(targetText, settings.currency);
  const preview = computePlan({ transactions, today: now, monthlyIncome, monthlySavingsTarget, saveRule: rule });
  const need = monthlyGoalNeed(goals, now, rule);
  const impossible = preview.configured && preview.spendable < 0;

  const save = () => {
    updateSettings({ monthlyIncome, monthlySavingsTarget, saveRule: rule });
    router.back();
  };

  return (
    <Screen title="Savings Plan" back>
      <Txt dim>Choose how much to save every month. FinQuest turns it into a daily spending limit.</Txt>

      <Field label="Monthly income (planned)" value={incomeText} onChangeText={setIncomeText} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Save every month" value={targetText} onChangeText={setTargetText} keyboardType="decimal-pad" placeholder="0" />
      {need > 0 ? (
        <View style={{ gap: 8 }}>
          <Txt v="small" dim>Your goals need {fmt(need)} a month.</Txt>
          <Button label={`Use ${fmt(need)}`} kind="ghost" onPress={() => setTargetText(toInput(need, settings.currency))} />
        </View>
      ) : null}

      <Txt v="small" dim>When do you set savings aside?</Txt>
      <Segmented value={rule} onChange={setRule} options={[{ value: 'start', label: 'Start of month' }, { value: 'end', label: 'End of month' }]} />
      <Txt v="small" dim>{RULE_HELP[rule]}</Txt>

      <Panel alt style={{ gap: 6 }}>
        <Txt v="h">Preview for today</Txt>
        {!preview.configured ? (
          <Txt dim>Enter your income to see your daily limit.</Txt>
        ) : impossible ? (
          <Txt color={t.bad}>The savings target is higher than your income. Lower it to get a daily limit.</Txt>
        ) : (
          <>
            <Txt v="num">{fmt(preview.dailyAllowance)} <Txt dim>/ day</Txt></Txt>
            <Txt v="small" dim>
              {fmt(preview.incomeBasis)} income - {fmt(monthlySavingsTarget)} savings - {fmt(preview.spentSoFar - preview.spentToday)} already spent, spread over the {preview.daysLeft} day{preview.daysLeft === 1 ? '' : 's'} left this month.
            </Txt>
          </>
        )}
      </Panel>

      <Button label="Save plan" onPress={save} />
    </Screen>
  );
}
