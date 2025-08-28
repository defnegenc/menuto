import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  showDots?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading...", 
  subMessage,
  showDots = false 
}) => {
  const [dotCount, setDotCount] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

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

    // Animated dots
    if (showDots) {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [fadeAnim, scaleAnim, showDots]);

  const dots = '.'.repeat(dotCount);

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
          <LoadingSpinner size={60} color={theme.colors.secondary} />
        </View>

        {/* Loading text */}
        <Text style={styles.loadingText}>
          {message}
        </Text>

        {/* Sub message */}
        {subMessage && (
          <Text style={styles.subText}>{subMessage}</Text>
        )}

        {/* Decorative elements */}
        <View style={styles.decorativeContainer}>
          <View style={styles.decorativeDot} />
          <View style={[styles.decorativeDot, styles.decorativeDot2]} />
          <View style={[styles.decorativeDot, styles.decorativeDot3]} />
        </View>
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
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  subText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  decorativeContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary + '40',
  },
  decorativeDot2: {
    backgroundColor: theme.colors.primary + '40',
  },
  decorativeDot3: {
    backgroundColor: theme.colors.tertiary + '40',
  },
});
