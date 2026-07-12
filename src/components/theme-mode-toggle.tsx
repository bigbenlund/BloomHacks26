import { AppIcon } from '@/components/ui/themed-icon';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColorSchemePreference } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { ColorSchemePreference } from '@/lib/theme-storage';

type ThemeModeToggleProps = {
  compact?: boolean;
};

const OPTIONS: { value: ColorSchemePreference; label: string; icon: 'sun' | 'moon' | 'auto' }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'Auto', icon: 'auto' },
];

const iconNames = {
  sun: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  moon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  auto: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
} as const;

export function ThemeModeToggle({ compact = false }: ThemeModeToggleProps) {
  const theme = useTheme();
  const { preference, setPreference } = useColorSchemePreference();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        compact && styles.compactContainer,
      ]}
      accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const isSelected = preference === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => setPreference(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && { backgroundColor: theme.card },
              isSelected && styles.optionSelected,
              pressed && styles.pressed,
            ]}>
            <AppIcon
              name={iconNames[option.icon]}
              size={compact ? 14 : 16}
              tintColor={isSelected ? theme.text : theme.textSecondary}
            />
            {!compact && (
              <ThemedText
                type="caption"
                themeColor={isSelected ? 'text' : 'textSecondary'}
                style={isSelected && styles.selectedLabel}>
                {option.label}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  compactContainer: {
    padding: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    minHeight: 32,
  },
  optionSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedLabel: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
