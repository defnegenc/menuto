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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp, useAuth } from '@clerk/clerk-expo';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { theme } from '../theme';

interface Props {
  onAuthComplete: () => void;
}

export function ClerkAuthScreen({ onAuthComplete }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [signUpAttempt, setSignUpAttempt] = useState<any>(null);
  
  const { signIn, setActive } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { userId: authUserId } = useAuth();
  const { setUser } = useStore();
  const [pendingUserPayload, setPendingUserPayload] = useState<any | null>(null);

  // Persist to Supabase only when we actually HAVE a userId from Clerk
  React.useEffect(() => {
    if (!authUserId || !pendingUserPayload) return;
    
    (async () => {
      try {
        console.log('🔄 ClerkAuthScreen: Persisting user with Clerk ID:', authUserId);
        
        // Try to load existing user data first
        try {
          const userData = await api.getUserPreferences(authUserId);
          if (userData) {
            console.log('✅ ClerkAuthScreen: Found existing user data');
            setUser(userData, authUserId);
          } else {
            console.log('🔄 ClerkAuthScreen: No existing data, creating new user in Supabase');
            // Create user in Supabase with the pending payload
            const userToCreate = { id: authUserId, ...pendingUserPayload };
            await api.saveUserPreferences(authUserId, userToCreate);
            console.log('✅ ClerkAuthScreen: User created in Supabase');
            setUser(userToCreate, authUserId);
          }
        } catch (error) {
          console.log('❌ ClerkAuthScreen: Failed to load user data, creating new user in Supabase');
          // Create user in Supabase with the pending payload
          const userToCreate = { id: authUserId, ...pendingUserPayload };
          await api.saveUserPreferences(authUserId, userToCreate);
          console.log('✅ ClerkAuthScreen: User created in Supabase');
          setUser(userToCreate, authUserId);
        }
        
        setPendingUserPayload(null);
        
        // Add a small delay to ensure the user data is properly set in the store
        // before calling onAuthComplete
        setTimeout(() => {
          onAuthComplete();
        }, 100);
      } catch (e) {
        console.log('❌ ClerkAuthScreen: Failed to upsert user in Supabase', e);
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
      console.log('Attempting to verify email with code...');
      await signUpAttempt.attemptEmailAddressVerification({
        code: verificationCode.trim()
      });

      console.log('Email verified, completing signup...');
      
      // Activate the Clerk session first
      await setActiveSignUp({ session: signUpAttempt.createdSessionId });
      console.log('✅ Clerk session activated after email verification');

      // Use the actual Clerk user ID - never fall back to generated IDs
      const userId = signUpAttempt.createdUserId;
      if (!userId) {
        console.error('❌ No Clerk user ID available after verification');
        Alert.alert('Error', 'Unable to create user profile. Please try again.');
        return;
      }
      console.log('🔄 Email verification: Preparing user payload for Clerk ID:', userId);
      // prepare the payload but DO NOT call setUser yet
      setPendingUserPayload({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        home_base: undefined,
        preferred_cuisines: [],
        spice_tolerance: 3,
        price_preference: 2,
        dietary_restrictions: [],
        favorite_restaurants: [],
        favorite_dishes: [],
      });
      // effect above will fire once authUserId becomes truthy and handle onAuthComplete
      
      Alert.alert(
        'Success', 
        'Account created successfully!'
      );
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.errors?.[0]?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    // Check if user is already signed in
    if (authUserId && !isSignUp) {
      console.log('🔄 User already signed in, proceeding with auth complete');
      // User is already signed in, just proceed - no need to set pending payload
      // The App.tsx will handle loading existing user data
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
            username: username.trim(),
            email: email.trim(),
            preferred_cuisines: [],
            spice_tolerance: 3,
            price_preference: 2,
            dietary_restrictions: [],
            favorite_restaurants: [],
            favorite_dishes: []
          };

          console.log('🔄 Sign-up: Preparing user payload for Clerk ID:', result.createdUserId);
          // prepare the payload but DO NOT call setUser yet
          setPendingUserPayload({
            name: name.trim(),
            username: username.trim(),
            email: email.trim(),
            home_base: undefined,
            preferred_cuisines: [],
            spice_tolerance: 3,
            price_preference: 2,
            dietary_restrictions: [],
            favorite_restaurants: [],
            favorite_dishes: [],
          });
          // effect above will fire once authUserId becomes truthy and handle onAuthComplete
          
          Alert.alert(
            'Success', 
            'Account created successfully!'
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
          
          // For sign-in, don't set pending payload - let App.tsx load existing user data
          // The App.tsx useEffect will detect the new authUserId and load user data
          console.log('✅ Sign-in complete, App.tsx will handle loading user data');
          
          Alert.alert(
            'Success', 
            'Signed in successfully!'
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
