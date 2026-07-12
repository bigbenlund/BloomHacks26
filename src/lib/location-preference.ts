import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocationPreference = 'enabled' | null;

function storageKey(uid: string) {
  return `ecoshield-location-preference:${uid}`;
}

export async function loadLocationPreference(uid: string): Promise<LocationPreference> {
  try {
    const value = await AsyncStorage.getItem(storageKey(uid));
    if (value === 'enabled') {
      return 'enabled';
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export async function saveLocationPreference(uid: string, preference: 'enabled'): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(uid), preference);
  } catch {
    // Ignore write errors
  }
}
