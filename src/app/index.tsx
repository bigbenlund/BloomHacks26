import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { BrandLogo } from '@/components/brand-logo';
import { MapFloatingControls } from '@/components/map-floating-controls';
import { SecureRouteMap } from '@/components/secure-route-map/secure-route-map';
import type { MapCoordinate } from '@/components/secure-route-map/types';
import { ThemedText } from '@/components/themed-text';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { Button } from '@/components/ui/button';
import { chargerData, type Charger } from '@/constants/chargers';
import { DEFAULT_MAP_CENTER } from '@/constants/map';
import { BottomTabInset, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSettingsNav } from '@/contexts/settings-nav-context';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { useUserStations } from '@/hooks/use-user-stations';
import { chargersNearLocation } from '@/lib/chargers-on-map';
import {
  customerChargerSummary,
  customerChargerTitle,
  customerStatusColor,
  customerStatusLabel,
} from '@/lib/customer-copy';
import { buildHomeGreeting } from '@/lib/home-greetings';

function distanceMeters(a: MapCoordinate, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Mobile user app — map + find safe charging station.
 */
export default function UserHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { openSettings } = useSettingsNav();
  const { recordVisit } = useUserStations();
  const { location: userLocation, error: locationError, refresh } = useUserLocation();
  const greeting = useMemo(
    () => buildHomeGreeting(user?.displayName),
    [user?.displayName],
  );
  const profileInitials = useMemo(() => {
    const parts = user?.displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    if (parts[0]) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() ?? 'ES';
  }, [user?.displayName, user?.email]);
  const [mapCenter, setMapCenter] = useState<MapCoordinate>(DEFAULT_MAP_CENTER);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const [destination, setDestination] = useState<MapCoordinate | null>(null);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [chargerAnchor, setChargerAnchor] = useState<MapCoordinate>(DEFAULT_MAP_CENTER);
  const [isSearching, setIsSearching] = useState(false);

  const bottomInset = BottomTabInset + insets.bottom;

  const chargers = useMemo(
    () => chargersNearLocation(chargerAnchor, chargerData).filter((c) => c.status === 'SAFE'),
    [chargerAnchor],
  );

  useEffect(() => {
    if (userLocation && !hasCenteredOnUser) {
      setMapCenter(userLocation);
      setChargerAnchor(userLocation);
      setHasCenteredOnUser(true);
    }
  }, [userLocation, hasCenteredOnUser]);

  function handleRecenter() {
    refresh();
    if (userLocation) {
      setMapCenter({ ...userLocation });
      setChargerAnchor(userLocation);
      setHasCenteredOnUser(true);
    }
  }

  function handleSelectCharger(charger: Charger) {
    setSelectedCharger(charger);
    setDestination({
      latitude: charger.location.lat,
      longitude: charger.location.lng,
    });
    setMapCenter({
      latitude: charger.location.lat,
      longitude: charger.location.lng,
    });
    recordVisit(charger.id);
  }

  function findSafeChargingStation() {
    setIsSearching(true);
    const origin = userLocation ?? mapCenter;

    const nearest = [...chargers].sort(
      (a, b) => distanceMeters(origin, a.location) - distanceMeters(origin, b.location),
    )[0];

    // Brief pause so the button feels like it “searched”
    setTimeout(() => {
      if (nearest) {
        handleSelectCharger(nearest);
      }
      setIsSearching(false);
    }, 450);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.map }]}>
      <SecureRouteMap
        style={StyleSheet.absoluteFill}
        center={mapCenter}
        userLocation={userLocation}
        destination={destination}
        chargers={chargers}
        selectedChargerId={selectedCharger?.id ?? null}
        onSelectCharger={handleSelectCharger}
        onMapPress={() => {
          setSelectedCharger(null);
          setDestination(null);
        }}
        onRecenter={handleRecenter}
      />

      <View
        pointerEvents="box-none"
        style={[styles.topBar, { top: insets.top + Spacing.two }]}>
        <View style={[styles.brandChip, Shadow, { backgroundColor: theme.card }]}>
          <BrandLogo size={28} color="#FF00BF" />
          <ThemedText type="brand">EcoShield</ThemedText>
        </View>
        <View style={styles.topActions}>
          <ThemeModeToggle compact />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={openSettings}
            style={[styles.profileButton, Shadow, { backgroundColor: theme.card }]}>
            <ThemedText type="smallBold">{profileInitials}</ThemedText>
          </Pressable>
        </View>
      </View>

      {locationError && (
        <Pressable
          onPress={refresh}
          style={[styles.locationBanner, Shadow, { backgroundColor: theme.card, top: insets.top + 56 }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            Location is off — tap to try again so we can find stations near you
          </ThemedText>
        </Pressable>
      )}

      <View style={[styles.legend, Shadow, { backgroundColor: theme.card, top: insets.top + 56 }]}>
        <LegendDot color="#FF00BF" label="Checked stations" />
      </View>

      <MapFloatingControls
        onRecenter={handleRecenter}
        style={{ bottom: bottomInset + 220 }}
      />

      <View
        pointerEvents="box-none"
        style={[styles.sheetAnchor, { paddingBottom: bottomInset }]}>
        <View style={styles.sheetWidth}>
          <BottomSheet>
            {selectedCharger ? (
              <ChargerSheet
                charger={selectedCharger}
                onClear={() => {
                  setSelectedCharger(null);
                  setDestination(null);
                }}
              />
            ) : (
              <>
                <ThemedText type="heading">
                  {greeting.lead},{' '}
                  <ThemedText type="heading" style={styles.nameAccent}>
                    {greeting.firstName}
                  </ThemedText>
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {greeting.tagline}
                </ThemedText>

                <Button
                  label={isSearching ? 'Finding a station…' : 'Find a safe charging station'}
                  onPress={findSafeChargingStation}
                  disabled={isSearching || chargers.length === 0}
                />

                <ThemedText type="caption" themeColor="textSecondary" style={styles.hint}>
                  Or tap a pink pin on the map to see a station.
                </ThemedText>
              </>
            )}
          </BottomSheet>
        </View>
      </View>
    </View>
  );
}

