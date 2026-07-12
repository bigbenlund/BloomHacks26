import { AppIcon } from '@/components/ui/themed-icon';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '@/config/firebase-app';
import { ThemedText } from '@/components/themed-text';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { Card } from '@/components/ui/card';
import { chargerData, type Charger } from '@/constants/chargers';
import { Brand, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useUserStations } from '@/hooks/use-user-stations';
import { useTheme } from '@/hooks/use-theme';
import { chargerFromDoc } from '@/lib/charger-doc';
import { customerChargerTitle, customerStatusLabel } from '@/lib/customer-copy';
import { formatVisitedLabel } from '@/lib/user-stations';

type StationRow = {
  id: string;
  name: string;
  subtitle: string;
  visitedLabel?: string;
};

function stationFromId(id: string, allChargers: Charger[], visitedAt?: number): StationRow | null {
  const charger = allChargers.find((item) => item.id === id);
  if (!charger) {
    return null;
  }
  return {
    id: charger.id,
    name: customerChargerTitle(charger),
    subtitle: charger.address ?? customerStatusLabel(charger.status),
    visitedLabel: visitedAt != null ? formatVisitedLabel(visitedAt) : undefined,
  };
}

/** Favorites tab — per-account saved stations + recently visited. */
export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { favoriteIds, recentVisits, isFavorite, addFavorite, removeFavorite, ready: stationsReady } =
    useUserStations();

  const [cloudChargers, setCloudChargers] = useState<Charger[]>([]);
  const [cloudReady, setCloudReady] = useState(false);

  // Subscribe to live chargers list in Firestore so dynamically loaded stations resolve correctly
  useEffect(() => {
    let cancelled = false;
    try {
      const chargersCol = collection(db, 'chargers');
      const unsubscribe = onSnapshot(chargersCol, (snapshot) => {
        if (cancelled) return;
        if (!snapshot.empty) {
          setCloudChargers(snapshot.docs.map((doc) => chargerFromDoc(doc.id, doc.data())));
        }
        setCloudReady(true);
      }, (err) => {
        console.error("Firestore loading failure inside explore:", err);
        setCloudReady(true);
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (err) {
      console.error("Failed to subscribe to Firestore in explore:", err);
      setCloudReady(true);
    }
  }, []);

  const allChargers = useMemo(() => {
    const combined = [...cloudChargers];
    chargerData.forEach((staticC) => {
      if (!combined.some((c) => c.id === staticC.id)) {
        combined.push(staticC);
      }
    });
    return combined;
  }, [cloudChargers]);

  const favorites = useMemo(() => {
    return favoriteIds
      .map((id) => stationFromId(id, allChargers))
      .filter((item): item is StationRow => item !== null);
  }, [favoriteIds, allChargers]);

  const recents = useMemo(() => {
    return recentVisits
      .map((visit) => stationFromId(visit.chargerId, allChargers, visit.visitedAt))
      .filter((item): item is StationRow => item !== null);
  }, [recentVisits, allChargers]);

  const ready = stationsReady && cloudReady;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.four,
          paddingBottom: BottomTabInset + insets.bottom + Spacing.five,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText type="title">Favorite stations</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Saved for your account — only you see these
          </ThemedText>
        </View>
        <ThemeModeToggle compact />
      </View>

      {!ready ? (
        <ActivityIndicator color={Brand.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.section}>
            <ThemedText type="subtitle">Favorites</ThemedText>
            {favorites.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  No favorites yet. Open a station on the map, or add one from your recently visited
                  list below.
                </ThemedText>
              </Card>
            ) : (
              <View style={styles.list}>
                {favorites.map((station) => (
                  <Card key={station.id} style={styles.stationCard}>
                    <View style={styles.stationRow}>
                      <View style={styles.stationText}>
                        <ThemedText type="smallBold">{station.name}</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          {station.subtitle}
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove from favorites"
                        onPress={() => removeFavorite(station.id)}
                        hitSlop={8}
                        style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
                        <AppIcon
                          name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                          size={18}
                          tintColor={Brand.primary}
                        />
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Recently visited</ThemedText>
            {recents.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Stations you get directions to will show up here for your account.
                </ThemedText>
              </Card>
            ) : (
              <View style={styles.list}>
                {recents.map((station) => {
                  const saved = isFavorite(station.id);

                  return (
                    <Card key={station.id} style={styles.stationCard}>
                      <View style={styles.stationRow}>
                        <View style={styles.stationText}>
                          <ThemedText type="smallBold">{station.name}</ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">
                            {station.visitedLabel}
                          </ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">
                            {station.subtitle}
                          </ThemedText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'}
                          onPress={() =>
                            saved ? removeFavorite(station.id) : addFavorite(station.id)
                          }
                          hitSlop={8}
                          style={[
                            styles.addFavoriteButton,
                            {
                              backgroundColor: saved
                                ? `${Brand.primary}18`
                                : theme.backgroundElement,
                            },
                          ]}>
                          <AppIcon
                            name={{
                              ios: saved ? 'heart.fill' : 'heart',
                              android: saved ? 'favorite' : 'favorite_border',
                              web: saved ? 'favorite' : 'favorite_border',
                            }}
                            size={16}
                            tintColor={saved ? Brand.primary : theme.textSecondary}
                          />
                          <ThemedText
                            type="caption"
                            style={{ color: saved ? Brand.primary : theme.textSecondary }}>
                            {saved ? 'Saved' : 'Add'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.five,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  emptyCard: {
    paddingVertical: Spacing.four,
  },
  stationCard: {
    gap: Spacing.one,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stationText: {
    flex: 1,
    gap: Spacing.half,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFavoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  loader: {
    marginTop: Spacing.five,
  },
});
