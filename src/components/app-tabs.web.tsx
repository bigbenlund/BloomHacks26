import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Browser preview shell for the *mobile Lyft-style* user app.
 * Bottom tabs only — no dashboard chrome. Real web product is separate.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <PhoneTabBar>
          <TabTrigger name="home" href="/" asChild>
            <PhoneTab>Home</PhoneTab>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <PhoneTab>Favorites</PhoneTab>
          </TabTrigger>
        </PhoneTabBar>
      </TabList>
    </Tabs>
  );
}

function PhoneTabBar({ children, style, ...props }: React.ComponentProps<typeof View>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
        style,
      ]}>
      <View style={styles.tabBarInner}>{children}</View>
    </View>
  );
}

function PhoneTab({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <ThemedText
        type="small"
        style={[
          { color: isFocused ? Brand.primary : theme.textSecondary },
          isFocused && styles.tabActive,
        ]}>
        {children}
      </ThemedText>
      {isFocused && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.six,
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingTop: Spacing.two,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    gap: 4,
    minWidth: 72,
  },
  tabActive: {
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: Brand.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
