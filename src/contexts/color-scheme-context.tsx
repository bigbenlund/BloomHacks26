import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, useColorScheme as useRNColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import {
  loadColorSchemePreference,
  saveColorSchemePreference,
  type ColorSchemePreference,
} from '@/lib/theme-storage';

type AppColorScheme = 'light' | 'dark';

type ColorSchemeContextValue = {
  colorScheme: AppColorScheme;
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => void;
  isReady: boolean;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

function resolveColorScheme(
  preference: ColorSchemePreference,
  systemScheme: ReturnType<typeof useRNColorScheme>,
): AppColorScheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [preference, setPreferenceState] = useState<ColorSchemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadColorSchemePreference().then((stored) => {
      if (stored) {
        setPreferenceState(stored);
      }
      setIsReady(true);
    });
  }, []);

  const colorScheme = resolveColorScheme(preference, systemScheme);

  const setPreference = useCallback((next: ColorSchemePreference) => {
    setPreferenceState(next);
    void saveColorSchemePreference(next);
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(Colors[colorScheme].background);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = colorScheme;
      document.body.style.backgroundColor = Colors[colorScheme].background;
    }
  }, [colorScheme]);

  const value = useMemo(
    () => ({
      colorScheme,
      preference,
      setPreference,
      isReady,
    }),
    [colorScheme, preference, setPreference, isReady],
  );

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}

export function useColorSchemeContext() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorSchemeContext must be used within ColorSchemeProvider');
  }
  return context;
}

export function useColorScheme() {
  return useColorSchemeContext().colorScheme;
}

export function useColorSchemePreference() {
  const { preference, setPreference } = useColorSchemeContext();
  return { preference, setPreference };
}
