import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useStore } from '../../src/store/useStore';
import { Sprite } from '../../src/ui/Sprite';
import { FONT_BOLD, useTheme } from '../../src/ui/theme';

const TABS = [
  { name: 'index', title: 'Home', sprite: 'home' },
  { name: 'transactions', title: 'Transactions', sprite: 'list' },
  { name: 'analytics', title: 'Analytics', sprite: 'chart' },
  { name: 'budget', title: 'Budget', sprite: 'wallet' },
  { name: 'more', title: 'More', sprite: 'menu' },
];

export default function TabsLayout() {
  const t = useTheme();
  const onboarded = useStore((s) => s.settings.onboarded);
  // First launch: show the welcome screen before the tabs.
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.dim,
        tabBarStyle: { backgroundColor: t.panel, borderTopColor: t.border, borderTopWidth: 2 },
        tabBarLabelStyle: { fontFamily: FONT_BOLD, fontSize: 10 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title, tabBarIcon: ({ color }) => <Sprite name={tab.sprite} size={20} tint={color} /> }}
        />
      ))}
    </Tabs>
  );
}
