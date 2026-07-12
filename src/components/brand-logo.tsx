import Svg, { Path, Circle } from 'react-native-svg';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type BrandLogoProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Original EcoShield mark — pink shield with route path. */
export const ECOSHIELD_PINK = '#FF00BF';

export function BrandLogo({ size = 28, color = ECOSHIELD_PINK, style }: BrandLogoProps) {
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityLabel="EcoShield logo">
      <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <Path
          d="M14 2.5L5 6.2V13.1C5 18.3 8.7 23.1 14 24.8C19.3 23.1 23 18.3 23 13.1V6.2L14 2.5Z"
          fill={color}
        />
        <Path
          d="M9.5 16.5C10.2 13.8 12.1 12.2 14 11.5C15.9 10.8 17.5 9.5 17.8 7.2"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="17.8" cy="7" r="1.6" fill="#FFFFFF" />
        <Circle cx="9.5" cy="16.5" r="1.6" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}
