import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

// Title case helper - capitalize first letter of each word
const toTitleCase = (str: string): string => {
  if (!str) return '';
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index === 0 || !smallWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};

interface DishChipProps {
  dishName: string;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export const DishChip: React.FC<DishChipProps> = ({ 
  dishName, 
  onRemove, 
  showRemoveButton = false 
}) => {
  const displayName = toTitleCase(dishName);
  
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>🍽️ {displayName}</Text>
      {showRemoveButton && onRemove && (
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={onRemove}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.secondary + '20',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    gap: 6,
  },
  chipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.secondary,
    fontWeight: '300',
  },
  removeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
