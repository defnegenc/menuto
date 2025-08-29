import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { theme } from '../theme';

interface Props {
  onAuthComplete: () => void;
}

export function ClerkAuthScreen({ onAuthComplete }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [signUpAttempt, setSignUpAttempt] = useState<any>(null);
  
  const { signIn, setActive } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { setUser } = useStore();

  // Add null checks for Clerk hooks
  if (!signIn || !signUp || !setActive || !setActiveSignUp) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Removed excessive console logs

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting to verify email with code...');
      await signUpAttempt.attemptEmailAddressVerification({
        code: verificationCode.trim()
      });

      console.log('Email verified, completing signup...');
      
      // Create user profile in Supabase
      const newUser = {
        name: name.trim(),
        email: email.trim(),
        preferred_cuisines: [],
        spice_tolerance: 3,
        price_preference: 2,
        dietary_restrictions: [],
        favorite_restaurants: [],
        favorite_dishes: []
      };

      // Clerk user IDs are not UUIDs, so we need to handle this differently
      // For now, let's use a UUID format or handle this in the backend
      const userId = signUpAttempt.createdUserId || `user_${Date.now()}`;
      console.log('Calling setUser with:', { newUser, userId });
      await setUser(newUser, userId);
      
      Alert.alert(
        'Success', 
        'Account created successfully!',
        [{ text: 'Continue', onPress: onAuthComplete }]
      );
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.errors?.[0]?.message || 'Verification failed');
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

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    console.log('Starting auth process...', { isSignUp, email });

    try {
      if (isSignUp) {
        // Starting sign up process
        // Sign up with Clerk
        const result = await signUp.create({
          emailAddress: email,
          password,
        });
        console.log('Sign up result:', result);

        if (result.status === 'complete') {
          console.log('Sign up completed, setting active session...');
          await setActiveSignUp({ session: result.createdSessionId });
          
          console.log('Creating user profile in Supabase...');
          // Create user profile in Supabase
          const newUser = {
            name: name.trim(),
            email: email.trim(),
            preferred_cuisines: [],
            spice_tolerance: 3,
            price_preference: 2,
            dietary_restrictions: [],
            favorite_restaurants: [],
            favorite_dishes: []
          };

          console.log('Calling setUser with:', { newUser, userId: result.createdUserId });
          await setUser(newUser, result.createdUserId!);
          
          Alert.alert(
            'Success', 
            'Account created successfully!',
            [{ text: 'Continue', onPress: onAuthComplete }]
          );
        } else if (result.status === 'missing_requirements') {
          console.log('Sign up needs email verification...');
          
          // Check if email verification is needed
          if (result.verifications?.emailAddress) {
            console.log('Preparing email verification...');
            try {
              await result.prepareEmailAddressVerification();
              setSignUpAttempt(result);
              setShowVerification(true);
            } catch (error) {
              console.error('Email verification error:', error);
              Alert.alert('Error', 'Failed to send verification email. Please try again.');
            }
          } else {
            console.log('Other missing requirements:', result.requiredFields);
            Alert.alert('Error', 'Please complete all required fields.');
          }
        } else {
          console.log('Sign up not complete, status:', result.status);
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
          
          // For sign-in, try to get the actual Clerk user ID from the session
          // Since we can't easily get it from the session, we'll use a consistent ID format
          const signInUserId = `user_${email.replace('@', '_').replace('.', '_')}`;
          
          // Try to load existing user data first
          console.log('Loading user data for:', signInUserId);
          
          // Load user profile from Supabase
          try {
            const userData = await api.getUserPreferences(signInUserId);
            if (userData) {
              await setUser(userData, signInUserId);
            } else {
              // Create new user if not found
              const newUser = {
                name: email.trim(), // Use email as name for sign-in
                email: email.trim(),
                preferred_cuisines: [],
                spice_tolerance: 3,
                price_preference: 2,
                dietary_restrictions: [],
                favorite_restaurants: [],
                favorite_dishes: []
              };
              await setUser(newUser, signInUserId);
            }
          } catch (error) {
            console.log('Failed to load user data, creating new user');
            // Create new user if loading fails
            const newUser = {
              name: email.trim(),
              email: email.trim(),
              preferred_cuisines: [],
              spice_tolerance: 3,
              price_preference: 2,
              dietary_restrictions: [],
              favorite_restaurants: [],
              favorite_dishes: []
            };
            await setUser(newUser, signInUserId);
          }
          
          Alert.alert(
            'Success', 
            'Signed in successfully!',
            [{ text: 'Continue', onPress: onAuthComplete }]
          );
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.errors?.[0]?.message || 'Authentication failed');
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
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Menuto!</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account to get started' : 'Sign in to continue'}
            </Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
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
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
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
