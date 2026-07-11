import type { StyleProp, ViewStyle } from 'react-native';

import type { Charger } from '@/constants/chargers';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type SecureRouteMapProps = {
  style?: StyleProp<ViewStyle>;
  center?: MapCoordinate;
  userLocation?: MapCoordinate | null;
  destination?: MapCoordinate | null;
  chargers?: Charger[];
  selectedChargerId?: string | null;
  onSelectCharger?: (charger: Charger) => void;
  onMapPress?: (coordinate: MapCoordinate) => void;
  onRecenter?: () => void;
};
