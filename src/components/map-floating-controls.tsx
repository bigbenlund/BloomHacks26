import { AppIcon } from '@/components/ui/themed-icon';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MapFloatingControlsProps = {
  onRecenter: () => void;
  style?: StyleProp<ViewStyle>;
};

export function MapFloatingControls({ onRecenter, style }: MapFloatingControlsProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map on your location"
        onPress={onRecenter}
        style={({ pressed }) => [
          styles.button,
          Shadow,
          { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 },
        ]}>
        <AppIcon
          name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
          size={22}
          tintColor="#4285F4"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
