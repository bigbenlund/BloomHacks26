import { useEffect, useState } from 'react';
import { APIProvider, ColorScheme, Map, Marker } from '@vis.gl/react-google-maps';
import { StyleSheet, View } from 'react-native';

import { MapPlaceholder } from '@/components/map-placeholder';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, getGoogleMapsApiKey } from '@/constants/map';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { customerChargerTitle } from '@/lib/customer-copy';

import type { SecureRouteMapProps } from './types';

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
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const apiKey = getGoogleMapsApiKey();
  const [cameraCenter, setCameraCenter] = useState({
    lat: center.latitude,
    lng: center.longitude,
  });
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);

  useEffect(() => {
    setCameraCenter({ lat: center.latitude, lng: center.longitude });
  }, [center.latitude, center.longitude]);

  if (!apiKey) {
    return (
      <View style={[styles.fallback, style]}>
        <MapPlaceholder />
        <View style={[styles.apiKeyNotice, { backgroundColor: theme.card }]}>
          <ThemedText type="smallBold">Google Maps API key needed</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to a .env file and restart Expo.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: '100%', height: '100%' }}
          center={cameraCenter}
          zoom={zoom}
          colorScheme={colorScheme === 'dark' ? ColorScheme.DARK : ColorScheme.LIGHT}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          onCameraChanged={(event) => {
            setCameraCenter(event.detail.center);
            setZoom(event.detail.zoom);
          }}
          onClick={(event: { detail: { latLng?: { lat: number; lng: number } | null } }) => {
            if (!event.detail.latLng || !onMapPress) {
              return;
            }
            onMapPress({
              latitude: event.detail.latLng.lat,
              longitude: event.detail.latLng.lng,
            });
          }}>
          {userLocation && (
            <Marker
              position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
              title="You are here"
              clickable={false}
            />
          )}

          {chargers.map((charger) => {
            const selected = charger.id === selectedChargerId;
            const size = selected ? 36 : 28;

            return (
              <Marker
                key={charger.id}
                position={{ lat: charger.location.lat, lng: charger.location.lng }}
                title={customerChargerTitle(charger)}
                onClick={() => onSelectCharger?.(charger)}
                icon={{
                  url: chargerPinSvg(Brand.primary, selected),
                  scaledSize: { width: size, height: size },
                  anchor: { x: size / 2, y: size / 2 },
                }}
              />
            );
          })}

          {destination && (
            <Marker
              position={{ lat: destination.latitude, lng: destination.longitude }}
              title="Destination"
            />
          )}
        </Map>
      </APIProvider>
    </View>
  );
}

function chargerPinSvg(color: string, selected: boolean) {
  const size = selected ? 36 : 28;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="11" fill="${color}" stroke="#ffffff" stroke-width="3"/>
      <path d="M12 8h4l-1.5 5H16l-5 8 1.2-6H10L12 8z" fill="#ffffff"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
    maxWidth: 420,
    alignSelf: 'center',
  },
});
