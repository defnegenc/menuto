import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// Utility function to properly capitalize text
const capitalizeText = (text: string): string => {
  if (!text) return text;
  
  // If text is all caps, convert to title case
  if (text === text.toUpperCase() && text.length > 1) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  
  // Otherwise, just capitalize first letter
  return text.charAt(0).toUpperCase() + text.slice(1);
};

interface Props {
  text: string;
  size?: 'small' | 'large';
  variant?: 'light' | 'dark';
  style?: any;
}

export const Chip: React.FC<Props> = ({
  text,
  size = 'small',
  variant = 'light',
  style
}) => {
  return (
    <View style={[
      styles.chip,
      size === 'small' ? styles.chipSmall : styles.chipLarge,
      variant === 'light' ? styles.chipLight : styles.chipDark,
      style
    ]}>
      <Text style={[
        styles.chipText,
        size === 'small' ? styles.chipTextSmall : styles.chipTextLarge,
        variant === 'light' ? styles.chipTextLight : styles.chipTextDark,
      ]}>
        {capitalizeText(text)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Size variants
  chipSmall: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    minHeight: 24,
  },
  chipLarge: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    minHeight: 32,
  },
  
  // Color variants
  chipLight: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
  },
  chipDark: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  
  // Text styles
  chipText: {
    fontWeight: '400',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  chipTextSmall: {
    fontSize: 10.5,
  },
  chipTextLarge: {
    fontSize: theme.typography.sizes.lg,
  },
  chipTextLight: {
    color: theme.colors.primary,
  },
  chipTextDark: {
    color: '#FFFFFF',
  },
});


