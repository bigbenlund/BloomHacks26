import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ColorSchemeProvider, useColorScheme } from '@/contexts/color-scheme-context';
import { SettingsNavProvider, useSettingsNav } from '@/contexts/settings-nav-context';
import { UserStationsProvider } from '@/contexts/user-stations-context';
import { Brand, Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SettingsScreen } from '@/components/settings-screen';
import { LoginScreen } from '@/components/login-screen';
import AppTabs from '@/components/app-tabs';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

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

function AppGate() {
  const { user, loading } = useAuth();
  const { isSettingsOpen } = useSettingsNav();
  const theme = useTheme();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <UserStationsProvider>
      {isSettingsOpen ? <SettingsScreen /> : <AppTabs />}
    </UserStationsProvider>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : LightTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <SettingsNavProvider>
        <AppGate />
      </SettingsNavProvider>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ColorSchemeProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </ColorSchemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
