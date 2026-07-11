import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  style?: ViewStyle;
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}>
      <ThemedText
        type="button"
        themeColor={variant === 'primary' ? 'primaryText' : 'text'}
        style={[
          variant !== 'primary' && styles.secondaryLabel,
          variant === 'secondary' && styles.darkLabel,
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  lg: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    minHeight: 56,
  },
  md: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    minHeight: 44,
  },
  primary: {
    backgroundColor: '#FF00BF',
  },
  secondary: {
    backgroundColor: '#F3F3F5',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  secondaryLabel: {
    fontWeight: '600',
  },
  darkLabel: {
    color: '#111111',
  },
});
