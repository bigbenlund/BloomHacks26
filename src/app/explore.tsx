import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TRIPS = [
  {
    id: '1',
    from: 'Union Square',
    to: 'Financial District',
    date: 'Today · 8:42 AM',
    duration: '22 min',
    risk: 'Low risk',
  },
  {
    id: '2',
    from: 'Home',
    to: 'Campus Library',
    date: 'Yesterday · 6:15 PM',
    duration: '14 min',
    risk: 'Low risk',
  },
  {
    id: '3',
    from: 'Airport Terminal 2',
    to: 'Downtown Hotel',
    date: 'Mon · 11:03 PM',
    duration: '31 min',
    risk: 'Moderate',
  },
];

/** Mobile user trips — ride history style, not a dashboard table. */
export default function UserTripsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.four,
          paddingBottom: BottomTabInset + insets.bottom + Spacing.five,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText type="title">Trips</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your recent secure rides
          </ThemedText>
        </View>
        <ThemeModeToggle compact />
      </View>

      <View style={styles.list}>
        {TRIPS.map((trip) => (
          <Card key={trip.id} style={styles.tripCard}>
            <ThemedText type="smallBold">
              {trip.from} → {trip.to}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {trip.date}
            </ThemedText>
            <View style={styles.tripMeta}>
              <View style={styles.metaItem}>
                <SymbolView
                  name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                  size={14}
                  tintColor={theme.textSecondary}
                />
                <ThemedText type="caption" themeColor="textSecondary">
                  {trip.duration}
                </ThemedText>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="caption">{trip.risk}</ThemedText>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.three,
  },
  tripCard: {
    gap: Spacing.one,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  riskBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});
