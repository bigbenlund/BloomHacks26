import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useTheme } from '@/hooks/use-theme';

import { Charger } from '@/constants/chargers';

interface EVMapProps {
  chargers: Charger[];
  selectedCharger: Charger | null;
  onSelectCharger: (charger: Charger) => void;
  routeToCharger: Charger | null;
  userLocation: { latitude: number; longitude: number } | null;
}

export function EVMap({ chargers, selectedCharger, onSelectCharger, routeToCharger, userLocation }: EVMapProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={[styles.borderGlow, { borderColor: theme.neonCyan }]}>
        <ThemedText type="smallBold" style={{ color: theme.neonCyan }}>
          [ GPS ENGINE ACTIVE ]
        </ThemedText>
        <ThemedText type="subtitle" style={styles.heading}>
          EcoShield Core Navigation Map
        </ThemedText>
        <ThemedText type="small" style={styles.text} themeColor="textSecondary">
          Google Maps API dynamic rendering is configured for web testing. Open the web version to interact with the real-time security routing interface.
        </ThemedText>
        <View style={styles.statRow}>
          <ThemedText type="code" style={styles.codeText}>
            LAT: 34.0094 | LNG: -118.4973
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  borderGlow: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  heading: {
    textAlign: 'center',
    marginTop: 4,
  },
  text: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  statRow: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  codeText: {
    color: '#00f0ff',
    fontSize: 11,
  },
});
