/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0b0f19',
    background: '#f8fafc',
    backgroundElement: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#64748b',
    cyberGreen: '#10b981',
    cyberRed: '#ef4444',
    cyberOrange: '#f59e0b',
    cyberBlue: '#3b82f6',
    neonCyan: '#06b6d4',
    cardBorder: 'rgba(226, 232, 240, 0.8)',
    cardBg: '#ffffff',
    cardBgGlass: 'rgba(255, 255, 255, 0.7)',
  },
  dark: {
    text: '#f8fafc',
    background: '#090d16',
    backgroundElement: '#131924',
    backgroundSelected: '#1e293b',
    textSecondary: '#94a3b8',
    cyberGreen: '#10b981',
    cyberRed: '#ef4444',
    cyberOrange: '#f59e0b',
    cyberBlue: '#3b82f6',
    neonCyan: '#06b6d4',
    cardBorder: 'rgba(30, 41, 59, 0.5)',
    cardBg: '#0f172a',
    cardBgGlass: 'rgba(15, 23, 42, 0.75)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
