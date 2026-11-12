import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { CURRENCIES } from '../src/domain/money';
import type { CurrencyCode } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { Coin3D } from '../src/ui/Coin3D';
import { Button, Panel, Screen, Segmented, Txt } from '../src/ui/kit';
import { PixelScene } from '../src/ui/PixelScene';
import { Sprite } from '../src/ui/Sprite';
import { useTheme } from '../src/ui/theme';

const CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const currency = useStore((s) => s.settings.currency);
  const updateSettings = useStore((s) => s.updateSettings);
  const loadDemo = useStore((s) => s.loadDemo);

  const start = (withDemo: boolean) => {
    if (withDemo) loadDemo();
    updateSettings({ onboarded: true });
    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 6, marginTop: 24 }}>
        <Coin3D size={110} background={t.bg} />
        <Txt v="title" style={{ fontSize: 40 }}>FinQuest</Txt>
        <Txt dim style={{ textAlign: 'center' }}>Your personal finance tracker.{'\n'}Offline. Private. Yours.</Txt>
      </View>

      <PixelScene height={150}>
        <Sprite name="flame" size={40} />
      </PixelScene>

      <Panel style={{ gap: 10 }}>
        <Txt v="h">Pick your currency</Txt>
        <Segmented value={currency} options={CODES.map((c) => ({ value: c, label: c }))} onChange={(c) => updateSettings({ currency: c })} />
        <Txt v="small" dim>{CURRENCIES[currency].name}. You can change this later in Settings.</Txt>
      </Panel>

      <Button label="Get Started" onPress={() => start(false)} />
      <Button label="Explore with demo data" kind="ghost" onPress={() => start(true)} />
      <Txt v="small" dim style={{ textAlign: 'center' }}>Everything stays on this device. No account, no internet.</Txt>
    </Screen>
  );
}
