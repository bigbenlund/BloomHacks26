import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function MapPlaceholder() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.map }]}>
      <View style={[styles.road, styles.roadHorizontal, { backgroundColor: theme.border }]} />
      <View style={[styles.road, styles.roadVertical, { backgroundColor: theme.border }]} />
      <View style={[styles.road, styles.roadDiagonal, { backgroundColor: theme.border }]} />

      <View style={[styles.pinOuter, { backgroundColor: theme.card }]}>
        <View style={styles.pinInner} />
      </View>

      <View style={[styles.badge, { backgroundColor: theme.card }]}>
        <ThemedText type="caption" themeColor="textSecondary">
          Secure route preview
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  road: {
    position: 'absolute',
    opacity: 0.6,
  },
  roadHorizontal: {
    top: '42%',
    left: '-10%',
    width: '120%',
    height: 14,
    borderRadius: Radius.pill,
  },
  roadVertical: {
    top: '10%',
    left: '55%',
    width: 12,
    height: '80%',
    borderRadius: Radius.pill,
  },
  roadDiagonal: {
    top: '25%',
    left: '15%',
    width: '70%',
    height: 10,
    borderRadius: Radius.pill,
    transform: [{ rotate: '35deg' }],
  },
  pinOuter: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pinInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Brand.primary,
  },
  badge: {
    position: 'absolute',
    top: Spacing.four,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
