import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { today } from '../src/domain/dates';
import { TITLES, XP, dailyQuests, levelFor, levelStart, streak, totalXp } from '../src/domain/game';
import { useStore } from '../src/store/useStore';
import { Coin3D } from '../src/ui/Coin3D';
import { usePlan } from '../src/ui/hooks';
import { Badge, Button, Panel, ProgressBar, Row, Screen, Txt } from '../src/ui/kit';
import { PixelScene } from '../src/ui/PixelScene';
import { Sprite } from '../src/ui/Sprite';
import { useTheme } from '../src/ui/theme';

const CHAPTERS = [
  { id: 'quest', label: 'The quest' },
  { id: 'daily', label: 'Daily quests' },
  { id: 'xp', label: 'Earning XP' },
  { id: 'levels', label: 'Levels' },
  { id: 'tools', label: 'Your toolkit' },
  { id: 'dates', label: 'Dates & repeats' },
  { id: 'tips', label: 'Pro tips' },
] as const;
type ChapterId = (typeof CHAPTERS)[number]['id'];

const XP_ROWS: { sprite: string; action: string; xp: number; note: string }[] = [
  { sprite: 'list', action: 'Log a transaction', xp: XP.transaction, note: 'Every expense or income you record.' },
  { sprite: 'flame', action: 'Keep your streak', xp: XP.streakDay, note: 'For each day in a row with something logged.' },
  { sprite: 'wallet', action: 'Set a budget', xp: XP.budget, note: 'The overall limit and each category limit count.' },
  { sprite: 'target', action: 'Create a goal', xp: XP.goal, note: 'Something to save towards.' },
  { sprite: 'chest', action: 'Reach a goal', xp: XP.goalDone, note: 'The big one. Fill a goal to its target.' },
];

const TOOLS: { sprite: string; title: string; body: string; href: string }[] = [
  { sprite: 'home', title: 'Home', body: 'Balance, today\'s safe-to-spend and your quests.', href: '/' },
  { sprite: 'list', title: 'Transactions', body: 'Everything you logged. Tap to edit, hold to delete.', href: '/transactions' },
  { sprite: 'chart', title: 'Analytics', body: 'Where the money went by day, month and year.', href: '/analytics' },
  { sprite: 'wallet', title: 'Budget', body: 'Limits that turn amber, then red.', href: '/budget' },
  { sprite: 'target', title: 'Goals', body: 'Save for something and see the monthly amount.', href: '/goals' },
  { sprite: 'salary', title: 'Savings plan', body: 'Income and target in, daily limit out.', href: '/plan' },
  { sprite: 'repeat', title: 'Repeating', body: 'Rent and salary that log themselves.', href: '/recurring' },
  { sprite: 'shopping', title: 'Categories', body: 'Make the list your own.', href: '/categories' },
];

const GUIDES: { sprite: string; title: string; lines: string[] }[] = [
  {
    sprite: 'calendar',
    title: 'Picking a date',
    lines: [
      'Wherever you see a date, tap it to open the calendar and jump to any day. The arrows beside it move one day at a time.',
    ],
  },
  {
    sprite: 'repeat',
    title: 'The last day of the month',
    lines: [
      'Months end on the 31st, the 30th, or the 28th (the 29th in a leap year). FinQuest works out the right one for each month and year.',
      'Start a monthly repeat on the last day of a month and you can choose "Last day of month": it then lands on Jan 31, Feb 28, Mar 31, Apr 30 and so on.',
      'In the savings plan, picking day 31 as your month start means the same thing: your month always begins on the last day.',
    ],
  },
  {
    sprite: 'invest',
    title: 'Fixed amounts: rent, SIPs, subscriptions',
    lines: [
      'Add the transaction once, choose how often it repeats, and keep "Same each time". FinQuest logs it whenever it comes due, even if the app was closed for weeks.',
      'Raising your SIP? Open More > Repeating, tap Edit and change the amount. Entries already logged keep their old amount; new ones use the new figure.',
      'Pause stops it without losing it (paused days are not back-filled). Delete removes the rule; what it already logged stays.',
    ],
  },
  {
    sprite: 'salary',
    title: 'Amounts that change: variable salary, bills',
    lines: [
      'If your pay is different every month, do not guess. Either add it by hand the day it arrives, or make it a repeat set to "Ask me each time".',
      'An "Ask me" repeat never logs anything by itself. On the due date a card appears on Home asking how much it was. Enter the real figure, or skip it.',
      'In the savings plan, choose "End of month": your daily limit then follows the income that has actually arrived, not a planned number.',
    ],
  },
];

