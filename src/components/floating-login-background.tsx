import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

type OrbConfig = {
  color: string;
  size: number;
  opacity: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  durationMs: number;
  delayMs: number;
};

const ORBS: OrbConfig[] = [
  {
    color: Brand.primary,
    size: 300,
    opacity: 0.16,
    startX: -40,
    startY: -80,
    driftX: 70,
    driftY: 90,
    durationMs: 14000,
    delayMs: 0,
  },
  {
    color: Brand.purple,
    size: 340,
    opacity: 0.2,
    startX: 180,
    startY: 420,
    driftX: -90,
    driftY: -70,
    durationMs: 18000,
    delayMs: 800,
  },
  {
    color: Brand.primary,
    size: 220,
    opacity: 0.12,
    startX: 220,
    startY: 160,
    driftX: -50,
    driftY: 60,
    durationMs: 16000,
    delayMs: 1600,
  },
  {
    color: Brand.purpleLight,
    size: 260,
    opacity: 0.14,
    startX: -60,
    startY: 520,
    driftX: 80,
    driftY: -100,
    durationMs: 20000,
    delayMs: 400,
  },
];

function FloatingOrb({ config }: { config: OrbConfig }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delayMs,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: config.durationMs,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: config.durationMs,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [config.delayMs, config.durationMs, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: config.opacity,
      transform: [
        { translateX: config.startX + config.driftX * t },
        { translateY: config.startY + config.driftY * t },
        { scale: 0.92 + t * 0.16 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

/** Soft brand orbs that drift slowly behind the login form. */
export function FloatingLoginBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ORBS.map((orb, index) => (
        <FloatingOrb key={index} config={orb} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
