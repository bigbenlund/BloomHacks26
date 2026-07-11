import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

export type RecentVisit = {
  chargerId: string;
  visitedAt: number;
};

export type UserStations = {
  favoriteIds: string[];
  recentVisits: RecentVisit[];
};

const MAX_RECENTS = 12;

export function emptyUserStations(): UserStations {
  return { favoriteIds: [], recentVisits: [] };
}

export function userStationsDocPath(uid: string) {
  return `users/${uid}`;
}

export async function loadUserStations(db: Firestore, uid: string): Promise<UserStations> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) {
    return emptyUserStations();
  }

  const data = snap.data();
  const favoriteIds = Array.isArray(data.favoriteIds)
    ? data.favoriteIds.filter((id): id is string => typeof id === 'string')
    : [];
  const recentVisits = Array.isArray(data.recentVisits)
    ? data.recentVisits
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const visit = item as { chargerId?: unknown; visitedAt?: unknown };
          if (typeof visit.chargerId !== 'string' || typeof visit.visitedAt !== 'number') {
            return null;
          }
          return { chargerId: visit.chargerId, visitedAt: visit.visitedAt };
        })
        .filter((item): item is RecentVisit => item !== null)
    : [];

  return { favoriteIds, recentVisits };
}

export async function saveUserStations(
  db: Firestore,
  uid: string,
  stations: UserStations,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      favoriteIds: stations.favoriteIds,
      recentVisits: stations.recentVisits.slice(0, MAX_RECENTS),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export function withFavoriteAdded(stations: UserStations, chargerId: string): UserStations {
  if (stations.favoriteIds.includes(chargerId)) {
    return stations;
  }
  return {
    ...stations,
    favoriteIds: [...stations.favoriteIds, chargerId],
  };
}

export function withFavoriteRemoved(stations: UserStations, chargerId: string): UserStations {
  return {
    ...stations,
    favoriteIds: stations.favoriteIds.filter((id) => id !== chargerId),
  };
}

export function withRecentVisit(stations: UserStations, chargerId: string): UserStations {
  const visitedAt = Date.now();
  const withoutCurrent = stations.recentVisits.filter((visit) => visit.chargerId !== chargerId);
  return {
    ...stations,
    recentVisits: [{ chargerId, visitedAt }, ...withoutCurrent].slice(0, MAX_RECENTS),
  };
}

export function formatVisitedLabel(visitedAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - visitedAt);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  return new Date(visitedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
