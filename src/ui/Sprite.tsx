import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { PALETTE, SPRITES } from './sprites';

interface Run {
  ch: string;
  len: number;
}

/** Collapses a row into runs of the same colour so a sprite needs far fewer views. */
function toRuns(row: string): Run[] {
  const runs: Run[] = [];
  for (const ch of row) {
    const last = runs[runs.length - 1];
    if (last && last.ch === ch) last.len++;
    else runs.push({ ch, len: 1 });
  }
  return runs;
}

interface Props {
  name: string;
  size?: number;
  tint?: string;
}

export const Sprite = memo(function Sprite({ name, size = 30, tint = '#ffffff' }: Props) {
  const rows = useMemo(() => (SPRITES[name] ?? SPRITES.other).map(toRuns), [name]);
  const px = Math.max(1, Math.floor(size / 10));
  return (
    <View style={{ width: px * 10, height: px * 10 }}>
      {rows.map((runs, y) => (
        <View key={y} style={{ flexDirection: 'row', height: px }}>
          {runs.map((r, i) => (
            <View
              key={i}
              style={{ width: r.len * px, height: px, backgroundColor: r.ch === '.' ? 'transparent' : r.ch === 'a' ? tint : PALETTE[r.ch] }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});
