import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type AppIconProps = {
  name: string | { ios: string; android: string; web: string };
  size?: number;
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({ name, size = 20, tintColor = '#ffffff', style }: AppIconProps) {
  // Extract standard key
  let key = typeof name === 'string' ? name : name.ios;

  // Normalize names
  if (key === 'favorite') key = 'heart.fill';
  if (key === 'favorite_border' || key === 'heart') key = 'heart';
  if (key === 'sun.max.fill' || key === 'light_mode') key = 'sun';
  if (key === 'moon.fill' || key === 'dark_mode') key = 'moon';
  if (key === 'circle.lefthalf.filled' || key === 'contrast') key = 'auto';
  if (key === 'chevron.up' || key === 'expand_less') key = 'chevron.up';
  if (key === 'chevron.down' || key === 'expand_more') key = 'chevron.down';
  if (key === 'chevron.right' || key === 'chevron_right') key = 'chevron.right';
  if (key === 'star.fill') key = 'star.fill';
  if (key === 'star') key = 'star';
  if (key === 'location.fill' || key === 'location_on' || key === 'my_location') key = 'location';
  if (key === 'magnifyingglass' || key === 'search') key = 'search';
  if (key === 'xmark.circle.fill' || key === 'close') key = 'close';
  if (key === 'clock.fill' || key === 'schedule' || key === 'clock') key = 'clock';

  let element: React.ReactNode = null;

  switch (key) {
    case 'heart.fill':
      element = (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={tintColor}>
          <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </Svg>
      );
      break;
    case 'heart':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}>
          <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </Svg>
      );
      break;
    case 'sun':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="12" r="5" />
          <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </Svg>
      );
      break;
    case 'moon':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={tintColor}
          stroke={tintColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );
      break;
    case 'auto':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 2v20A10 10 0 0 0 12 2z" fill={tintColor} />
        </Svg>
      );
      break;
    case 'chevron.up':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M18 15l-6-6-6 6" />
        </Svg>
      );
      break;
    case 'chevron.down':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      );
      break;
    case 'chevron.right':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M9 18l6-6-6-6" />
        </Svg>
      );
      break;
    case 'star.fill':
      element = (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={tintColor}>
          <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </Svg>
      );
      break;
    case 'star':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}>
          <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </Svg>
      );
      break;
    case 'location':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="12" r="8" />
          <Path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          <Circle cx="12" cy="12" r="3" fill={tintColor} />
        </Svg>
      );
      break;
    case 'search':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="11" cy="11" r="8" />
          <Path d="M21 21l-4.35-4.35" />
        </Svg>
      );
      break;
    case 'close':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Path d="M15 9l-6 6M9 9l6 6" />
        </Svg>
      );
      break;
    case 'clock':
      element = (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tintColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 6v6l4 2" />
        </Svg>
      );
      break;
    default:
      return null;
  }

  return <View style={style}>{element}</View>;
}
