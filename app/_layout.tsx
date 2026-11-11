import { PixelifySans_400Regular, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useStore } from '../src/store/useStore';
import { useTheme } from '../src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PixelifySans_400Regular, PixelifySans_700Bold });
  const ready = useStore((s) => s.ready);
  const hydrate = useStore((s) => s.hydrate);
  const themeName = useStore((s) => s.settings.theme);
  const t = useTheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
    </>
  );
}
