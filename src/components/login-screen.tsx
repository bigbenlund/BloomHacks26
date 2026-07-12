import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { FloatingLoginBackground } from '@/components/floating-login-background';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

/** Full-screen login shown before the main app. */
export function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignIn = mode === 'signIn';

  async function handleSubmit() {
    setError(null);

    if (!isSignIn && (!firstName.trim() || !lastName.trim())) {
      setError('Enter your first and last name.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignIn) {
        await signIn(email, password);
      } else {
        await signUp({ email, password, firstName, lastName });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <FloatingLoginBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + Spacing.six,
              paddingBottom: insets.bottom + Spacing.five,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <View style={[styles.logoMark, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <BrandLogo size={48} color={Brand.primary} />
            </View>
            <ThemedText type="brand">EcoShield</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
              SecureRoute — find charging you can trust
            </ThemedText>
          </View>

          <View style={styles.form}>
            <ThemedText type="title">{isSignIn ? 'Welcome back' : 'Create account'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isSignIn
                ? 'Sign in to save favorites and pick up where you left off.'
                : 'Join EcoShield to start finding safe charging stations.'}
            </ThemedText>

            <View style={styles.fields}>
              {!isSignIn ? (
                <View style={styles.nameRow}>
                  <View style={[styles.field, styles.nameField]}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      First name
                    </ThemedText>
                    <TextInput
                      autoCapitalize="words"
                      autoComplete="given-name"
                      autoCorrect={false}
                      placeholder="First name"
                      placeholderTextColor={theme.textSecondary}
                      value={firstName}
                      onChangeText={setFirstName}
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
                      autoCorrect={false}
                      placeholder="Last name"
                      placeholderTextColor={theme.textSecondary}
                      value={lastName}
                      onChangeText={setLastName}
                      style={[styles.input, inputStyle]}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Email
                </ThemedText>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@email.com"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.input, inputStyle]}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Password
                </ThemedText>
                <TextInput
                  autoCapitalize="none"
                  autoComplete={isSignIn ? 'password' : 'new-password'}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                  style={[styles.input, inputStyle]}
                />
              </View>
            </View>

            {error ? (
              <ThemedText type="small" style={{ color: '#C62828' }}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              label={submitting ? 'Please wait…' : isSignIn ? 'Sign in' : 'Create account'}
              disabled={submitting}
              onPress={() => {
                void handleSubmit();
              }}
            />

            {submitting ? (
              <ActivityIndicator color={Brand.primary} style={styles.spinner} />
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setMode(isSignIn ? 'signUp' : 'signIn');
              }}
              style={styles.switchMode}>
              <ThemedText type="small" themeColor="textSecondary">
                {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                <ThemedText type="linkPrimary">{isSignIn ? 'Sign up' : 'Sign in'}</ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.six,
  },
  brandBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 280,
  },
  form: {
    gap: Spacing.three,
  },
  fields: {
    gap: Spacing.three,
    marginTop: Spacing.two,
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
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '500',
  },
  spinner: {
    marginTop: -Spacing.one,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
