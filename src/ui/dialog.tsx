import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { create } from 'zustand';
import { Button, Panel, Txt } from './kit';
import { Sprite } from './Sprite';
import { useTheme } from './theme';

/**
 * In-app replacement for the system alert, drawn in the app's theme.
 * Call `confirm` or `notify` from anywhere; <DialogHost /> in the root layout shows it.
 */
interface DialogAction {
  label: string;
  kind?: 'primary' | 'ghost' | 'danger';
  onPress?: () => void;
}

interface Dialog {
  title: string;
  message?: string;
  sprite?: string;
  actions: DialogAction[];
}

const useDialog = create<{ current: Dialog | null }>()(() => ({ current: null }));

export const showDialog = (dialog: Dialog) => useDialog.setState({ current: dialog });
const hide = () => useDialog.setState({ current: null });

/** Asks before doing something. `kind` colours the action button: danger for deletes. */
export function confirm(title: string, message: string, actionLabel: string, run: () => void, kind: 'primary' | 'danger' = 'danger') {
  showDialog({ title, message, sprite: kind === 'danger' ? 'flame' : 'star', actions: [{ label: 'Cancel', kind: 'ghost' }, { label: actionLabel, kind, onPress: run }] });
}

/** Tells the user something and waits for OK. */
export function notify(title: string, message: string) {
  showDialog({ title, message, sprite: 'coin', actions: [{ label: 'OK' }] });
}

export function DialogHost() {
  const t = useTheme();
  const dialog = useDialog((s) => s.current);
  return (
    <Modal visible={dialog !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={hide}>
      {/* Tapping outside cancels, the same as the back button. */}
      <Pressable onPress={hide} accessibilityLabel="Close dialog" style={{ flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={() => {}} accessible={false}>
          <Panel style={{ gap: 12, borderColor: t.borderLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {dialog?.sprite ? <Sprite name={dialog.sprite} size={30} /> : null}
              <Txt v="title" style={{ flex: 1, fontSize: 24 }}>{dialog?.title}</Txt>
            </View>
            {dialog?.message ? <Txt dim>{dialog.message}</Txt> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              {dialog?.actions.map((action) => (
                <Button
                  key={action.label}
                  label={action.label}
                  kind={action.kind ?? 'primary'}
                  style={{ flex: 1 }}
                  onPress={() => {
                    hide();
                    action.onPress?.();
                  }}
                />
              ))}
            </View>
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
