import type { Charger } from '@/constants/chargers';
import type { MapCoordinate } from '@/components/secure-route-map/types';

export const CHARGER_STATUS_COLORS = {
  SAFE: '#00B89C',
  CAUTION: '#F5A623',
  COMPROMISED: '#FF3B30',
} as const;

/** Place the catalog chargers near the user's map position so pins are always visible. */
export function chargersNearLocation(center: MapCoordinate, catalog: Charger[]): Charger[] {
  const offsets = [
    { lat: 0.006, lng: 0.008 },
    { lat: -0.008, lng: -0.005 },
    { lat: -0.005, lng: 0.012 },
    { lat: 0.012, lng: -0.01 },
    { lat: 0.004, lng: -0.014 },
    { lat: -0.012, lng: 0.006 },
  ];

  return catalog.map((charger, index) => {
    const offset = offsets[index % offsets.length];
    return {
      ...charger,
      location: {
        lat: center.latitude + offset.lat,
        lng: center.longitude + offset.lng,
      },
    };
  });
}