function ChargerSheet({ charger, onClear }: { charger: Charger; onClear: () => void }) {
  const statusColor = customerStatusColor(charger.status);
  const title = customerChargerTitle(charger);

  return (
    <>
      <View style={styles.chargerHeader}>
        <View style={styles.chargerTitleBlock}>
          <ThemedText type="heading">{title}</ThemedText>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ThemedText type="caption" style={{ color: statusColor }}>
              {customerStatusLabel(charger.status)}
            </ThemedText>
          </View>
        </View>
        <Pressable onPress={onClear} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Close
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {customerChargerSummary(charger)}
      </ThemedText>

      <View style={styles.metaRow}>
        {charger.power && (
          <ThemedText type="caption" themeColor="textSecondary">
            {charger.power}
          </ThemedText>
        )}
        {charger.price && (
          <ThemedText type="caption" themeColor="textSecondary">
            {charger.price}
          </ThemedText>
        )}
        {charger.plugs && (
          <ThemedText type="caption" themeColor="textSecondary">
            {charger.plugs.join(' · ')}
          </ThemedText>
        )}
      </View>

      <Button
        label={
          charger.status === 'SAFE' ? 'Get directions' : 'Find another station'
        }
        variant={charger.status === 'SAFE' ? 'primary' : 'secondary'}
        onPress={charger.status === 'SAFE' ? undefined : onClear}
      />
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="caption">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nameAccent: {
    color: '#00E5FF',
    textShadowColor: 'rgba(0, 229, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBanner: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  legend: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 15,
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  hint: {
    textAlign: 'center',
  },
  chargerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  chargerTitleBlock: {
    flex: 1,
    gap: Spacing.two,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
});
