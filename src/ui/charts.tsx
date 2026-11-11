import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { SeriesPoint } from '../domain/analytics';
import { Txt } from './kit';
import { useTheme } from './theme';

const GRID = 23;

interface Slice {
  share: number;
  color: string;
}

/** A donut drawn on a pixel grid: every cell picks the slice its angle falls into. */
export function PixelDonut({ slices, size = 150, children }: { slices: Slice[]; size?: number; children?: ReactNode }) {
  const t = useTheme();
  const px = Math.max(2, Math.floor(size / GRID));

  const rows = useMemo(() => {
    const c = (GRID - 1) / 2;
    const stops: { until: number; color: string }[] = [];
    let acc = 0;
    for (const s of slices) {
      acc += s.share;
      stops.push({ until: acc, color: s.color });
    }
    const colorAt = (x: number, y: number): string | null => {
      const dx = x - c;
      const dy = y - c;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > c + 0.3 || r < c * 0.55) return null;
      if (!stops.length) return t.border;
      let turn = Math.atan2(dx, -dy) / (2 * Math.PI); // clockwise from 12 o'clock
      if (turn < 0) turn += 1;
      return (stops.find((s) => turn < s.until) ?? stops[stops.length - 1]).color;
    };
    const out: { color: string | null; len: number }[][] = [];
    for (let y = 0; y < GRID; y++) {
      const runs: { color: string | null; len: number }[] = [];
      for (let x = 0; x < GRID; x++) {
        const color = colorAt(x, y);
        const last = runs[runs.length - 1];
        if (last && last.color === color) last.len++;
        else runs.push({ color, len: 1 });
      }
      out.push(runs);
    }
    return out;
  }, [slices, t.border]);

  return (
    <View style={{ width: px * GRID, height: px * GRID }}>
      {rows.map((runs, y) => (
        <View key={y} style={{ flexDirection: 'row', height: px }}>
          {runs.map((r, i) => (
            <View key={i} style={{ width: r.len * px, height: px, backgroundColor: r.color ?? 'transparent' }} />
          ))}
        </View>
      ))}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

/** Income and expense columns side by side for each bucket. */
export function Bars({ points, height = 120 }: { points: SeriesPoint[]; height?: number }) {
  const t = useTheme();
  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.expense)));
  const labelEvery = Math.ceil(points.length / 7);
  const bar = (value: number, color: string) => (
    <View style={{ flex: 1, height: value > 0 ? Math.max(2, Math.round((value / max) * height)) : 0, backgroundColor: color }} />
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, borderBottomWidth: 2, borderColor: t.border, gap: points.length > 14 ? 1 : 4 }}>
        {points.map((p) => (
          <View key={p.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
            {bar(p.income, t.good)}
            {bar(p.expense, t.bad)}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4, gap: points.length > 14 ? 1 : 4 }}>
        {points.map((p, i) => (
          <View key={p.key} style={{ flex: 1, alignItems: 'center', overflow: 'visible' }}>
            {i % labelEvery === 0 ? (
              <Txt v="small" dim numberOfLines={1} style={{ fontSize: 10, width: 30, textAlign: 'center' }}>{p.label}</Txt>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, backgroundColor: it.color }} />
          <Txt v="small" style={{ flex: 1 }} numberOfLines={1}>{it.label}</Txt>
          {it.value ? <Txt v="small" dim>{it.value}</Txt> : null}
        </View>
      ))}
    </View>
  );
}
