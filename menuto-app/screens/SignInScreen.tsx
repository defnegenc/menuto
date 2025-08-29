import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { theme } from '../theme';

interface Props {
  onSignInComplete: () => void;
}

export function SignInScreen({ onSignInComplete }: Props) {
  const [name, setName] = useState('');
  const { setUser } = useStore();

  const handleSignIn = () => {
    if (!name.trim()) {
      Alert.alert('Please enter your name');
      return;
    }

    // Simple sign-in - just create a user with the name
    const userId = `user_${Date.now()}`;
    const newUser = {
      name: name.trim(),
      preferred_cuisines: [],
      spice_tolerance: 3,
      price_preference: 2,
      dietary_restrictions: [],
      favorite_restaurants: [],
      favorite_dishes: []
    };

    setUser(newUser, userId);
    onSignInComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Menuto!</Text>
        <Text style={styles.subtitle}>Get personalized menu recommendations</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>What's your name?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#7F8C8D"
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity 
          style={[styles.signInButton, !name.trim() && styles.signInButtonDisabled]} 
          onPress={handleSignIn}
          disabled={!name.trim()}
        >
          <Text style={styles.signInButtonText}>Get Started</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.primary,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  signInButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  signInButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});