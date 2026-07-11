import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MapSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  placeholder?: string;
};

export function MapSearchBar({
  value,
  onChangeText,
  onFocus,
  placeholder = 'Search here',
}: MapSearchBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, Shadow, { backgroundColor: theme.card }]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={20}
        tintColor={theme.textSecondary}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        returnKeyType="search"
        accessibilityLabel="Search destination"
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={8}>
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
            size={18}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

export function MapQuickChip({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        Shadow,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

export function MapRouteSummary({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.routeCard, Shadow, { backgroundColor: theme.card }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  routeCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    gap: Spacing.half,
  },
});
