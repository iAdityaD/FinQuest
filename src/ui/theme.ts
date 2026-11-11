import { useStore } from '../store/useStore';
import type { ThemeName } from '../domain/types';

export interface Theme {
  name: string;
  bg: string;
  panel: string;
  panelAlt: string;
  border: string;
  borderLight: string;
  text: string;
  dim: string;
  accent: string;
  onAccent: string;
  good: string;
  bad: string;
  info: string;
  sky: [string, string, string];
  hillFar: string;
  hillNear: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'Pixel Dark',
    bg: '#0f0b1e', panel: '#1a1433', panelAlt: '#241c47', border: '#3b2f6b', borderLight: '#5a4a9c',
    text: '#f4efff', dim: '#a79fc9', accent: '#ffcf7a', onAccent: '#2a1a05',
    good: '#4cd964', bad: '#ff5a6e', info: '#4aa8ff',
    sky: ['#2a1b5c', '#4b2a7a', '#8a3f7d'], hillFar: '#2c2057', hillNear: '#17102e',
  },
  light: {
    name: 'Pixel Light',
    bg: '#f3ead8', panel: '#fff8ea', panelAlt: '#f0e2c4', border: '#c9ab7a', borderLight: '#a3824f',
    text: '#33240f', dim: '#7c6a4d', accent: '#e8792f', onAccent: '#ffffff',
    good: '#2e9e4f', bad: '#d43d51', info: '#2f7fd1',
    sky: ['#8fd3ff', '#bfe6ff', '#ffe2b0'], hillFar: '#9cc98a', hillNear: '#5f9e5a',
  },
  green: {
    name: 'Retro Green',
    bg: '#0b1a0f', panel: '#12281a', panelAlt: '#1a3824', border: '#2f6b3f', borderLight: '#4c9c5f',
    text: '#d8ffd8', dim: '#86b892', accent: '#b6ff5c', onAccent: '#0b1a0f',
    good: '#6dff8a', bad: '#ff7a6b', info: '#6be0ff',
    sky: ['#0f2b1a', '#1b4a2b', '#2f6b3f'], hillFar: '#16361f', hillNear: '#0b1a0f',
  },
};

export const FONT = 'PixelifySans_400Regular';
export const FONT_BOLD = 'PixelifySans_700Bold';

export const useTheme = (): Theme => THEMES[useStore((s) => s.settings.theme)] ?? THEMES.dark;
