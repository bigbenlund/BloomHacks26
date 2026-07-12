import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

type BrandLogoProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export const ECOSHIELD_PINK = '#FF00BF';

function shieldDataUri(color: string) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
  <path d="M14 2.5L5 6.2V13.1C5 18.3 8.7 23.1 14 24.8C19.3 23.1 23 18.3 23 13.1V6.2L14 2.5Z" fill="${color}"/>
  <path d="M9.5 16.5C10.2 13.8 12.1 12.2 14 11.5C15.9 10.8 17.5 9.5 17.8 7.2" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="17.8" cy="7" r="1.6" fill="#FFFFFF"/>
  <circle cx="9.5" cy="16.5" r="1.6" fill="#FFFFFF"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Web: render the original EcoShield shield via SVG data URI (reliable in Chrome). */
export function BrandLogo({ size = 28, color = ECOSHIELD_PINK, style }: BrandLogoProps) {
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityLabel="EcoShield logo">
      <Image
        source={{ uri: shieldDataUri(color) }}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
