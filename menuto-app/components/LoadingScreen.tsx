import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading recommendations", 
  subMessage = "Cooking up something good..."
}) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  const rotatingMessages = [
    "Cooking up something good...",
    "Finding your perfect match...",
    "I hope you're hungry...",
    "Deciding... kinda nervous...",
    "You're in for a treat..."
  ];

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Rotate messages every 2 seconds
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => 
        (prevIndex + 1) % rotatingMessages.length
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Animated loading icon */}
        <View style={styles.loadingIcon}>
          <LoadingSpinner size={60} color={theme.colors.primary} />
        </View>

        {/* Loading text */}
        <Text style={styles.loadingText}>
          {message}
        </Text>

        {/* Sub message - use rotating messages if no custom subMessage provided */}
        <Text style={styles.subText}>
          {subMessage === "Cooking up something good..." 
            ? rotatingMessages[currentMessageIndex] 
            : subMessage}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    alignItems: 'center',
    padding: theme.spacing.xxxl,
  },
  loadingIcon: {
    marginBottom: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
