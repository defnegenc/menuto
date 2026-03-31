import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  rank?: number;
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
  rank,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {/* Rank + Name row */}
      <View style={styles.nameRow}>
        {rank !== undefined && (
          <Text style={styles.rank}>#{rank}</Text>
        )}
        <Text style={styles.name} numberOfLines={2}>{capitalizeText(dish.name)}</Text>
        {isFavorite && <Text style={styles.heart}>♥</Text>}
      </View>

      {/* Description */}
      {dish.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {capitalizeText(dish.description)}
        </Text>
      ) : null}

      {/* Price + action */}
      <View style={styles.bottomRow}>
        {dish.price ? (
          <Text style={styles.price}>${dish.price}</Text>
        ) : <View />}

        {onAddToFavorites && (
          <TouchableOpacity
            onPress={() => onAddToFavorites(dish)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addText}>
              {isFavorite ? '✓ Added' : '+ Add'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 6,
  },
  cardSelected: {
    borderBottomColor: RED,
  },
  // Name row
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rank: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: RED,
    minWidth: 20,
  },
  name: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 20,
    color: '#1A1A1A',
    letterSpacing: -0.3,
    flex: 1,
  },
  heart: {
    fontSize: 16,
    color: RED,
  },
  // Description
  description: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
  },
  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 15,
    color: '#1A1A1A',
  },
  addText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
    color: RED,
  },
});
