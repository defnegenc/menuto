import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { theme } from '../theme';
import { formatLastAuthMethod, getLastAuth, setLastAuth } from '../utils/lastAuth';

interface Props {
  onAuthComplete: () => void;
}

export function AuthScreen({ onAuthComplete }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [lastAuthLabel, setLastAuthLabel] = useState<string | null>(null);
  const [lastAuthIdentifier, setLastAuthIdentifier] = useState<string | null>(null);

  const { setUser } = useStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const last = await getLastAuth();
      if (!mounted) return;
      if (last) {
        setLastAuthLabel(formatLastAuthMethod(last.method));
        setLastAuthIdentifier(last.identifier ?? null);
      } else {
        setLastAuthLabel(null);
        setLastAuthIdentifier(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: '' };
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const saveNewUserProfile = async (userId: string, userEmail: string) => {
    const userPayload = {
      id: userId,
      name: name.trim() || undefined,
      username: username.trim() || undefined,
      email: userEmail,
      home_base: undefined,
      preferred_cuisines: [],
      spice_tolerance: 3,
      price_preference: 2,
      dietary_restrictions: [],
      favorite_restaurants: [],
      favorite_dishes: [],
    };
    try {
      await api.saveUserPreferences(userId, userPayload);
      setUser(userPayload, userId);
    } catch (e) {
      console.error('Failed to save new user profile:', e);
      // Still set locally so the app can proceed
      setUser(userPayload, userId);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: verificationCode.trim(),
        type: 'signup',
      });

      if (error) {
        Alert.alert('Error', error.message || 'Verification failed');
        return;
      }

      if (data.session && data.user) {
        await setLastAuth({ method: 'email_password_sign_up', identifier: email.trim(), ts: Date.now() });
        await saveNewUserProfile(data.user.id, email.trim());
        Alert.alert('Success', 'Account created successfully!');
        onAuthComplete();
      } else {
        Alert.alert('Error', 'Verification succeeded but no session was created. Please try signing in.');
        setShowVerification(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    // Validate inputs
    if (isSignUp && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (isSignUp && !username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (isSignUp && !validateUsername(username)) {
      Alert.alert('Error', 'Username must be 3-20 characters, letters, numbers, and underscores only');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Password Requirements', passwordValidation.message);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
              username: username.trim(),
            },
          },
        });

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        // If email confirmation is required (no session yet), show verification
        if (data.user && !data.session) {
          setShowVerification(true);
          Alert.alert('Verification Required', 'A verification code has been sent to your email.');
          return;
        }

        // If sign-up is complete with session (email confirmation disabled)
        if (data.session && data.user) {
          await setLastAuth({ method: 'email_password_sign_up', identifier: email.trim(), ts: Date.now() });
          await saveNewUserProfile(data.user.id, email.trim());
          Alert.alert('Success', 'Account created successfully!');
          onAuthComplete();
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message?.toLowerCase().includes('invalid login credentials')) {
            Alert.alert('Error', 'Invalid email or password. Check your credentials or sign up for a new account.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => setIsSignUp(true) },
            ]);
          } else {
            Alert.alert('Error', error.message);
          }
          return;
        }

        if (data.session) {
          await setLastAuth({ method: 'email_password_sign_in', identifier: email.trim(), ts: Date.now() });
          // For sign-in, let App.tsx load existing user data via the auth state change listener
          Alert.alert('Success', 'Signed in successfully!');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                Enter the verification code sent to {email}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.authButton, isLoading && styles.authButtonDisabled]}
                onPress={handleVerification}
                disabled={isLoading}
              >
                <Text style={styles.authButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify Email'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setShowVerification(false)}
                disabled={isLoading}
              >
                <Text style={styles.switchButtonText}>
                  Back to Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Menuto!</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account to get started' : 'Sign in to continue'}
            </Text>
            {!!lastAuthLabel && (
              <View style={styles.lastAuthBadge}>
                <Text style={styles.lastAuthBadgeText}>
                  Last used: {lastAuthLabel}
                  {lastAuthIdentifier ? ` \u2022 ${lastAuthIdentifier}` : ''}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                editable={!isLoading}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                textContentType={isSignUp ? "newPassword" : "password"}
                passwordRules={isSignUp ? "minlength: 6;" : undefined}
              />
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  secureTextEntry
                  editable={!isLoading}
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.authButton, isLoading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={styles.authButtonText}>
                {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  lastAuthBadge: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lastAuthBadgeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.lg,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text.primary,
  },
  authButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  switchButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.md,
    textDecorationLine: 'underline',
  },
});
