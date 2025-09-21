import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FavoriteRestaurant, FavoriteDish } from '../types';
import { theme } from '../theme';
import { DishChip } from './DishChip';

interface Props {
  restaurant: FavoriteRestaurant;
  dishes: FavoriteDish[];
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onRemoveRestaurant: (restaurantId: string) => void;
}

export const RestaurantCard: React.FC<Props> = ({
  restaurant,
  dishes,
  onSelectRestaurant,
  onRemoveRestaurant
}) => {
  // Parse address to show street, city, and state (exclude zip and country)
  const parseAddress = (vicinity: string) => {
    // Split by comma and take first 3 parts (street, city, state)
    const parts = vicinity.split(',').map(part => part.trim());
    // Remove zip code and country, keep street, city, state
    return parts.slice(0, 3).join(', ');
  };

  return (
    <View style={styles.restaurantCard}>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemoveRestaurant(restaurant.place_id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
      
      <View style={styles.restaurantContent}>
        <TouchableOpacity 
          style={styles.restaurantInfo}
          onPress={() => onSelectRestaurant(restaurant)}
        >
          <View style={styles.restaurantHeader}>
            <Text style={[styles.restaurantName]}>{restaurant.name}</Text>
          </View>
          <Text style={styles.vicinity}>{parseAddress(restaurant.vicinity)}</Text>
        </TouchableOpacity>
        
        {/* Favorite Dishes Section */}
        {dishes.length > 0 && (
          <View style={styles.favoriteDishesSection}>
            <Text style={styles.favoriteDishesTitle}>Your Favorite Dishes:</Text>
            <View style={styles.dishesContainer}>
              {dishes.map((dish, index) => (
                <View key={`${dish.dish_name}-${index}`} style={styles.modernDishChip}>
                  <Text style={styles.dishChipText}>{dish.dish_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Add Button */}
        <TouchableOpacity 
          style={styles.modernAddButton}
          onPress={() => onSelectRestaurant(restaurant)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            + {dishes.length > 0 ? 'Add Another Favorite' : 'Add Favorite Dish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    position: 'relative',
    ...theme.shadows.md,
  },
  restaurantContent: {
    flex: 1,
    padding: 16,
    paddingHorizontal: 16,
    gap: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  restaurantInfo: {
    marginBottom: theme.spacing.md,
  },
  restaurantHeader: {
    marginBottom: 0,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.bold,
    marginBottom: 4,
  },
  vicinity: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.regular,
    marginBottom: 0,
  },
  favoriteDishesSection: {
    marginBottom: theme.spacing.sm,
  },
  favoriteDishesTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  dishesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  modernDishChip: {
    backgroundColor: theme.colors.chipDefault, // #F0E0E3
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 25,
    borderWidth: 0,
  },
  dishChipText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
    color: theme.colors.secondary, // Black text
    fontFamily: theme.typography.fontFamilies.medium,
  },
  modernAddButton: {
    backgroundColor: theme.colors.secondary, // Dark red
    borderRadius: 8.753,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    padding: theme.spacing.xs,
    zIndex: 1,
  },
  removeButtonText: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
    fontWeight: 600,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
});
