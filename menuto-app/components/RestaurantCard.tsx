import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FavoriteRestaurant, FavoriteDish } from '../types';
import { theme } from '../theme';
import { Chip } from './Chip';

interface Props {
  restaurant: FavoriteRestaurant;
  dishes: FavoriteDish[];
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onRemoveRestaurant: (restaurantId: string) => void;
  rank?: number; // Optional rank for top restaurants (1-3)
}

export const RestaurantCard: React.FC<Props> = ({
  restaurant,
  dishes,
  onSelectRestaurant,
  onRemoveRestaurant,
  rank
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
      {rank === undefined && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemoveRestaurant(restaurant.place_id)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.restaurantContent}>
        <TouchableOpacity 
          style={styles.restaurantInfo}
          onPress={() => onSelectRestaurant(restaurant)}
        >
          <View style={styles.restaurantHeaderRow}>
            {rank !== undefined && (
              <View style={styles.restaurantRank}>
                <Text style={styles.rankText}>#{rank}</Text>
              </View>
            )}
            <View style={styles.restaurantHeader}>
              <Text style={[styles.restaurantName]}>{restaurant.name}</Text>
            </View>
          </View>
          <Text style={[
            styles.vicinity, 
            dishes.length === 0 && styles.vicinityNoDishes,
            rank !== undefined && styles.vicinityWithRank
          ]}>{parseAddress(restaurant.vicinity)}</Text>
        </TouchableOpacity>
        
        {/* Favorite Dishes Section */}
        {dishes.length > 0 && (
          <View style={styles.favoriteDishesSection}>
            <Text style={styles.favoriteDishesTitle}>Your Favorite Dishes:</Text>
            <View style={styles.dishesContainer}>
              {dishes.map((dish, index) => (
                <Chip
                  key={`${dish.dish_name}-${index}`}
                  text={dish.dish_name}
                  size="small"
                  variant="light"
                />
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
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  restaurantContent: {
    flex: 1,
    padding: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  restaurantInfo: {
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  restaurantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  restaurantRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  restaurantHeader: {
    flex: 1,
    marginBottom: 0,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  vicinity: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regularItalic,
    marginBottom: 0,
  },
  vicinityNoDishes: {
    marginBottom: theme.spacing.md,
  },
  vicinityWithRank: {
    marginTop: theme.spacing.sm,
  },
  favoriteDishesSection: {
    marginBottom: theme.spacing.md,
  },
  favoriteDishesTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#000000',
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  dishesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  modernAddButton: {
    backgroundColor: theme.colors.primary, // Dark green
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    padding: theme.spacing.sm,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary,
    fontWeight: 600,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
});
