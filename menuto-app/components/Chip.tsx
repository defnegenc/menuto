import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

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
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 25,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Size variants
  chipSmall: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipLarge: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  
  // Color variants
  chipLight: {
    backgroundColor: theme.colors.chipDefault, // #F0E0E3
  },
  chipDark: {
    backgroundColor: theme.colors.secondary,
  },
  
  // Text styles
  chipText: {
    fontWeight: '500',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  chipTextSmall: {
    fontSize: theme.typography.sizes.sm,
  },
  chipTextLarge: {
    fontSize: theme.typography.sizes.md,
  },
  chipTextLight: {
    color: theme.colors.secondary,
  },
  chipTextDark: {
    color: '#FFFFFF',
  },
});
