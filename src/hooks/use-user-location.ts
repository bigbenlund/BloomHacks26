import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

import type { MapCoordinate } from '@/components/secure-route-map/types';

type UserLocationState = {
  location: MapCoordinate | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

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
      (error) => {
        reject(new Error(error.message || 'Location permission denied.'));
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

export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<MapCoordinate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLocation() {
      setLoading(true);
      setError(null);

      try {
        const next =
          Platform.OS === 'web' ? await readBrowserLocation() : await readNativeLocation();

        if (!active) {
          return;
        }

        setLocation(next);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Could not get your location.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLocation();

    return () => {
      active = false;
    };
  }, [tick]);

  return { location, error, loading, refresh };
}
