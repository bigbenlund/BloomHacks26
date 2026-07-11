import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { MapFloatingControls } from '@/components/map-floating-controls';
import { MapQuickChip } from '@/components/map-search-bar';
import { SecureRouteMap } from '@/components/secure-route-map/secure-route-map';
import type { MapCoordinate } from '@/components/secure-route-map/types';
import { ThemedText } from '@/components/themed-text';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { DEFAULT_MAP_CENTER } from '@/constants/map';
import { BottomTabInset, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';

const SAVED_PLACES = ['Home', 'Work', 'Campus', 'Hospital'];

/**
 * Mobile user app — Lyft-style map + "Where to?" bottom sheet.
 * Not a dashboard.
 */
export default function UserHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const userLocation = useUserLocation();
  const [destinationQuery, setDestinationQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<MapCoordinate>(DEFAULT_MAP_CENTER);
  const [destination, setDestination] = useState<MapCoordinate | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<string | null>(null);

  const bottomInset = BottomTabInset + insets.bottom;

  function handleRecenter() {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }

  function handleSavedPlace(label: string) {
    setDestinationQuery(label);
    setDestinationLabel(label);
    setDestination(mapCenter);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.map }]}>
      <SecureRouteMap
        style={StyleSheet.absoluteFill}
        center={mapCenter}
        userLocation={userLocation}
        destination={destination}
        onMapPress={(coordinate) => {
          setMapCenter(coordinate);
          setDestination(coordinate);
          setDestinationLabel(destinationQuery || 'Pinned location');
        }}
        onRecenter={handleRecenter}
      />

      {/* Lyft-style floating profile + theme (top left / right) */}
      <View
        pointerEvents="box-none"
        style={[styles.topBar, { top: insets.top + Spacing.two }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          style={[styles.profileButton, Shadow, { backgroundColor: theme.card }]}>
          <ThemedText type="smallBold">AJ</ThemedText>
        </Pressable>
        <ThemeModeToggle compact />
      </View>

      <MapFloatingControls
        onRecenter={handleRecenter}
        style={{ bottom: bottomInset + 280 }}
      />

      {/* Lyft-style bottom sheet: Where to? */}
      <View
        pointerEvents="box-none"
        style={[styles.sheetAnchor, { paddingBottom: bottomInset }]}>
        <View style={styles.sheetWidth}>
          <BottomSheet>
            <ThemedText type="heading">Where to?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Plan a safer route with real-time security insights.
            </ThemedText>

            <InputField
              icon="search"
              placeholder="Enter destination"
              value={destinationQuery}
              onChangeText={setDestinationQuery}
              accessibilityLabel="Enter destination"
            />

            <View style={styles.chipsRow}>
              {SAVED_PLACES.map((place) => (
                <MapQuickChip
                  key={place}
                  label={place}
                  onPress={() => handleSavedPlace(place)}
                />
              ))}
            </View>

            <Button
              label={destinationLabel ? `Go to ${destinationLabel}` : 'Get secure route'}
              disabled={!destinationLabel && !destinationQuery}
            />

            <View style={[styles.recentRow, { borderTopColor: theme.border }]}>
              <ThemedText type="smallBold">Recent</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Downtown → Midtown · 18 min · Low risk
              </ThemedText>
            </View>
          </BottomSheet>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  sheetWidth: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  recentRow: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
