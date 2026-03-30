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
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import { formatLastAuthMethod, getLastAuth, setLastAuth } from '../utils/lastAuth';

WebBrowser.maybeCompleteAuthSession();

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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = 'menuto://auth/callback';
      console.log('OAuth redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data?.url) {
        console.log('Opening OAuth URL:', data.url.substring(0, 100));
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('OAuth result type:', result.type);
        console.log('OAuth result url:', result.type === 'success' ? result.url?.substring(0, 200) : 'n/a');

        if (result.type === 'success' && result.url) {
          // Extract tokens — Supabase puts them in the hash fragment
          const returnUrl = result.url;
          // Try hash fragment first, then query params
          const hashPart = returnUrl.includes('#') ? returnUrl.split('#')[1] : '';
          const queryPart = returnUrl.includes('?') ? returnUrl.split('?')[1]?.split('#')[0] : '';
          const params = new URLSearchParams(hashPart || queryPart || '');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          console.log('OAuth callback received, has tokens:', !!accessToken, !!refreshToken);

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              Alert.alert('Error', sessionError.message);
              return;
            }

            if (sessionData.session?.user) {
              const userId = sessionData.session.user.id;
              const userEmail = sessionData.session.user.email || '';
              const userName = sessionData.session.user.user_metadata?.full_name || '';

              // Create profile if new user (backend returns 404)
              try {
                const existingUser = await api.getUserPreferences(userId);
                if (!existingUser) throw new Error('not found');
              } catch {
                // New user — create profile
                const userPayload = {
                  id: userId,
                  name: userName || undefined,
                  username: undefined,
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
                } catch (e) {
                  console.error('Failed to save Google user profile:', e);
                }
              }

              await setLastAuth({ method: 'google', identifier: userEmail, ts: Date.now() });
              // Let App.tsx auth listener handle routing (session is already set)
              onAuthComplete();
            }
          }
        }

        if (result.type === 'cancel' || result.type === 'dismiss') {
          console.log('Google sign-in cancelled by user');
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      Alert.alert('Error', error?.message || 'Google sign-in failed');
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
              <Text style={styles.eyebrow}>VERIFICATION</Text>
              <Text style={styles.title}>Check your{'\n'}inbox</Text>
              <Text style={styles.subtitle}>
                Enter the verification code sent to {email}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>VERIFICATION CODE</Text>
                <TextInput
                  style={styles.input}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#8C7E77"
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
            <Text style={styles.eyebrow}>WELCOME TO MENUTO</Text>
            <Text style={styles.title}>
              {isSignUp ? 'Create your\naccount' : 'Good to see\nyou again'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Join us and discover your next favorite dish' : 'Sign in to pick up where you left off'}
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

          {/* Tab toggle */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !isSignUp && styles.tabActive]}
              onPress={() => setIsSignUp(false)}
              disabled={isLoading}
            >
              <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isSignUp && styles.tabActive]}
              onPress={() => setIsSignUp(true)}
              disabled={isLoading}
            >
              <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#8C7E77"
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>USERNAME</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  placeholderTextColor="#8C7E77"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#8C7E77"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#8C7E77"
                secureTextEntry
                editable={!isLoading}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                textContentType={isSignUp ? "newPassword" : "password"}
                passwordRules={isSignUp ? "minlength: 6;" : undefined}
              />
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#8C7E77"
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
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.switchButtonLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Bold Diner design tokens
const TERRA = '#E9323D';
const TERRA_LIGHT = '#FDECED';
const CREAM = '#FFFFFF';
const DARK = '#2C2421';
const MEDIUM = '#5A4D48';
const LIGHT_TEXT = '#8C7E77';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  eyebrow: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    letterSpacing: 3,
    color: TERRA,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  lastAuthBadge: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: TERRA_LIGHT,
  },
  lastAuthBadgeText: {
    fontSize: 13,
    color: MEDIUM,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
  title: {
    fontFamily: 'DMSans-Bold',
    fontSize: 38,
    letterSpacing: -1.5,
    color: DARK,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 17,
    color: MEDIUM,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    borderRadius: 0,
    paddingVertical: 16,
    marginBottom: 0,
  },
  googleIcon: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: TERRA,
  },
  googleButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: DARK,
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E7E5E4',
  },
  dividerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: LIGHT_TEXT,
  },
  // Tab toggle
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EEEA',
    borderRadius: 4,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: TERRA,
  },
  tabText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: DARK,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    letterSpacing: 3,
    color: TERRA,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: DARK,
  },
  authButton: {
    backgroundColor: TERRA,
    borderRadius: 0,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  authButtonDisabled: {
    opacity: 0.5,
  },
  authButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  switchButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: LIGHT_TEXT,
  },
  switchButtonLink: {
    color: TERRA,
  },
});
