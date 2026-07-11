import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ecoshield-color-scheme';

export async function loadColorSchemePreference(): Promise<ColorSchemePreference | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch {
    // Ignore read errors and fall back to system preference.
  }
  return null;
}

export async function saveColorSchemePreference(preference: ColorSchemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Ignore write errors; preference still applies for the session.
  }
}
