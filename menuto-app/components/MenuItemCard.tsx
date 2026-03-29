import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ParsedDish } from '../types';

const RED = '#E9323D';

const capitalizeText = (text: string): string => {
  if (!text) return text;
  if (text === text.toUpperCase() && text.length > 1) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
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
  onScorePress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isFavorite && styles.favoriteCard,
        isSelected && styles.selectedCard,
        isFeatured && styles.featuredCard,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.nameRow}>
          <Text style={styles.dishName}>{capitalizeText(dish.name)}</Text>
          {showScore && dish.score > 0 && (
            <TouchableOpacity onPress={onScorePress} disabled={!onScorePress}>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>
                  {dish.score > 1 ? Math.round(dish.score) : Math.round(dish.score * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        {onAddToFavorites && (
          <TouchableOpacity
            style={[styles.addButton, isFavorite && styles.addButtonActive]}
            onPress={() => onAddToFavorites(dish)}
          >
            <Text style={styles.addButtonText}>
              {isFavorite ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {dish.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {capitalizeText(dish.description)}
        </Text>
      ) : null}

      {dish.price ? (
        <Text style={styles.price}>${dish.price}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    gap: 6,
  },
  favoriteCard: {
    borderColor: RED,
    backgroundColor: '#FFF5F5',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: '#FFF5F5',
  },
  featuredCard: {
    borderColor: RED,
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
  },
  // Top row: name + score + add button
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dishName: {
    fontFamily: 'IBMPlexMono-SemiBold',
    fontSize: 15,
    color: '#111827',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    lineHeight: 20,
  },
  scoreBadge: {
    backgroundColor: '#FFF5F5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scoreText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: RED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Description
  description: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Price
  price: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#374151',
    marginTop: 2,
  },
  // Add button — circular
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  addButtonActive: {
    backgroundColor: RED,
    borderColor: RED,
  },
  addButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: RED,
  },
});
