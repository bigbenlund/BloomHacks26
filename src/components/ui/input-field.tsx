import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type InputFieldProps = TextInputProps & {
  label?: string;
  icon?: 'location' | 'search' | 'clock';
  onPress?: () => void;
};

const iconNames = {
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
} as const;

export function InputField({ label, icon = 'search', onPress, style, ...props }: InputFieldProps) {
  const theme = useTheme();
  const content = (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <SymbolView name={iconNames[icon]} size={20} tintColor={theme.textSecondary} />
      <View style={styles.inputWrapper}>
        {label && (
          <ThemedText type="caption" themeColor="textSecondary">
            {label}
          </ThemedText>
        )}
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }, style]}
          {...props}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  inputWrapper: {
    flex: 1,
    gap: Spacing.half,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
});
