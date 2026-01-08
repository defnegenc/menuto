import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { ParsedDish } from '../types';

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

interface MenuItemCardProps {
  dish: ParsedDish;
  onAddToFavorites?: (dish: ParsedDish) => void;
  onPress?: () => void;
  isFavorite?: boolean;
  isSelected?: boolean;
  showScore?: boolean;
  isFeatured?: boolean;
  onScorePress?: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  dish,
  onAddToFavorites,
  onPress,
  isFavorite = false,
  isSelected = false,
  showScore = false,
  isFeatured = false,
  onScorePress
}) => {
  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        isFavorite && styles.lightPinkCard,
        isSelected && styles.selectedCard,
        isFeatured && styles.featuredCard
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{capitalizeText(dish.name)}</Text>
          {dish.description ? (
            <Text style={[styles.dishDescription, isFavorite && styles.dishDescriptionFavorited]}>{capitalizeText(dish.description)}</Text>
          ) : null}
          {showScore && dish.score && (
            <TouchableOpacity onPress={onScorePress} disabled={!onScorePress}>
              <Text style={styles.scoreText}>Score: {dish.score.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {onAddToFavorites && (
          <TouchableOpacity
            style={[styles.addButton, isFavorite && styles.addButtonActive]}
            onPress={() => onAddToFavorites(dish)}
          >
            <Text style={[styles.addButtonText, isFavorite && styles.addButtonTextActive]}>
              {isFavorite ? 'Remove' : '+ Add'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  lightPinkCard: { 
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
  },
  content: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  dishInfo: { 
    flex: 1, 
    marginRight: 12 
  },
  dishName: { 
    fontSize: 13, 
    fontWeight: theme.typography.weights.normal, 
    color: '#000000', 
    marginBottom: 4,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  dishDescription: { 
    fontSize: 12, 
    color: 'rgba(0, 0, 0, 0.5)',
    lineHeight: 18,
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  dishDescriptionFavorited: {
    color: '#666666', // Darker grey for favorited dishes
  },

  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addButtonActive: {
    backgroundColor: theme.colors.primary, 
    borderColor: theme.colors.primary,
  },
  addButtonText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  addButtonTextActive: { 
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  scoreText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  featuredCard: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
});