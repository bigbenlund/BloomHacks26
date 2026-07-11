export const DEFAULT_MAP_CENTER = {
  latitude: 37.7879,
  longitude: -122.4075,
} as const;

export const DEFAULT_MAP_ZOOM = 14;

export function getGoogleMapsApiKey() {
  const raw = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  // Strip quotes if someone saved the key as "AIza..."
  return raw.replace(/^["']|["']$/g, '').trim();
}
