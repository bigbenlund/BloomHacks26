import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/themed-icon';
import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { BottomSheet } from '@/components/bottom-sheet';
import { BrandLogo } from '@/components/brand-logo';
import { MapFloatingControls } from '@/components/map-floating-controls';
import { SecureRouteMap } from '@/components/secure-route-map/secure-route-map';
import type { MapCoordinate } from '@/components/secure-route-map/types';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { chargerData, type Charger } from '@/constants/chargers';
import { DEFAULT_MAP_CENTER } from '@/constants/map';
import { BottomTabInset, Brand, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSettingsNav } from '@/contexts/settings-nav-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { useUserStations } from '@/hooks/use-user-stations';
import { chargersNearLocation } from '@/lib/chargers-on-map';
import {
  customerChargeTimeEstimate,
  customerChargerSummary,
  customerChargerTitle,
  customerLastCheckedLabel,
  customerPlugsLabel,
  customerPowerLabel,
  customerStatusColor,
  customerStatusLabel,
} from '@/lib/customer-copy';
import { buildHomeGreeting } from '@/lib/home-greetings';
import { openDirectionsToStation } from '@/lib/open-directions';

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
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { openSettings } = useSettingsNav();
  const { recordVisit } = useUserStations();
  const { location: userLocation, error: locationError, refresh, requestLocationAccess } =
    useUserLocation();
  const greeting = useMemo(
    () => buildHomeGreeting(user?.displayName),
    [user?.displayName],
  );
  const nameAccentStyle = useMemo(
    () =>
      colorScheme === 'dark'
        ? {
            color: '#00E5FF',
            textShadowColor: 'rgba(0, 229, 255, 0.45)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }
        : {
            color: Brand.primary,
            textShadowColor: 'rgba(255, 0, 191, 0.35)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 6,
          },
    [colorScheme],
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
  const [isSearching, setIsSearching] = useState(false);
  const [dbChargers, setDbChargers] = useState<Charger[]>([]);

  const bottomInset = BottomTabInset + insets.bottom;

  // Subscribe to live updates in Cloud Firestore
  useEffect(() => {
    try {
      const chargersCol = collection(db, 'chargers');
      const unsubscribe = onSnapshot(chargersCol, (snapshot) => {
        if (!snapshot.empty) {
          const list: Charger[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.name || 'Unnamed Station',
              location: data.location || { lat: 34.0094, lng: -118.4973 },
              status: (['SAFE', 'CAUTION', 'COMPROMISED'].includes(data.status)
                ? data.status
                : 'SAFE') as Charger['status'],
              risk: typeof data.risk === 'number' ? data.risk : 0,
              recommendation: data.recommendation || 'No advisories',
              findings: Array.isArray(data.findings) ? data.findings : [],
              driver_summary: data.driver_summary || data.recommendation || 'This station is fully verified secure.',
              firmware: data.firmware || 'unknown',
              log_file: data.log_file || 'simulated',
              telemetry: data.telemetry,
              power: data.power || (data.telemetry && data.telemetry.event_count ? `Log Events: ${data.telemetry.event_count}` : '150 kW DC Fast'),
              plugs: Array.isArray(data.plugs) ? data.plugs : ['CCS2', 'NACS'],
              price: data.price || '$0.30/kWh',
              address: data.address || `${data.name || 'Orlando Node'} - Orlando Grid Node`,
            });
          });
          setDbChargers(list);
        } else {
          setDbChargers(chargerData);
        }
      }, (error) => {
        console.error("Firestore subscription error, falling back:", error);
        setDbChargers(chargerData);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Failed to set up Firestore snapshot listener:", err);
      setDbChargers(chargerData);
    }
  }, []);

  // State for map filtering ('ALL' | 'SAFE' | 'CAUTION' | 'COMPROMISED')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'CAUTION' | 'COMPROMISED'>('ALL');
  const [hasCenteredOnDb, setHasCenteredOnDb] = useState(false);

  // Center on the live database cluster if available
  const dbCenter = useMemo(() => {
    if (dbChargers.length === 0) return null;
    let totalLat = 0;
    let totalLng = 0;
    dbChargers.forEach((c) => {
      totalLat += c.location.lat;
      totalLng += c.location.lng;
    });
    return {
      latitude: totalLat / dbChargers.length,
      longitude: totalLng / dbChargers.length,
    };
  }, [dbChargers]);

  // Demo stations are remapped around the user (or Santa Monica until location arrives)
  const chargerAnchor = userLocation ?? DEFAULT_MAP_CENTER;

  const chargers = useMemo(() => {
    // Determine the baseline raw station array
    let rawList = dbChargers;
    if (dbChargers.length === 0) {
      // Fallback: use mock Santa Monica chargers and remap them to the user anchor
      rawList = chargersNearLocation(chargerAnchor, chargerData);
    }

    // Apply safety status filters dynamically
    if (statusFilter !== 'ALL') {
      return rawList.filter((c) => c.status === statusFilter);
    }
    return rawList;
  }, [chargerAnchor.latitude, chargerAnchor.longitude, dbChargers, statusFilter]);

  // Auto-center map on user location if available
  useEffect(() => {
    if (userLocation && !hasCenteredOnUser) {
      setMapCenter(userLocation);
      setHasCenteredOnUser(true);
    }
  }, [userLocation, hasCenteredOnUser]);

  // Fallback: auto-center on database cluster (Orlando) if user has no GPS permission/location
  useEffect(() => {
    if (dbCenter && !hasCenteredOnDb && !userLocation) {
      setMapCenter(dbCenter);
      setHasCenteredOnDb(true);
    }
  }, [dbCenter, hasCenteredOnDb, userLocation]);

  const distanceToDb = useMemo(() => {
    if (!dbCenter || !userLocation) return 0;
    return distanceMeters(userLocation, { lat: dbCenter.latitude, lng: dbCenter.longitude });
  }, [dbCenter, userLocation]);

  const showFocusDbButton = dbChargers.length > 0 && distanceToDb > 50000;

  function handleRecenter() {
    refresh();
    if (userLocation) {
      setMapCenter({ ...userLocation });
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

    // Filter to only find SAFE ones
    const safeChargers = chargers.filter((c) => c.status === 'SAFE');
    const nearest = [...safeChargers].sort(
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
          onPress={() => {
            void requestLocationAccess().then((ok) => {
              if (!ok) {
                refresh();
              }
            });
          }}
          style={[styles.locationBanner, Shadow, { backgroundColor: theme.card, top: insets.top + 56 }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            Location is off — tap to try again so we can find stations near you
          </ThemedText>
        </Pressable>
      )}

      <View style={[styles.legend, Shadow, { backgroundColor: theme.card, top: insets.top + 56, alignItems: 'center', gap: Spacing.two }]}>
        <LegendDot
          color="#00B89C"
          label="Verified Safe"
          active={statusFilter === 'SAFE'}
          onPress={() => setStatusFilter((prev) => (prev === 'SAFE' ? 'ALL' : 'SAFE'))}
        />
        <LegendDot
          color="#F5A623"
          label="Caution"
          active={statusFilter === 'CAUTION'}
          onPress={() => setStatusFilter((prev) => (prev === 'CAUTION' ? 'ALL' : 'CAUTION'))}
        />
        <LegendDot
          color="#FF3B30"
          label="Compromised"
          active={statusFilter === 'COMPROMISED'}
          onPress={() => setStatusFilter((prev) => (prev === 'COMPROMISED' ? 'ALL' : 'COMPROMISED'))}
        />
      </View>

      {showFocusDbButton && dbCenter && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMapCenter({
              latitude: dbCenter.latitude,
              longitude: dbCenter.longitude,
            });
          }}
          style={[
            styles.focusHubButton,
            Shadow,
            { backgroundColor: theme.card, top: insets.top + 104 },
          ]}>
          <ThemedText type="caption" style={{ color: Brand.primary, fontWeight: 'bold' }}>
            📍 Focus Florida Grid ({dbChargers.length} nodes)
          </ThemedText>
        </Pressable>
      )}

      <MapFloatingControls
        onRecenter={handleRecenter}
        style={{ bottom: bottomInset + 220 }}
      />

      <View
        pointerEvents="box-none"
        style={[styles.sheetAnchor, { paddingBottom: bottomInset }]}>
        <View style={styles.sheetWidth}>
          <BottomSheet
            onDismiss={
              selectedCharger
                ? () => {
                    setSelectedCharger(null);
                    setDestination(null);
                  }
                : undefined
            }>
            {selectedCharger ? (
              <ChargerSheet
                charger={selectedCharger}
                userLocation={userLocation}
                onClear={() => {
                  setSelectedCharger(null);
                  setDestination(null);
                }}
              />
            ) : (
              <>
                <ThemedText type="heading">
                  {greeting.lead},{' '}
                  <ThemedText type="heading" style={nameAccentStyle}>
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
                  Or tap a pin to see a verified station near you.
                </ThemedText>
              </>
            )}
          </BottomSheet>
        </View>
      </View>
    </View>
  );
}

