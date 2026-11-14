import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { WEEKDAY_INITIALS, addDays, addMonths, clampStartDay, formatMonth, monthGrid, parts, relativeLabel, today } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { Button, Panel, Txt } from './kit';
import { Sprite } from './Sprite';
import { useTheme } from './theme';

interface CalendarProps {
  visible: boolean;
  value: ISODate;
  title?: string;
  /** Earliest date that can be picked. */
  min?: ISODate;
  onPick: (date: ISODate) => void;
  onClose: () => void;
}

/** A month-at-a-time calendar in a dialog. Tapping a day picks it and closes. */
export function CalendarPicker({ visible, value, title = 'Pick a date', min, onPick, onClose }: CalendarProps) {
  const t = useTheme();
  const now = today();
  // The month on show, tracked by any date inside it.
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (visible) setShown(value);
  }, [visible, value]);

  const { y, m } = parts(shown);
  const weeks = monthGrid(y, m);
  const move = (delta: number) => setShown(addMonths(`${shown.slice(0, 7)}-01`, delta));
  const pick = (date: ISODate) => {
    onPick(date);
    onClose();
  };

  const arrow = (label: string, a11y: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 2, borderColor: t.border }}>
      <Txt v="h" color={t.accent}>{label}</Txt>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Close calendar" style={{ flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', padding: 18 }}>
        <Pressable onPress={() => {}} accessible={false}>
          <Panel style={{ gap: 10, borderColor: t.borderLight }}>
            <Txt v="small" dim>{title}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {arrow('<', 'Previous month', () => move(-1))}
              <Txt v="title" style={{ flex: 1, textAlign: 'center', fontSize: 26 }}>{formatMonth(shown)}</Txt>
              {arrow('>', 'Next month', () => move(1))}
            </View>

            <View style={{ flexDirection: 'row' }}>
              {WEEKDAY_INITIALS.map((d) => (
                <Txt key={d} v="small" dim style={{ flex: 1, textAlign: 'center' }}>{d}</Txt>
              ))}
            </View>
            {weeks.map((week) => (
              <View key={week[0].date} style={{ flexDirection: 'row' }}>
                {week.map((cell) => {
                  const selected = cell.date === value;
                  const isToday = cell.date === now;
                  const disabled = min !== undefined && cell.date < min;
                  return (
                    <Pressable
                      key={cell.date}
                      onPress={() => pick(cell.date)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityLabel={relativeLabel(cell.date, now)}
                      style={{
                        flex: 1, height: 44, margin: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6,
                        borderWidth: 2, borderColor: selected ? t.accent : isToday ? t.borderLight : 'transparent',
                        backgroundColor: selected ? t.accent : 'transparent', opacity: disabled ? 0.25 : cell.inMonth ? 1 : 0.4,
                      }}
                    >
                      <Txt v="h" color={selected ? t.onAccent : t.text}>{cell.day}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancel" kind="ghost" style={{ flex: 1 }} onPress={onClose} />
              <Button label="Today" style={{ flex: 1 }} disabled={min !== undefined && now < min} onPress={() => pick(now)} />
            </View>
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface DateFieldProps {
  value: ISODate;
  onChange: (date: ISODate) => void;
  /** Shown above the calendar, e.g. "Target date". */
  title?: string;
  min?: ISODate;
  /** How the chosen date is written on the button. Defaults to "Today", "Yesterday" or the full date. */
  format?: (date: ISODate) => string;
}

/** "< date >" with the date opening a calendar: arrows for a day either way, the calendar for anything further. */
export function DateField({ value, onChange, title, min, format }: DateFieldProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const label = format ? format(value) : relativeLabel(value, today());
  const step = (delta: number) => {
    const next = addDays(value, delta);
    if (min === undefined || next >= min) onChange(next);
  };
  const arrow = (text: string, a11y: string, delta: number) => (
    <Pressable onPress={() => step(delta)} hitSlop={8} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Txt v="h" color={t.accent}>{text}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.panel, borderColor: t.border, borderWidth: 2, borderRadius: 8 }}>
      {arrow('<', 'Previous day', -1)}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Open calendar`}
        style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Sprite name="calendar" size={20} tint={t.accent} />
        <Txt v="h">{label}</Txt>
      </Pressable>
      {arrow('>', 'Next day', 1)}
      <CalendarPicker visible={open} value={value} title={title} min={min} onPick={onChange} onClose={() => setOpen(false)} />
    </View>
  );
}

/** A 1-31 grid for choosing a day of the month. 29-31 mean "or the last day, in shorter months". */
export function DayOfMonthPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  const t = useTheme();
  const picked = clampStartDay(value);
  const rows = [0, 1, 2, 3, 4].map((r) => Array.from({ length: 7 }, (_, c) => r * 7 + c + 1));
  return (
    <View style={{ backgroundColor: t.panel, borderColor: t.border, borderWidth: 2, borderRadius: 8, padding: 4 }}>
      {rows.map((row) => (
        <View key={row[0]} style={{ flexDirection: 'row' }}>
          {row.map((day) => {
            if (day > 31) return <View key={day} style={{ flex: 1, margin: 1 }} />;
            const selected = day === picked;
            return (
              <Pressable
                key={day}
                onPress={() => onChange(day)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={day === 31 ? 'Day 31, the last day of every month' : `Day ${day}`}
                style={{ flex: 1, height: 44, margin: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: selected ? t.accent : 'transparent' }}
              >
                <Txt v="h" color={selected ? t.onAccent : day > 28 ? t.info : t.text}>{day}</Txt>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
