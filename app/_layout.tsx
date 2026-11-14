import { Jersey25_400Regular } from '@expo-google-fonts/jersey-25';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from '../src/store/useStore';
import { DialogHost } from '../src/ui/dialog';
import { useTheme } from '../src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Jersey25_400Regular });
  const ready = useStore((s) => s.ready);
  const hydrate = useStore((s) => s.hydrate);
  const themeName = useStore((s) => s.settings.theme);
  const t = useTheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Coming back to the app on a later day: log anything that became due meanwhile.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useStore.getState().ready) useStore.getState().runRecurring();
    });
    return () => sub.remove();
  }, []);

  // A font that fails to load should not block the app: system fonts take over.
  const done = ready && (fontsLoaded || fontError != null);
  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);

  if (!done) return null;
  return (
    <>
      <StatusBar style={themeName === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
      <DialogHost />
    </>
  );
}
