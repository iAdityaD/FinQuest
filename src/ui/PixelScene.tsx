import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from './theme';

const COLUMNS = 36;
const STARS = [
  [6, 12], [14, 30], [22, 8], [31, 22], [40, 14], [48, 34], [57, 10], [66, 26], [73, 6], [81, 18], [90, 30], [95, 9],
];

/** Night-sky banner built from plain views: sky bands, stars, a moon and two rows of hills. */
export function PixelScene({ height = 130, children }: { height?: number; children?: ReactNode }) {
  const t = useTheme();
  const hills = useMemo(
    () =>
      Array.from({ length: COLUMNS }, (_, i) => ({
        far: 0.34 + 0.16 * Math.sin(i * 0.42) + 0.07 * Math.sin(i * 1.3),
        near: 0.16 + 0.08 * Math.sin(i * 0.3 + 2) + 0.04 * Math.sin(i * 1.1),
      })),
    [],
  );
  // Heights snap to 6px steps so the ridges look stepped rather than smooth.
  const step = (ratio: number) => Math.round((ratio * height) / 6) * 6;
  return (
    <View style={{ height, borderRadius: 8, borderWidth: 2, borderColor: t.border, overflow: 'hidden' }}>
      {t.sky.map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
      {STARS.map(([x, y], i) => (
        <View key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: i % 3 === 0 ? 4 : 2, height: i % 3 === 0 ? 4 : 2, backgroundColor: '#ffffffcc' }} />
      ))}
      <View style={{ position: 'absolute', right: 26, top: 14, alignItems: 'center' }}>
        <View style={{ width: 12, height: 4, backgroundColor: '#ffe9a8' }} />
        <View style={{ width: 20, height: 12, backgroundColor: '#ffe9a8' }} />
        <View style={{ width: 12, height: 4, backgroundColor: '#ffe9a8' }} />
      </View>
      {(['far', 'near'] as const).map((layer) => (
        <View key={layer} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' }}>
          {hills.map((h, i) => (
            <View key={i} style={{ flex: 1, height: step(h[layer]), backgroundColor: layer === 'far' ? t.hillFar : t.hillNear }} />
          ))}
        </View>
      ))}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8, alignItems: 'center' }}>{children}</View>
    </View>
  );
}
