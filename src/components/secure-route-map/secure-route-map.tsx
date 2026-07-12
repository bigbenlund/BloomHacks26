import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { MapPlaceholder } from '@/components/map-placeholder';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_MAP_CENTER, getGoogleMapsApiKey } from '@/constants/map';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { customerChargerTitle, customerStatusColor } from '@/lib/customer-copy';

import type { MapCoordinate, SecureRouteMapProps } from './types';

const INITIAL_REGION: Region = {
  latitude: DEFAULT_MAP_CENTER.latitude,
  longitude: DEFAULT_MAP_CENTER.longitude,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export function SecureRouteMap({
  style,
  center = DEFAULT_MAP_CENTER,
  userLocation,
  destination,
  chargers = [],
  selectedChargerId,
  onSelectCharger,
  onMapPress,
}: SecureRouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const theme = useTheme();
  const colorScheme = useColorScheme();

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400,
    );
  }, [center.latitude, center.longitude]);

  if (Platform.OS === 'android' && !getGoogleMapsApiKey()) {
    return (
      <View style={[styles.fallback, style]}>
        <MapPlaceholder />
        <View style={[styles.apiKeyNotice, { backgroundColor: theme.card }]}>
          <ThemedText type="smallBold">Google Maps API key needed</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env for Android Google Maps.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          ...INITIAL_REGION,
          latitude: center.latitude,
          longitude: center.longitude,
        }}
        userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={(event: { nativeEvent: { coordinate: MapCoordinate } }) => {
          onMapPress?.(event.nativeEvent.coordinate);
        }}>
        {userLocation && (
          <Marker coordinate={userLocation} pinColor="#4285F4" title="You" />
        )}

        {chargers.map((charger) => (
          <Marker
            key={charger.id}
            coordinate={{
              latitude: charger.location.lat,
              longitude: charger.location.lng,
            }}
            pinColor={customerStatusColor(charger.status)}
            title={customerChargerTitle(charger)}
            description="Checked by EcoShield"
            opacity={charger.id === selectedChargerId ? 1 : 0.92}
            onPress={() => onSelectCharger?.(charger)}
          />
        ))}

        {destination && (
          <Marker coordinate={destination} pinColor="#FF00BF" title="Destination" />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
  },
  apiKeyNotice: {
    position: 'absolute',
    bottom: Spacing.five,
    left: Spacing.four,
    right: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.one,
  },
});
