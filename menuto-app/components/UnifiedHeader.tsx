import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {/* Back button if needed */}
        {showBackButton && onBack && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              console.log('🔙 UnifiedHeader: Back button pressed');
              onBack();
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        
        {/* Title and subtitle centered */}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        )}
        
        {/* Right button if needed */}
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
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: theme.spacing.lg,
    top: theme.spacing.md,
    padding: theme.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    fontFamily: 'Artifact',
    lineHeight: theme.typography.sizes.heading * 1.4, // Add text height (lineHeight)
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
  rightButton: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
