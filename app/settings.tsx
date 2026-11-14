import React from 'react';
import { CURRENCIES } from '../src/domain/money';
import type { CurrencyCode, ThemeName } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { confirm } from '../src/ui/dialog';
import { Button, Panel, Screen, Segmented, Txt } from '../src/ui/kit';
import { THEMES } from '../src/ui/theme';

const CODES = Object.keys(CURRENCIES) as CurrencyCode[];
const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const loadDemo = useStore((s) => s.loadDemo);
  const eraseAll = useStore((s) => s.eraseAll);

  return (
    <Screen title="Settings" back>
      <Panel style={{ gap: 10 }}>
        <Txt v="h">Theme</Txt>
        <Segmented
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={THEME_NAMES.map((name) => ({ value: name, label: THEMES[name].name.replace('Pixel ', '').replace('Retro ', '') }))}
        />
      </Panel>

      <Panel style={{ gap: 10 }}>
        <Txt v="h">Currency</Txt>
        <Segmented value={settings.currency} onChange={(currency) => updateSettings({ currency })} options={CODES.map((c) => ({ value: c, label: c }))} />
        <Txt v="small" dim>{CURRENCIES[settings.currency].name}. Changing it relabels amounts; it does not convert them.</Txt>
      </Panel>

      <Panel style={{ gap: 10 }}>
        <Txt v="h">3D coin</Txt>
        <Segmented
          value={settings.effects3d ? 'on' : 'off'}
          onChange={(v) => updateSettings({ effects3d: v === 'on' })}
          options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
        />
        <Txt v="small" dim>Turn off to save battery on older phones.</Txt>
      </Panel>

      <Panel style={{ gap: 10 }}>
        <Txt v="h">Data</Txt>
        <Txt v="small" dim>Everything is stored on this device only.</Txt>
        <Button
          label="Load demo data"
          kind="ghost"
          onPress={() => confirm('Load demo data?', 'This replaces your transactions, goals and budgets with sample data.', 'Replace', loadDemo)}
        />
        <Button
          label="Erase all data"
          kind="danger"
          onPress={() => confirm('Erase everything?', 'All transactions, goals, budgets and your savings plan are deleted. This cannot be undone.', 'Erase', eraseAll)}
        />
      </Panel>
    </Screen>
  );
}
