import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprite } from './Sprite';
import { FONT_BOLD, useTheme } from './theme';

/* ---------- Text ---------- */

// The pixel font is for big titles only: its digits (2, 3, 7, 8, 9) are too alike to read amounts in.
type Variant = 'title' | 'h' | 'body' | 'small' | 'num';
const TEXT: Record<Variant, TextStyle> = {
  title: { fontFamily: FONT_BOLD, fontSize: 22 },
  h: { fontWeight: '700', fontSize: 16 },
  body: { fontSize: 15 },
  small: { fontSize: 12.5 },
  num: { fontWeight: '800', fontSize: 28, fontVariant: ['tabular-nums'] },
};

interface TxtProps {
  v?: Variant;
  color?: string;
  dim?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: ReactNode;
}

export function Txt({ v = 'body', color, dim, style, numberOfLines, children }: TxtProps) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[TEXT[v], { color: color ?? (dim ? t.dim : t.text) }, style]}>
      {children}
    </Text>
  );
}

/* ---------- Layout ---------- */

export function Panel({ children, style, alt }: { children: ReactNode; style?: StyleProp<ViewStyle>; alt?: boolean }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: alt ? t.panelAlt : t.panel, borderColor: t.border, borderWidth: 2, borderBottomWidth: 4, borderRadius: 8, padding: 12 }, style]}>
      {children}
    </View>
  );
}

interface ScreenProps {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
}

export function Screen({ title, back, right, scroll = true, children }: ScreenProps) {
  const t = useTheme();
  const router = useRouter();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: 14, gap: 12 }}>{children}</View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
          {back ? (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
              <Txt v="title" color={t.accent}>{'<'}</Txt>
            </Pressable>
          ) : null}
          <Txt v="title" style={{ flex: 1 }}>{title}</Txt>
          {right}
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Controls ---------- */

interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  sprite?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, kind = 'primary', sprite, disabled, style }: ButtonProps) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? t.bad : t.panelAlt;
  const fg = kind === 'primary' ? t.onAccent : kind === 'danger' ? '#ffffff' : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          backgroundColor: bg, borderColor: kind === 'ghost' ? t.borderLight : '#00000055', borderWidth: 2, borderBottomWidth: pressed ? 2 : 5,
          marginTop: pressed ? 3 : 0, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14, minHeight: 48,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {sprite ? <Sprite name={sprite} size={20} tint={fg} /> : null}
      <Txt v="h" color={fg}>{label}</Txt>
    </Pressable>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  activeColor?: string;
}

export function Segmented<T extends string>({ value, options, onChange, activeColor }: SegmentedProps<T>) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.panel, borderColor: t.border, borderWidth: 2, borderRadius: 8, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: active ? activeColor ?? t.accent : 'transparent' }}
          >
            <Txt v="h" color={active ? t.onAccent : t.dim}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "< label >" switcher used for days, months and years. */
export function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const t = useTheme();
  const arrow = (text: string, onPress: () => void, a11y: string) => (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      <Txt v="h" color={t.accent}>{text}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.panel, borderColor: t.border, borderWidth: 2, borderRadius: 8 }}>
      {arrow('<', onPrev, 'Previous')}
      <Txt v="h" style={{ flex: 1, textAlign: 'center' }}>{label}</Txt>
      {arrow('>', onNext, 'Next')}
    </View>
  );
}

export function ProgressBar({ value, color, height = 12 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={{ height, backgroundColor: t.bg, borderColor: t.border, borderWidth: 2, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: `${clamped * 100}%`, flex: 1, backgroundColor: color ?? t.good }} />
    </View>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, style, ...input }: FieldProps) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt v="small" dim>{label}</Txt>
      <TextInput
        placeholderTextColor={t.dim}
        {...input}
        style={[{ fontSize: 16, color: t.text, backgroundColor: t.panel, borderColor: t.border, borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, minHeight: 48 }, style]}
      />
    </View>
  );
}

interface RowProps {
  sprite?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function Row({ sprite, title, subtitle, right, onPress, onLongPress }: RowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 52, opacity: pressed ? 0.6 : 1 })}
    >
      {sprite ? <Sprite name={sprite} size={30} tint={t.accent} /> : null}
      <View style={{ flex: 1 }}>
        <Txt v="h" numberOfLines={1}>{title}</Txt>
        {subtitle ? <Txt v="small" dim numberOfLines={1}>{subtitle}</Txt> : null}
      </View>
      {right}
    </Pressable>
  );
}

/* ---------- Amount prompt ---------- */

interface AmountPromptProps {
  visible: boolean;
  title: string;
  hint?: string;
  initial?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}

export function AmountPrompt({ visible, title, hint, initial = '', confirmLabel = 'Save', onCancel, onSubmit }: AmountPromptProps) {
  const t = useTheme();
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 24 }}>
        <Panel style={{ gap: 12 }}>
          <Txt v="h">{title}</Txt>
          {hint ? <Txt v="small" dim>{hint}</Txt> : null}
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            autoFocus
            placeholder="0"
            placeholderTextColor={t.dim}
            style={{ fontWeight: '800', fontSize: 26, color: t.text, backgroundColor: t.bg, borderColor: t.border, borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, minHeight: 56 }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Cancel" kind="ghost" onPress={onCancel} style={{ flex: 1 }} />
            <Button label={confirmLabel} onPress={() => onSubmit(text)} style={{ flex: 1 }} />
          </View>
        </Panel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Small coloured label, e.g. "LV 3" or "On track". */
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '33', borderColor: color, borderWidth: 2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Txt v="small" color={color}>{label}</Txt>
    </View>
  );
}
