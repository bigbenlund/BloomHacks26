import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BottomSheetProps = ViewProps;

export function BottomSheet({ style, children, ...props }: BottomSheetProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.sheet, { backgroundColor: theme.card }, Shadow, style]}
        {...props}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {children}
      </View>
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
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    marginBottom: Spacing.one,
  },
});
