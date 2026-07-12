import { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BottomSheetProps = ViewProps & {
  /** Called when the user pulls the sheet down far enough to dismiss it. */
  onDismiss?: () => void;
  dismissible?: boolean;
};

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

export function BottomSheet({
  style,
  children,
  onDismiss,
  dismissible = Boolean(onDismiss),
  ...props
}: BottomSheetProps) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
  }, [children, translateY]);

  const dismiss = () => {
    onDismiss?.();
  };

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .onBegin(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = startY.value + event.translationY;
      translateY.value = Math.max(0, next);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss && onDismiss) {
        translateY.value = withTiming(420, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(dismiss)();
          }
        });
        return;
      }

      translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, { backgroundColor: theme.card }, Shadow, style, animatedStyle]}
          {...props}>
          <View style={styles.handleHit}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
  },
});