function ChargerSheet({
  charger,
  userLocation,
  onClear,
}: {
  charger: Charger;
  userLocation: MapCoordinate | null;
  onClear: () => void;
}) {
  const theme = useTheme();
  const { isFavorite, addFavorite, removeFavorite } = useUserStations();
  const statusColor = customerStatusColor(charger.status);
  const title = customerChargerTitle(charger);
  const plugsLabel = customerPlugsLabel(charger.plugs);
  const powerLabel = customerPowerLabel(charger.power);
  const chargeTimeLabel = customerChargeTimeEstimate(charger);
  const saved = isFavorite(charger.id);

  return (
    <>
      <View style={styles.chargerHeader}>
        <View style={styles.chargerTitleBlock}>
          <ThemedText type="heading">{title}</ThemedText>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText type="caption" style={{ color: statusColor }}>
                {customerStatusLabel(charger.status)}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'}
              onPress={() => (saved ? removeFavorite(charger.id) : addFavorite(charger.id))}
              hitSlop={8}
              style={styles.starButton}>
              <AppIcon
                name={{
                  ios: saved ? 'star.fill' : 'star',
                  android: saved ? 'star' : 'star_border',
                  web: saved ? 'star' : 'star_border',
                }}
                size={18}
                tintColor={saved ? Brand.primary : theme.textSecondary}
              />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'column', gap: 1 }}>
            <ThemedText type="caption" themeColor="textSecondary">
              {customerLastCheckedLabel(charger)}
            </ThemedText>
            <ThemedText type="code" style={{ fontSize: 9, color: theme.textSecondary, letterSpacing: 0.2 }}>
              DATABASE NODE ID: {charger.id}
            </ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {customerChargerSummary(charger)}
      </ThemedText>

      {charger.findings && charger.findings.length > 0 && (
        <View style={[styles.findingsCard, { borderColor: `${statusColor}44`, backgroundColor: `${statusColor}08` }]}>
          <View style={styles.findingsHeader}>
            <ThemedText type="code" style={{ fontSize: 9, color: statusColor, fontWeight: '700' }}>
              ⚠️ SECURITY AUDIT DETAIL: {charger.findings[0].code}
            </ThemedText>
            <ThemedText type="code" style={{ fontSize: 9, color: statusColor }}>
              RISK: {charger.risk}/100
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={{ fontSize: 12, marginTop: 4, color: theme.text }}>
            {charger.findings[0].title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" style={{ marginTop: 2, lineHeight: 14 }}>
            {charger.findings[0].evidence}
          </ThemedText>
        </View>
      )}

      <View style={styles.metaRow}>
        {powerLabel && (
          <ThemedText type="caption" themeColor="textSecondary">
            {powerLabel}
          </ThemedText>
        )}
        {chargeTimeLabel && (
          <ThemedText type="caption" themeColor="textSecondary">
            {chargeTimeLabel}
          </ThemedText>
        )}
        {charger.price && (
          <ThemedText type="caption" themeColor="textSecondary">
            {charger.price}
          </ThemedText>
        )}
        {plugsLabel && (
          <ThemedText type="caption" themeColor="textSecondary">
            {plugsLabel}
          </ThemedText>
        )}
      </View>

      <Button
        label={charger.status === 'SAFE' ? 'Get directions' : 'Find another station'}
        variant={charger.status === 'SAFE' ? 'primary' : 'secondary'}
        onPress={() => {
          if (charger.status !== 'SAFE') {
            onClear();
            return;
          }
          void openDirectionsToStation(charger.location, userLocation);
        }}
      />
    </>
  );
}

function LegendDot({
  color,
  label,
  active,
  onPress,
}: {
  color: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.legendItem,
        {
          opacity: active ? 1 : 0.65,
          backgroundColor: active ? `${color}18` : 'transparent',
          paddingHorizontal: Spacing.two,
          paddingVertical: Spacing.one,
          borderRadius: Radius.pill,
        },
      ]}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText
        type="caption"
        style={{
          fontWeight: active ? 'bold' : 'normal',
          color: active ? color : undefined,
        }}>
        {label}
      </ThemedText>
    </Pressable>
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
    gap: Spacing.two,
  },
  chargerTitleBlock: {
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  starButton: {
    padding: 2,
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
    marginTop: Spacing.one,
  },
  findingsCard: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  findingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: Spacing.one,
  },
  focusHubButton: {
    position: 'absolute',
    left: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    zIndex: 15,
  },
});
