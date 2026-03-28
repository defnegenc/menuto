import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

const screenWidth = Dimensions.get('window').width;

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  showUnderline?: boolean; // Control whether to show the underline
  restaurant?: {
    name: string;
    vicinity: string;
  }; // Optional restaurant info to display in header
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
  showUnderline = true, // Default to showing underline
  restaurant,
  rightButton,
}: Props) => {
  const insets = useSafeAreaInsets();
  
  // Parse address to show street, city, and state (exclude zip and country)
  const parseAddress = (vicinity: string) => {
    const parts = vicinity.split(',').map(part => part.trim());
    return parts.slice(0, 3).join(', ');
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {/* Title and subtitle */}
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          {restaurant && (
            <>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantAddress}>{parseAddress(restaurant.vicinity)}</Text>
            </>
          )}
        </View>
        {subtitle && (
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        )}
        
        {/* Underline */}
        {showUnderline && <View style={styles.headerUnderline} />}
        
        {/* Back button below line */}
        {showBackButton && onBack && (
          <TouchableOpacity 
            style={styles.backButtonBelow} 
            onPress={() => {
              console.log('🔙 UnifiedHeader: Back button pressed');
              onBack();
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
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
    paddingBottom: theme.spacing.md,
    position: 'relative',
  },
  backButtonBelow: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  restaurantAddress: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    fontFamily: 'DMSans-Regular',
  },
  headerUnderline: {
    height: 2,
    width: screenWidth * 0.9,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    alignSelf: 'center',
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
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  rightButtonLabelText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    fontFamily: theme.typography.fontFamilies.medium,
  },
});
