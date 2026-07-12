export const DEFAULT_MAP_CENTER = {
  // Fallback only until we have the signed-in user's location
  latitude: 34.0194,
  longitude: -118.4912,
} as const;

export const DEFAULT_MAP_ZOOM = 14;

export function getGoogleMapsApiKey() {
  const raw = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  // Strip quotes if someone saved the key as "AIza..."
  return raw.replace(/^["']|["']$/g, '').trim();
}
