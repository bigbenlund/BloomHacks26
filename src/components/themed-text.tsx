import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Brand, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'caption'
    | 'button'
    | 'brand';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], fontFamily: Fonts.sans },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'caption' && styles.caption,
        type === 'button' && styles.button,
        type === 'brand' && styles.brand,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  link: {
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  linkPrimary: {
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '600',
    color: Brand.primary,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  brand: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
