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
import { useSignIn, useSignUp, useAuth } from '@clerk/clerk-expo';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { theme } from '../theme';
import { formatLastAuthMethod, getLastAuth, setLastAuth } from '../utils/lastAuth';

interface Props {
  onAuthComplete: () => void;
}

export function ClerkAuthScreen({ onAuthComplete }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email'); // Toggle between email and phone
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [signUpAttempt, setSignUpAttempt] = useState<any>(null);
  const [lastAuthLabel, setLastAuthLabel] = useState<string | null>(null);
  const [lastAuthIdentifier, setLastAuthIdentifier] = useState<string | null>(null);
  
  const { signIn, setActive } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { userId: authUserId } = useAuth();
  const { setUser } = useStore();
  const [pendingUserPayload, setPendingUserPayload] = useState<any | null>(null);

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

  // Persist to Supabase only when we actually HAVE a userId from Clerk
  React.useEffect(() => {
    if (!authUserId || !pendingUserPayload) return;
    
    (async () => {
      try {
        // Try to load existing user data first
        try {
          const userData = await api.getUserPreferences(authUserId);
          if (userData) {
            let updatedUser = userData;
            if (pendingUserPayload) {
              const mergedPayload = Object.fromEntries(
                Object.entries(pendingUserPayload).filter(([, value]) => value !== undefined && value !== null)
              );
              updatedUser = { ...userData, ...mergedPayload };
              await api.saveUserPreferences(authUserId, updatedUser);
            }
            setUser(updatedUser, authUserId);
          } else {
            // Create user in Supabase with the pending payload
            const userToCreate = { id: authUserId, ...pendingUserPayload };
            await api.saveUserPreferences(authUserId, userToCreate);
            setUser(userToCreate, authUserId);
          }
        } catch (error) {
          // Create user in Supabase with the pending payload
          const userToCreate = { id: authUserId, ...pendingUserPayload };
          await api.saveUserPreferences(authUserId, userToCreate);
          setUser(userToCreate, authUserId);
        }
        
        setPendingUserPayload(null);
        
        // Add a small delay to ensure the user data is properly set in the store
        // before calling onAuthComplete
        setTimeout(() => {
          onAuthComplete();
        }, 100);
      } catch (e) {
        console.error('Failed to save user data:', e);
        Alert.alert('Error', 'Failed to save user data. Please try again.');
      }
    })();
  }, [authUserId, pendingUserPayload, setUser, onAuthComplete]);

  // Add null checks for Clerk hooks
  if (!signIn || !signUp || !setActive || !setActiveSignUp) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Loading...</Text>
          <Text style={styles.subtitle}>Please wait while we initialize authentication.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // More robust password validation
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    // Check for at least one letter and one number (common requirement)
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: '' };
  };

  const validatePhoneNumber = (phone: string) => {
    // Basic E.164 format validation (international format)
    // Should start with + followed by country code and number
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  const validateUsername = (username: string) => {
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await signUpAttempt.attemptEmailAddressVerification({
        code: verificationCode.trim()
      });
      
      // Activate the Clerk session first
      await setActiveSignUp({ session: signUpAttempt.createdSessionId });

      // Use the actual Clerk user ID - never fall back to generated IDs
      const userId = signUpAttempt.createdUserId;
      if (!userId) {
        Alert.alert('Error', 'Unable to create user profile. Please try again.');
        return;
      }
      const sanitizedPayload = {
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        email: email.trim(),
        home_base: undefined,
        preferred_cuisines: [],
        spice_tolerance: 3,
        price_preference: 2,
        dietary_restrictions: [],
        favorite_restaurants: [],
        favorite_dishes: [],
      };
      setPendingUserPayload(sanitizedPayload);
      // effect above will fire once authUserId becomes truthy and handle onAuthComplete
      
      Alert.alert(
        'Success', 
        'Account created successfully!'
      );
    } catch (error: any) {
      Alert.alert('Error', error.errors?.[0]?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    // Check if user is already signed in
    if (authUserId && !isSignUp) {
      onAuthComplete();
      return;
    }

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
        // Starting sign up process
        // Sign up with Clerk
        const result = await signUp.create({
          emailAddress: email,
          password,
        });

        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId });
          await setLastAuth({ method: 'email_password_sign_up', identifier: email.trim() || undefined, ts: Date.now() });
          
          const sanitizedPayload = {
            name: name.trim() || undefined,
            username: username.trim() || undefined,
            email: email.trim(),
            home_base: undefined,
            preferred_cuisines: [],
            spice_tolerance: 3,
            price_preference: 2,
            dietary_restrictions: [],
            favorite_restaurants: [],
            favorite_dishes: [],
          };
          
          setPendingUserPayload(sanitizedPayload);

          Alert.alert(
            'Success', 
            'Account created successfully!'
          );
        } else if (result.status === 'missing_requirements') {
          // Check if email verification is needed
          if (result.verifications?.emailAddress) {
            try {
              await result.prepareEmailAddressVerification();
              setSignUpAttempt(result);
              setShowVerification(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to send verification email. Please try again.');
            }
          } else {
            Alert.alert('Error', 'Please complete all required fields.');
          }
        } else {
          Alert.alert('Error', `Signup status: ${result.status}`);
        }
      } else {
        // Sign in with Clerk
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          await setLastAuth({ method: 'email_password_sign_in', identifier: email.trim() || undefined, ts: Date.now() });
          
          // For sign-in, don't set pending payload - let App.tsx load existing user data
          // The App.tsx useEffect will detect the new authUserId and load user data
          
          Alert.alert(
            'Success', 
            'Signed in successfully!'
          );
        }
      }
    } catch (error: any) {
      const msg = error?.errors?.[0]?.message || error?.message || 'Authentication failed';
      // Common Clerk error when user tries to sign in but doesn't exist
      if (!isSignUp && typeof msg === 'string' && msg.toLowerCase().includes("couldn't find your account")) {
        Alert.alert('Account not found', 'No account exists for this email. Want to sign up instead?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => setIsSignUp(true) },
        ]);
      } else {
        Alert.alert('Error', msg);
      }
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
                  {lastAuthIdentifier ? ` • ${lastAuthIdentifier}` : ''}
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
