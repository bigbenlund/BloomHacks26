import { Linking, Platform } from 'react-native';

import type { MapCoordinate } from '@/components/secure-route-map/types';

/** Open Google Maps (or Apple Maps on iOS) with turn-by-turn directions to a station. */
export async function openDirectionsToStation(
  destination: { lat: number; lng: number },
  origin?: MapCoordinate | null,
) {
  const dest = `${destination.lat},${destination.lng}`;
  const originParam =
    origin != null ? `${origin.latitude},${origin.longitude}` : undefined;

  const webUrl = originParam
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(dest)}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;

  if (Platform.OS === 'ios') {
    const appleOrigin = originParam ? `saddr=${encodeURIComponent(originParam)}&` : '';
    const appleUrl = `http://maps.apple.com/?${appleOrigin}daddr=${encodeURIComponent(dest)}&dirflg=d`;
    const canOpenApple = await Linking.canOpenURL(appleUrl);
    if (canOpenApple) {
      await Linking.openURL(appleUrl);
      return;
    }
  }

  if (Platform.OS === 'android') {
    const navUrl = originParam
      ? `google.navigation:q=${dest}`
      : `geo:${dest}?q=${dest}`;
    try {
      await Linking.openURL(navUrl);
      return;
    } catch {
      // Fall through to web Maps
    }
  }

  await Linking.openURL(webUrl);
}
