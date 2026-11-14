import { useRouter } from 'expo-router';
import React from 'react';
import { Share } from 'react-native';
import { toCSV } from '../../src/domain/csv';
import { useStore } from '../../src/store/useStore';
import { notify } from '../../src/ui/dialog';
import { useCategories } from '../../src/ui/hooks';
import { Panel, Row, Screen, Txt } from '../../src/ui/kit';
import { PixelScene } from '../../src/ui/PixelScene';
import { Sprite } from '../../src/ui/Sprite';
import { useTheme } from '../../src/ui/theme';

export default function More() {
  const t = useTheme();
  const router = useRouter();
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const goalCount = useStore((s) => s.goals.length);
  const repeatCount = useStore((s) => s.recurring.length);
  const categories = useCategories();
  const arrow = <Txt v="h" color={t.accent}>{'>'}</Txt>;

  const exportCsv = async () => {
    if (transactions.length === 0) {
      notify('Nothing to export', 'Add a transaction first.');
      return;
    }
    try {
      await Share.share({ title: 'finquest-transactions.csv', message: toCSV(transactions, currency, categories.get) });
    } catch {
      notify('Export failed', 'The share sheet could not be opened.');
    }
  };

  return (
    <Screen title="More">
      <Panel>
        <Row sprite="target" title="Goals" subtitle={goalCount ? `${goalCount} active` : 'Save towards something'} right={arrow} onPress={() => router.push('/goals')} />
        <Row sprite="salary" title="Savings plan" subtitle="Monthly target and daily allowance" right={arrow} onPress={() => router.push('/plan')} />
        <Row sprite="repeat" title="Repeating" subtitle={repeatCount ? `${repeatCount} set up` : 'Rent, salary, subscriptions'} right={arrow} onPress={() => router.push('/recurring')} />
        <Row sprite="shopping" title="Categories" subtitle="Add, rename, reorder, archive" right={arrow} onPress={() => router.push('/categories')} />
        <Row sprite="bills" title="Export CSV" subtitle={`${transactions.length} transactions`} right={arrow} onPress={exportCsv} />
        <Row sprite="gear" title="Settings" subtitle="Theme, currency, data" right={arrow} onPress={() => router.push('/settings')} />
        <Row sprite="star" title="Help & quest guide" subtitle="How to play, XP and levels" right={arrow} onPress={() => router.push('/help')} />
      </Panel>
      <PixelScene height={140}>
        <Sprite name="star" size={30} />
      </PixelScene>
      <Txt v="small" dim style={{ textAlign: 'center' }}>FinQuest v0.1.0 · Offline · Open source (MIT)</Txt>
    </Screen>
  );
}
