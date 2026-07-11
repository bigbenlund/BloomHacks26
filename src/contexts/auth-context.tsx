import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { auth } from '@/config/firebase-auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  firstName: string | null;
  lastName: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  updateNames: (firstName: string, lastName: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function friendlyAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/requires-recent-login':
      return 'For security, enter your current password again to continue.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again in a moment.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function splitDisplayName(displayName: string | null | undefined) {
  const parts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(' ') || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const names = splitDisplayName(user?.displayName);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firstName: names.firstName,
      lastName: names.lastName,
      async signIn(email, password) {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (error) {
          throw new Error(friendlyAuthError(error));
        }
      },
      async signUp({ email, password, firstName, lastName }) {
        const cleanFirst = firstName.trim();
        const cleanLast = lastName.trim();
        if (!cleanFirst || !cleanLast) {
          throw new Error('Enter your first and last name.');
        }

        try {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const displayName = `${cleanFirst} ${cleanLast}`.trim();
          await updateProfile(credential.user, { displayName });
          setUser({ ...credential.user, displayName } as User);
        } catch (error) {
          throw new Error(friendlyAuthError(error));
        }
      },
      async updateNames(firstName, lastName) {
        const cleanFirst = firstName.trim();
        const cleanLast = lastName.trim();
        if (!cleanFirst || !cleanLast) {
          throw new Error('Enter your first and last name.');
        }
        if (!auth.currentUser) {
          throw new Error('You need to be signed in to update your name.');
        }

        try {
          const displayName = `${cleanFirst} ${cleanLast}`.trim();
          await updateProfile(auth.currentUser, { displayName });
          setUser({ ...auth.currentUser, displayName } as User);
        } catch (error) {
          throw new Error(friendlyAuthError(error));
        }
      },
      async changePassword(currentPassword, newPassword) {
        const currentUser = auth.currentUser;
        const email = currentUser?.email;
        if (!currentUser || !email) {
          throw new Error('You need to be signed in to change your password.');
        }
        if (newPassword.trim().length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        try {
          const credential = EmailAuthProvider.credential(email, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          await updatePassword(currentUser, newPassword);
        } catch (error) {
          throw new Error(friendlyAuthError(error));
        }
      },
      async signOut() {
        await firebaseSignOut(auth);
      },
    }),
    [user, loading, names.firstName, names.lastName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