const TIPS = [
  'Log as you spend. Thirty seconds now beats guessing on Sunday.',
  '"Safe to spend today" is fixed for the day. Go over and tomorrow\'s number shrinks; stay under and it grows.',
  'A day with nothing spent still keeps your streak if you log anything at all, even income.',
  'Paid on the 25th? Set your month start in the savings plan so budgets run pay day to pay day.',
  'XP is counted from what is in the app right now. Delete a transaction and its XP goes with it.',
  'Everything stays on this phone. No account, no internet, nobody watching.',
];

export default function Help() {
  const t = useTheme();
  const router = useRouter();
  const plan = usePlan();
  const transactions = useStore((s) => s.transactions);
  const goals = useStore((s) => s.goals);
  const budgets = useStore((s) => s.budgets);
  const now = today();

  const level = useMemo(() => levelFor(totalXp(transactions, goals, budgets, now)), [transactions, goals, budgets, now]);
  const days = useMemo(() => streak(transactions, now), [transactions, now]);
  const quests = useMemo(() => dailyQuests(transactions, goals, budgets, plan, now), [transactions, goals, budgets, plan, now]);
  const questsDone = quests.filter((q) => q.done).length;

  // Scroll tools: a progress bar, chapter chips that jump, and a back-to-top button.
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const chips = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<Partial<Record<ChapterId, number>>>({});
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<ChapterId>('quest');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    setProgress(Math.min(1, Math.max(0, contentOffset.y / max)));
    // The chapter whose heading has most recently passed the top third of the screen.
    const line = contentOffset.y + layoutMeasurement.height / 3;
    let current: ChapterId = 'quest';
    for (const c of CHAPTERS) if ((offsets.current[c.id] ?? Infinity) <= line) current = c.id;
    // At the very bottom the last chapter may be too short to reach the line.
    if (contentOffset.y >= max - 2) current = CHAPTERS[CHAPTERS.length - 1].id;
    if (current !== active) {
      setActive(current);
      chips.current?.scrollTo({ x: Math.max(0, CHAPTERS.findIndex((c) => c.id === current) * 110 - 60), animated: true });
    }
  };

  const jump = (id: ChapterId) => scroller.current?.scrollTo({ y: Math.max(0, (offsets.current[id] ?? 0) - 8), animated: true });

  const chapter = (id: ChapterId, number: number, title: string) => (
    <View
      onLayout={(e) => {
        offsets.current[id] = e.nativeEvent.layout.y;
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 6, borderWidth: 2, borderColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="h" color={t.accent}>{number}</Txt>
      </View>
      <Txt v="title" style={{ flex: 1, fontSize: 26 }}>{title}</Txt>
    </View>
  );

  return (
    <Screen title="Quest Guide" back scroll={false}>
      {/* Sticky header: how far through the guide you are, and where to jump. */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <ProgressBar value={progress} color={t.accent} height={10} />
          </View>
          <Txt v="small" dim style={{ width: 44, textAlign: 'right' }}>{Math.round(progress * 100)}%</Txt>
        </View>
        <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {CHAPTERS.map((c) => {
            const on = c.id === active;
            return (
              <Pressable
                key={c.id}
                onPress={() => jump(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Jump to ${c.label}`}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8, borderWidth: 2, borderBottomWidth: 4, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : t.panel }}
              >
                <Txt v="h" color={on ? t.onAccent : t.dim}>{c.label}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView ref={scroller} onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 90 }}>
          {chapter('quest', 1, 'The quest')}
          <PixelScene height={130}>
            <Sprite name="flame" size={36} />
          </PixelScene>
          <Panel style={{ gap: 8 }}>
            <Txt>
              FinQuest turns looking after your money into a game you can actually win. Log what you spend, stay inside a daily limit, fill your goals, and your hero levels up.
            </Txt>
            <Txt dim>There is no boss to beat. The quest is simple: finish every month with more saved than the last.</Txt>
          </Panel>
          <Panel alt style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Coin3D size={64} background={t.panelAlt} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge label={`LV ${level.level}`} color={t.accent} />
                <Txt v="h" style={{ flex: 1 }} numberOfLines={1}>{level.title}</Txt>
              </View>
              <ProgressBar value={level.xpIntoLevel / level.xpForNext} color={t.accent} />
              <Txt v="small" dim>
                {level.xpForNext - level.xpIntoLevel} XP to level {level.level + 1} · {days} day streak
              </Txt>
            </View>
          </Panel>

          {chapter('daily', 2, 'Daily quests')}
          <Panel style={{ gap: 10 }}>
            <Txt dim>Four small jobs. The first two reset every morning; the last two stay done once you have a budget and a goal.</Txt>
            {quests.map((q) => (
              <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: q.done ? t.good : t.borderLight, backgroundColor: q.done ? t.good : 'transparent' }} />
                <Txt style={{ flex: 1 }} color={q.done ? t.dim : t.text}>{q.title}</Txt>
                <Txt v="small" color={q.done ? t.good : t.dim}>{q.done ? 'Done' : 'To do'}</Txt>
              </View>
            ))}
            <ProgressBar value={questsDone / quests.length} />
            <Txt v="small" dim>{questsDone} of {quests.length} done today.</Txt>
          </Panel>

          {chapter('xp', 3, 'Earning XP')}
          <Panel style={{ gap: 4 }}>
            {XP_ROWS.map((row) => (
              <View key={row.action} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <Sprite name={row.sprite} size={30} tint={t.accent} />
                <View style={{ flex: 1 }}>
                  <Txt v="h">{row.action}</Txt>
                  <Txt v="small" dim>{row.note}</Txt>
                </View>
                <Badge label={`+${row.xp} XP`} color={t.good} />
              </View>
            ))}
          </Panel>
          <Panel alt>
            <Txt v="small" dim>
              You have {level.xp} XP. A week of logging every day is worth about {7 * XP.transaction + 7 * XP.streakDay} XP before goals and budgets.
            </Txt>
          </Panel>

          {chapter('levels', 4, 'Levels and titles')}
          <Panel style={{ gap: 8 }}>
            <Txt dim>
              Every level needs 100 XP more than the one before: 100 to reach level 2, another 200 for level 3, and so on. A new title arrives every two levels.
            </Txt>
            {TITLES.map((title, i) => {
              const from = i * 2 + 1;
              const last = i === TITLES.length - 1;
              const here = level.title === title;
              const reached = level.level >= from;
              return (
                <View
                  key={title}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, borderWidth: 2, borderColor: here ? t.accent : t.border, backgroundColor: here ? t.panelAlt : 'transparent', opacity: reached ? 1 : 0.6 }}
                >
                  <Sprite name={reached ? 'star' : 'shield'} size={30} />
                  <View style={{ flex: 1 }}>
                    <Txt v="h" color={here ? t.accent : t.text}>{title}</Txt>
                    <Txt v="small" dim>
                      Level {from}{last ? ' and up' : ` - ${from + 1}`} · from {levelStart(from)} XP
                    </Txt>
                  </View>
                  {here ? <Badge label="You" color={t.accent} /> : null}
                </View>
              );
            })}
          </Panel>

          {chapter('tools', 5, 'Your toolkit')}
          <Panel>
            {TOOLS.map((tool) => (
              <Row
                key={tool.title}
                sprite={tool.sprite}
                title={tool.title}
                subtitle={tool.body}
                right={<Txt v="h" color={t.accent}>{'>'}</Txt>}
                onPress={() => router.push(tool.href as never)}
              />
            ))}
          </Panel>

          {chapter('dates', 6, 'Dates and repeats')}
          {GUIDES.map((g) => (
            <Panel key={g.title} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Sprite name={g.sprite} size={30} tint={t.accent} />
                <Txt v="h" style={{ flex: 1 }}>{g.title}</Txt>
              </View>
              {g.lines.map((line) => (
                <Txt key={line} dim>{line}</Txt>
              ))}
            </Panel>
          ))}
          <Button label="Open Repeating" kind="ghost" sprite="repeat" onPress={() => router.push('/recurring')} />

          {chapter('tips', 7, 'Pro tips')}
          {TIPS.map((tip, i) => (
            <Panel key={i} style={{ flexDirection: 'row', gap: 10, borderLeftWidth: 8, borderLeftColor: t.info }}>
              <Txt style={{ flex: 1 }}>{tip}</Txt>
            </Panel>
          ))}

          <Panel alt style={{ alignItems: 'center', gap: 10 }}>
            <Sprite name="chest" size={40} />
            <Txt v="h" style={{ textAlign: 'center' }}>That is the whole game.</Txt>
            <Button label="Log a transaction" sprite="plus" onPress={() => router.push('/transaction?type=expense')} />
          </Panel>
        </ScrollView>

        {progress > 0.12 ? (
          <Pressable
            onPress={() => scroller.current?.scrollTo({ y: 0, animated: true })}
            accessibilityRole="button"
            accessibilityLabel="Back to top"
            style={{ position: 'absolute', right: 4, bottom: 16, width: 52, height: 52, borderRadius: 8, borderWidth: 2, borderBottomWidth: 5, borderColor: '#00000055', backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt v="title" color={t.onAccent} style={{ fontSize: 26 }}>^</Txt>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
