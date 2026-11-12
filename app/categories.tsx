import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_SPRITES, MAX_CATEGORY_NAME, archivedCategories, canArchive, nameProblem } from '../src/domain/categories';
import type { Category } from '../src/domain/categories';
import type { TxType } from '../src/domain/types';
import { useStore } from '../src/store/useStore';
import { useCategories } from '../src/ui/hooks';
import { Button, Field, Panel, Screen, Segmented, Txt } from '../src/ui/kit';
import { Sprite } from '../src/ui/Sprite';
import { useTheme } from '../src/ui/theme';

/** What the editor at the top of the screen is working on. `id` is absent for a new category. */
interface Draft {
  id?: string;
  name: string;
  sprite: string;
  color: string;
}

const NEW_DRAFT: Draft = { name: '', sprite: CATEGORY_SPRITES[0], color: CATEGORY_COLORS[0] };

export default function Categories() {
  const t = useTheme();
  const { all, forType } = useCategories();
  const saveCategory = useStore((s) => s.saveCategory);
  const moveCategory = useStore((s) => s.moveCategory);
  const [type, setType] = useState<TxType>('expense');
  const [draft, setDraft] = useState<Draft | null>(null);

  const visible = forType(type);
  const archived = archivedCategories(all).filter((c) => c.type === type);
  const problem = draft ? nameProblem(all, draft.name, type, draft.id) : null;

  const save = () => {
    if (!draft || problem) return;
    saveCategory({ id: draft.id, name: draft.name.trim(), sprite: draft.sprite, color: draft.color, type });
    setDraft(null);
  };

  const setArchived = (category: Category, value: boolean) => {
    saveCategory({ ...category, archived: value });
    if (draft?.id === category.id) setDraft(null);
  };

  const swatch = (selected: boolean) => ({
    width: 48, height: 48, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 8,
    borderWidth: 2, borderColor: selected ? t.accent : t.border, backgroundColor: t.panel,
  });

  const arrow = (label: string, a11y: string, disabled: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 2, borderColor: t.border, opacity: disabled ? 0.3 : 1 }}
    >
      <Txt v="h" color={t.accent}>{label}</Txt>
    </Pressable>
  );

  return (
    <Screen title="Categories" back>
      <Segmented
        value={type}
        onChange={(next) => {
          setType(next);
          setDraft(null);
        }}
        options={[{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]}
      />

      {draft ? (
        <Panel alt style={{ gap: 10 }}>
          <Txt v="h">{draft.id ? 'Edit category' : `New ${type} category`}</Txt>
          <Field label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Pets, Gym, Freelance..." maxLength={MAX_CATEGORY_NAME} autoFocus={!draft.id} />
          {problem && draft.name.length > 0 ? <Txt v="small" color={t.bad}>{problem}</Txt> : null}

          <Txt v="small" dim>Icon</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_SPRITES.map((sprite) => (
              <Pressable
                key={sprite}
                onPress={() => setDraft({ ...draft, sprite })}
                accessibilityRole="button"
                accessibilityState={{ selected: sprite === draft.sprite }}
                accessibilityLabel={`Icon ${sprite}`}
                style={swatch(sprite === draft.sprite)}
              >
                <Sprite name={sprite} size={30} />
              </Pressable>
            ))}
          </View>

          <Txt v="small" dim>Chart colour</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setDraft({ ...draft, color })}
                accessibilityRole="button"
                accessibilityState={{ selected: color === draft.color }}
                accessibilityLabel={`Colour ${color}`}
                style={swatch(color === draft.color)}
              >
                <View style={{ width: 26, height: 26, borderRadius: 4, backgroundColor: color }} />
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Cancel" kind="ghost" style={{ flex: 1 }} onPress={() => setDraft(null)} />
            <Button label={draft.id ? 'Save' : 'Add'} style={{ flex: 1 }} disabled={problem !== null} onPress={save} />
          </View>
        </Panel>
      ) : (
        <Button label="New category" sprite="plus" onPress={() => setDraft(NEW_DRAFT)} />
      )}

      {visible.map((cat, i) => (
        <Panel key={cat.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Sprite name={cat.sprite} size={30} />
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: cat.color }} />
            <Txt v="h" style={{ flex: 1 }} numberOfLines={1}>{cat.name}</Txt>
            {arrow('^', `Move ${cat.name} up`, i === 0, () => moveCategory(cat.id, -1))}
            {arrow('v', `Move ${cat.name} down`, i === visible.length - 1, () => moveCategory(cat.id, 1))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Edit" kind="ghost" style={{ flex: 1 }} onPress={() => setDraft({ id: cat.id, name: cat.name, sprite: cat.sprite, color: cat.color })} />
            {canArchive(cat) ? <Button label="Archive" kind="ghost" style={{ flex: 1 }} onPress={() => setArchived(cat, true)} /> : null}
          </View>
        </Panel>
      ))}

      {archived.length > 0 ? <Txt v="h">Archived</Txt> : null}
      {archived.map((cat) => (
        <Panel key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.8 }}>
          <Sprite name={cat.sprite} size={30} />
          <Txt v="h" dim style={{ flex: 1 }} numberOfLines={1}>{cat.name}</Txt>
          <Button label="Restore" kind="ghost" onPress={() => setArchived(cat, false)} />
        </Panel>
      ))}

      <Txt v="small" dim style={{ textAlign: 'center' }}>
        Archived categories stay on your old transactions and in your charts. They only leave the list you pick from.
      </Txt>
    </Screen>
  );
}
