import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  // Optional right button props
  rightButton?: {
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'text'; // Different styles
  };
}

export const UnifiedHeader: React.FC<Props> = ({ 
  title, 
  subtitle, 
  onBack, 
  showBackButton = false,
  rightButton
}) => {
  return (
    <SafeAreaView style={styles.header}>
      <View style={styles.headerContent}>
        {/* Left side - Back button or spacer */}
        <View style={styles.leftSection}>
          {showBackButton && onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Center - Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, theme.typography.h1.fancy]}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
        
        {/* Right side - Optional button or spacer */}
        <View style={styles.rightSection}>
          {rightButton && (
            <TouchableOpacity 
              style={[
                styles.rightButton,
                rightButton.variant === 'text' ? styles.rightButtonText : styles.rightButtonPrimary
              ]} 
              onPress={rightButton.onPress}
            >
              <Text style={[
                styles.rightButtonLabel,
                rightButton.variant === 'text' ? styles.rightButtonLabelText : styles.rightButtonLabelPrimary
              ]}>
                {rightButton.text}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },
  leftSection: {
    width: 80, // Increased width
    justifyContent: 'flex-start',
  },
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: theme.spacing.xs, // Add slight top padding to align with button
  },
  title: {
    marginBottom: theme.spacing.sm, // Increased space below title
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
    marginBottom: theme.spacing.xs, // Add bottom margin to subtitle
  },
  rightSection: {
    width: 80, // Increased width to match left
    alignItems: 'flex-end',
  },
  rightButton: {
    borderRadius: theme.borderRadius.lg, // Larger radius
    paddingHorizontal: theme.spacing.md, // Increased padding
    paddingVertical: theme.spacing.sm, // Increased padding
  },
  rightButtonPrimary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  rightButtonText: {
    backgroundColor: 'transparent',
  },
  rightButtonLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  rightButtonLabelPrimary: {
    color: theme.colors.text.light,
  },
  rightButtonLabelText: {
    color: theme.colors.primary,
  },
});
