import { AppIcon } from '@/components/ui/themed-icon';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brand, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSettingsNav } from '@/contexts/settings-nav-context';
import { useTheme } from '@/hooks/use-theme';
import { ABOUT_ECOSHIELD } from '@/lib/customer-copy';

function SettingsDropdown({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.dropdownHeader}>
        <ThemedText type="subtitle" style={styles.dropdownTitle}>
          {title}
        </ThemedText>
        <AppIcon
          name={{
            ios: open ? 'chevron.up' : 'chevron.down',
            android: open ? 'expand_less' : 'expand_more',
            web: open ? 'expand_less' : 'expand_more',
          }}
          size={20}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.dropdownBody}>
          {children}
        </Animated.View>
      ) : null}
    </Card>
  );
}

/** Account settings — profile details, password, and log out. */
export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, firstName, lastName, updateNames, changePassword, signOut } = useAuth();
  const { closeSettings } = useSettingsNav();

  const [first, setFirst] = useState(firstName ?? '');
  const [last, setLast] = useState(lastName ?? '');
  const [savingNames, setSavingNames] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    setFirst(firstName ?? '');
    setLast(lastName ?? '');
  }, [firstName, lastName]);

  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
  };

  async function handleSaveNames() {
    setNameError(null);
    setNameMessage(null);
    setSavingNames(true);
    try {
      await updateNames(first, last);
      setNameMessage('Name updated.');
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'Could not update name.');
    } finally {
      setSavingNames(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword) {
      setPasswordError('Enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Could not change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    closeSettings();
    await signOut();
  }

  function handleReportProblem() {
    const message =
      'Tell us if a station looks down, unsafe, or different from what EcoShield shows. Reports help keep the locator accurate for everyone.';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${message}\n\nSubmit a report?`);
      if (confirmed) {
        setReportSent(true);
      }
      return;
    }

    Alert.alert('Report a problem', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Station looks down',
        onPress: () => setReportSent(true),
      },
      {
        text: 'Something feels off',
        onPress: () => setReportSent(true),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.four,
            paddingBottom: BottomTabInset + insets.bottom + Spacing.five,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={closeSettings}
            hitSlop={8}
            style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Back</ThemedText>
          </Pressable>
          <ThemeModeToggle compact />
        </View>

        <View style={styles.headerText}>
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Manage your EcoShield account
          </ThemedText>
        </View>

        <Card style={styles.section}>
          <ThemedText type="subtitle">Account information</ThemedText>

          <View style={styles.nameRow}>
            <View style={[styles.field, styles.nameField]}>
              <ThemedText type="caption" themeColor="textSecondary">
                First name
              </ThemedText>
              <TextInput
                autoCapitalize="words"
                autoComplete="given-name"
                value={first}
                onChangeText={setFirst}
                placeholder="First name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, inputStyle]}
              />
            </View>
            <View style={[styles.field, styles.nameField]}>
              <ThemedText type="caption" themeColor="textSecondary">
                Last name
              </ThemedText>
              <TextInput
                autoCapitalize="words"
                autoComplete="family-name"
                value={last}
                onChangeText={setLast}
                placeholder="Last name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, inputStyle]}
              />
            </View>
          </View>

          <Button
            label={savingNames ? 'Saving…' : 'Save name'}
            size="md"
            disabled={savingNames}
            onPress={() => {
              void handleSaveNames();
            }}
          />
          {nameError ? (
            <ThemedText type="small" style={styles.error}>
              {nameError}
            </ThemedText>
          ) : null}
          {nameMessage ? (
            <ThemedText type="small" style={styles.success}>
              {nameMessage}
            </ThemedText>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="caption" themeColor="textSecondary">
              Email on file
            </ThemedText>
            <View
              style={[
                styles.input,
                styles.readOnly,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="small">{user?.email ?? 'No email on file'}</ThemedText>
            </View>
          </View>

          {!showPasswordForm ? (
            <Button
              label="Change password"
              variant="secondary"
              size="md"
              onPress={() => {
                setPasswordError(null);
                setPasswordMessage(null);
                setShowPasswordForm(true);
              }}
            />
          ) : (
            <View style={styles.passwordBlock}>
              <ThemedText type="smallBold">Change password</ThemedText>
              <View style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Current password
                </ThemedText>
                <TextInput
                  secureTextEntry
                  autoComplete="password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, inputStyle]}
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary">
                  New password
                </ThemedText>
                <TextInput
                  secureTextEntry
                  autoComplete="new-password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, inputStyle]}
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Confirm new password
                </ThemedText>
                <TextInput
                  secureTextEntry
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, inputStyle]}
                />
              </View>
              <Button
                label={savingPassword ? 'Updating…' : 'Update password'}
                size="md"
                disabled={savingPassword}
                onPress={() => {
                  void handleChangePassword();
                }}
              />
              <Pressable
                onPress={() => {
                  setShowPasswordForm(false);
                  setPasswordError(null);
                }}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cancelLink}>
                  Cancel
                </ThemedText>
              </Pressable>
            </View>
          )}

          {passwordError ? (
            <ThemedText type="small" style={styles.error}>
              {passwordError}
            </ThemedText>
          ) : null}
          {passwordMessage ? (
            <ThemedText type="small" style={styles.success}>
              {passwordMessage}
            </ThemedText>
          ) : null}

          {(savingNames || savingPassword) && (
            <ActivityIndicator color={Brand.primary} style={styles.spinner} />
          )}

          {reportSent ? (
            <ThemedText type="small" style={styles.success}>
              Thanks — we got your report and will take a look.
            </ThemedText>
          ) : (
            <Button
              label="Report a problem"
              variant="secondary"
              size="md"
              onPress={handleReportProblem}
            />
          )}
        </Card>

        <SettingsDropdown title="About EcoShield">
          {ABOUT_ECOSHIELD.map((line) => (
            <ThemedText key={line} type="small" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </SettingsDropdown>

        <SettingsDropdown title="For fleets & operators">
          <ThemedText type="small" themeColor="textSecondary">
            EcoShield Enterprise includes operator dashboards and monitoring tools. That version isn’t
            available in the customer app.
          </ThemedText>
          <View
            accessibilityRole="text"
            accessibilityLabel="EcoShield Enterprise — available separately for operators"
            style={[styles.enterpriseBadge, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.enterpriseLabel}>
              EcoShield Enterprise
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Operator access only
            </ThemedText>
          </View>
        </SettingsDropdown>

        <Button
          label="Log out"
          variant="secondary"
          onPress={() => {
            void handleSignOut();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  headerText: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  dropdownTitle: {
    flex: 1,
  },
  dropdownBody: {
    gap: Spacing.three,
  },
  enterpriseBadge: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
    opacity: 0.9,
  },
  enterpriseLabel: {
    color: Brand.purple,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  nameField: {
    flex: 1,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '500',
    justifyContent: 'center',
  },
  readOnly: {
    opacity: 0.9,
  },
  passwordBlock: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  cancelLink: {
    textAlign: 'center',
    paddingVertical: Spacing.one,
  },
  error: {
    color: '#C62828',
  },
  success: {
    color: Brand.success,
  },
  spinner: {
    marginTop: Spacing.one,
  },
});
