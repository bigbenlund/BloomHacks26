import * as Location from 'expo-location';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { MapCoordinate } from '@/components/secure-route-map/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import {
  loadLocationPreference,
  saveLocationPreference,
  type LocationPreference,
} from '@/lib/location-preference';

type LocationContextValue = {
  location: MapCoordinate | null;
  error: string | null;
  loading: boolean;
  preference: LocationPreference;
  refresh: () => void;
  requestLocationAccess: () => Promise<boolean>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

function readBrowserLocation(): Promise<MapCoordinate> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geoError) => {
        reject(new Error(geoError.message || 'Location permission denied.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
}

async function readNativeLocation(): Promise<MapCoordinate> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
}

async function fetchCurrentLocation(): Promise<MapCoordinate> {
  return Platform.OS === 'web' ? readBrowserLocation() : readNativeLocation();
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const theme = useTheme();

  const [location, setLocation] = useState<MapCoordinate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preference, setPreference] = useState<LocationPreference>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  const requestLocationAccess = useCallback(async () => {
    if (!user) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const next = await fetchCurrentLocation();
      setLocation(next);
      setPreference('enabled');
      await saveLocationPreference(user.uid, 'enabled');
      setPromptVisible(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get your location.');
      setLocation(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // On each sign-in: auto-enable if saved, otherwise prompt
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLocation(null);
      setError(null);
      setPromptVisible(false);
      setReady(false);

      if (!user) {
        setPreference(null);
        setReady(true);
        return;
      }

      const saved = await loadLocationPreference(user.uid);
      if (cancelled) {
        return;
      }

      setPreference(saved);

      if (saved === 'enabled') {
        setReady(true);
        setLoading(true);
        try {
          const next = await fetchCurrentLocation();
          if (!cancelled) {
            setLocation(next);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not get your location.');
            setPromptVisible(true);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
        return;
      }

      setPromptVisible(true);
      setReady(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || preference !== 'enabled' || tick === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchCurrentLocation();
        if (!cancelled) {
          setLocation(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not get your location.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, user, preference]);

  async function handleEnable() {
    await requestLocationAccess();
  }

  function handleSkip() {
    // Don't persist skip — they'll be prompted again next sign-in
    setPromptVisible(false);
  }

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      error,
      loading: loading || !ready,
      preference,
      refresh,
      requestLocationAccess,
    }),
    [location, error, loading, ready, preference, refresh, requestLocationAccess],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}

      <Modal
        visible={Boolean(user) && promptVisible}
        transparent
        animationType="fade"
        onRequestClose={handleSkip}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText type="subtitle">Enable location</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              EcoShield uses your location to find safe charging stations near you. Once enabled,
              we’ll turn it on automatically next time you sign in.
            </ThemedText>

            <Button
              label={loading ? 'Requesting…' : 'Enable location'}
              disabled={loading}
              onPress={() => {
                void handleEnable();
              }}
            />
            <Pressable accessibilityRole="button" onPress={handleSkip} style={styles.skip}>
              <ThemedText type="small" themeColor="textSecondary">
                Not now
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LocationContext.Provider>
  );
}

export function useUserLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within LocationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
