import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { formatLong, today } from '../src/domain/dates';
import { goalProgress, monthlyGoalNeed } from '../src/domain/goals';
import type { GoalProgress } from '../src/domain/goals';
import { parseAmount } from '../src/domain/money';
import type { Goal } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { useMoney } from '../src/ui/hooks';
import { AmountPrompt, Badge, Button, Panel, ProgressBar, Screen, Txt } from '../src/ui/kit';
import { PixelScene } from '../src/ui/PixelScene';
import { Sprite } from '../src/ui/Sprite';
import { useTheme } from '../src/ui/theme';

export default function Goals() {
  const t = useTheme();
  const router = useRouter();
  const fmt = useMoney();
  const goals = useStore((s) => s.goals);
  const saveRule = useStore((s) => s.settings.saveRule);
  const startDay = useStore((s) => s.settings.monthStartDay);
  const savingsTarget = useStore((s) => s.settings.monthlySavingsTarget);
  const currency = useStore((s) => s.settings.currency);
  const contributeToGoal = useStore((s) => s.contributeToGoal);
  const [funding, setFunding] = useState<Goal | null>(null);
  const now = today();
  const need = monthlyGoalNeed(goals, now, saveRule, startDay);

  const schedule = (p: GoalProgress) => {
    if (p.status === 'done') return 'Goal reached. Well done!';
    if (p.status === 'open') return `${fmt(p.remaining)} to go. Add a target date to get a monthly amount.`;
    if (p.status === 'overdue') return `Target date passed with ${fmt(p.remaining)} to go.`;
    const times = p.contributionsLeft === 1 ? 'one payment left' : `${p.contributionsLeft} payments left`;
    return `Put in ${fmt(p.perMonth ?? 0)} by ${formatLong(p.nextContribution ?? now)} (${times}). That is about ${fmt(p.perDay ?? 0)} a day.`;
  };

  return (
    <Screen title="Goals" back>
      <PixelScene height={110}>
        <Sprite name="target" size={34} />
      </PixelScene>

      {goals.length === 0 ? (
        <Panel>
          <Txt dim>No goals yet. Pick something to save for and FinQuest will tell you how much to put aside each month.</Txt>
        </Panel>
      ) : null}

      {need > 0 ? (
        <Panel alt style={{ gap: 4 }}>
          <Txt v="h">Your goals need {fmt(need)} a month</Txt>
          <Txt v="small" dim>
            {savingsTarget >= need
              ? `Your savings plan of ${fmt(savingsTarget)} a month covers this.`
              : `Your savings plan is ${fmt(savingsTarget)} a month, which is ${fmt(need - savingsTarget)} short.`}
          </Txt>
        </Panel>
      ) : null}

      {goals.map((goal) => {
        const p = goalProgress(goal, now, saveRule, startDay);
        const color = p.status === 'done' ? t.good : p.status === 'overdue' ? t.bad : t.accent;
        return (
          <Panel key={goal.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Sprite name={goal.icon} size={40} />
              <View style={{ flex: 1 }}>
                <Txt v="h" numberOfLines={1}>{goal.name}</Txt>
                <Txt v="small" dim>{fmt(goal.savedAmount)} / {fmt(goal.targetAmount)}</Txt>
              </View>
              <Badge label={`${p.percent}%`} color={color} />
            </View>
            <ProgressBar value={p.percent / 100} color={color} />
            {goal.targetDate ? <Txt v="small" dim>Target: {formatLong(goal.targetDate)}</Txt> : null}
            <Txt v="small">{schedule(p)}</Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Add money" style={{ flex: 1 }} onPress={() => setFunding(goal)} disabled={p.status === 'done'} />
              <Button label="Edit" kind="ghost" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })} />
            </View>
          </Panel>
        );
      })}

      <Button label="Add Goal" sprite="plus" onPress={() => router.push('/goal')} />

      <AmountPrompt
        visible={funding !== null}
        title={funding ? `Add to ${funding.name}` : ''}
        hint="How much are you putting aside?"
        confirmLabel="Add"
        onCancel={() => setFunding(null)}
        onSubmit={(text) => {
          const amount = parseAmount(text, currency);
          if (funding && amount > 0) contributeToGoal(funding.id, amount);
          setFunding(null);
        }}
      />
    </Screen>
  );
}
