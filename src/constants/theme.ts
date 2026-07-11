/**
 * EcoShield design tokens — clean, Lyft-inspired UI system.
 */

import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const Brand = {
  primary: '#FF00BF',
  primaryDark: '#D900A3',
  purple: '#352383',
  purpleLight: '#5B4BB4',
  success: '#00B89C',
  mapTint: '#E8EDF2',
  mapTintDark: '#1A1D21',
} as const;

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    backgroundElement: '#F3F3F5',
    backgroundSelected: '#EBEBEF',
    textSecondary: '#6B6B76',
    border: '#E4E4EA',
    primary: Brand.primary,
    primaryText: '#FFFFFF',
    card: '#FFFFFF',
    map: Brand.mapTint,
  },
  dark: {
    text: '#FFFFFF',
    background: '#0F0F12',
    backgroundElement: '#1C1C22',
    backgroundSelected: '#2A2A32',
    textSecondary: '#9B9BA8',
    border: '#2E2E38',
    primary: Brand.primary,
    primaryText: '#FFFFFF',
    card: '#1C1C22',
    map: Brand.mapTintDark,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Shadow = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: {
    elevation: 6,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  web: {
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  } as ViewStyle,
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 480;
/** Wider content width for the web dashboard shell. */
export const WebContentWidth = 1120;
export const WebHeaderHeight = 64;
