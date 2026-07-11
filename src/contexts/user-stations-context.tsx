import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { db } from '@/config/firebase-app';
import { useAuth } from '@/contexts/auth-context';
import {
  emptyUserStations,
  loadUserStations,
  saveUserStations,
  withFavoriteAdded,
  withFavoriteRemoved,
  withRecentVisit,
  type RecentVisit,
  type UserStations,
} from '@/lib/user-stations';

type UserStationsContextValue = {
  favoriteIds: string[];
  recentVisits: RecentVisit[];
  ready: boolean;
  isFavorite: (id: string) => boolean;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  recordVisit: (id: string) => void;
};

const UserStationsContext = createContext<UserStationsContextValue | null>(null);

function cacheKey(uid: string) {
  return `ecoshield-user-stations:${uid}`;
}

async function readCache(uid: string): Promise<UserStations | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as UserStations;
    if (!parsed || !Array.isArray(parsed.favoriteIds) || !Array.isArray(parsed.recentVisits)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(uid: string, stations: UserStations) {
  try {
    await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(stations));
  } catch {
    // Ignore cache write failures
  }
}

export function UserStationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stations, setStations] = useState<UserStations>(emptyUserStations());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setStations(emptyUserStations());
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    (async () => {
      const cached = await readCache(user.uid);
      if (!cancelled && cached) {
        setStations(cached);
      }

      try {
        const remote = await loadUserStations(db, user.uid);
        if (cancelled) {
          return;
        }
        setStations(remote);
        await writeCache(user.uid, remote);
      } catch {
        if (!cancelled && !cached) {
          setStations(emptyUserStations());
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = useCallback(
    (updater: (current: UserStations) => UserStations) => {
      setStations((current) => {
        const next = updater(current);
        if (user) {
          void writeCache(user.uid, next);
          void saveUserStations(db, user.uid, next).catch(() => {
            // Local cache still keeps this account personalized on this device
          });
        }
        return next;
      });
    },
    [user],
  );

  const value = useMemo<UserStationsContextValue>(
    () => ({
      favoriteIds: stations.favoriteIds,
      recentVisits: stations.recentVisits,
      ready,
      isFavorite: (id: string) => stations.favoriteIds.includes(id),
      addFavorite: (id: string) => persist((current) => withFavoriteAdded(current, id)),
      removeFavorite: (id: string) => persist((current) => withFavoriteRemoved(current, id)),
      recordVisit: (id: string) => persist((current) => withRecentVisit(current, id)),
    }),
    [stations, ready, persist],
  );

  return (
    <UserStationsContext.Provider value={value}>{children}</UserStationsContext.Provider>
  );
}

export function useUserStations() {
  const context = useContext(UserStationsContext);
  if (!context) {
    throw new Error('useUserStations must be used within UserStationsProvider');
  }
  return context;
}
