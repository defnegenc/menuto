import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';
import { theme } from '../theme';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  color?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'medium', 
  text,
  color = theme.colors.primary 
}) => {
  const spinnerSize = size === 'small' ? 20 : size === 'medium' ? 30 : 40;
  const textSize = size === 'small' ? 'sm' : size === 'medium' ? 'md' : 'lg';

  return (
    <View style={styles.container}>
      <LoadingSpinner size={spinnerSize} color={color} />
      {text && (
        <Text style={[styles.text, { fontSize: theme.typography.sizes[textSize] }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  text: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
});
