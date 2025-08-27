import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { theme } from '../theme';

interface Props {
  onSignInComplete: () => void;
}

export function ClerkSignInScreen({ onSignInComplete }: Props) {
  const { user } = useUser();

  // If user is signed in, trigger completion
  React.useEffect(() => {
    if (user) {
      onSignInComplete();
    }
  }, [user, onSignInComplete]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Menuto!</Text>
          <Text style={styles.subtitle}>Get personalized menu recommendations</Text>
        </View>
        
        <View style={styles.signInSection}>
          <Text style={styles.signInText}>
            Please sign in to continue
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => {
              // For now, just trigger completion to bypass sign-in
              onSignInComplete();
            }}
          >
            <Text style={styles.signInButtonText}>Continue (Demo Mode)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  signInSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  signInText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});