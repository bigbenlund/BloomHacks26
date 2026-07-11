import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ColorSchemeProvider, useColorScheme } from '@/contexts/color-scheme-context';
import { Brand, Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.primary,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Brand.primary,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : LightTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ColorSchemeProvider>
      <RootLayoutContent />
    </ColorSchemeProvider>
  );
}
