import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface SelectionDishCardProps {
  dish: {
    name: string;
    description: string;
    score: number;
  };
  isSelected: boolean;
  onPress: () => void;
  showScore?: boolean;
}

export const SelectionDishCard: React.FC<SelectionDishCardProps> = ({
  dish,
  isSelected,
  onPress,
  showScore = true,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.selectedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={[
          styles.dishName,
          isSelected && styles.selectedDishName
        ]}>
          {dish.name}
        </Text>
        
        <Text style={[
          styles.description,
          isSelected && styles.selectedDescription
        ]}>
          {dish.description}
        </Text>
        
        {showScore && (
          <Text style={[
            styles.score,
            isSelected && styles.selectedScore
          ]}>
            Score: {dish.score}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...theme.shadows.sm,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    backgroundColor: '#FFEEEE',
  },
  content: {
    flex: 1,
  },
  dishName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  selectedDishName: {
    color: theme.colors.secondary,
  },
  description: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  selectedDescription: {
    color: theme.colors.text.primary,
  },
  score: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  selectedScore: {
    color: theme.colors.secondary,
  },
});
