import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FavoriteRestaurant, FavoriteDish } from '../types';

const RED = '#E9323D';

interface Props {
  restaurant: FavoriteRestaurant;
  dishes: FavoriteDish[];
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onRemoveRestaurant: (restaurantId: string) => void;
  rank?: number;
}

export const RestaurantCard: React.FC<Props> = ({
  restaurant,
  dishes,
  onSelectRestaurant,
  onRemoveRestaurant,
  rank,
}: Props) => {
  const parseAddress = (vicinity: string) => {
    const parts = vicinity.split(',').map(part => part.trim());
    return parts.slice(0, 3).join(', ');
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelectRestaurant(restaurant)}
      activeOpacity={0.7}
    >
      {/* Name row */}
      <View style={styles.nameRow}>
        {rank !== undefined && (
          <Text style={styles.rankText}>#{rank}</Text>
        )}
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
      </View>

      {/* Address + cuisine */}
      <Text style={styles.address} numberOfLines={1}>
        {parseAddress(restaurant.vicinity)}
      </Text>
      {restaurant.cuisine_type && restaurant.cuisine_type !== 'Restaurant' && (
        <Text style={styles.cuisineLine}>
          {restaurant.cuisine_type.toUpperCase()}{restaurant.rating ? ` · ${restaurant.rating}★` : ''}
        </Text>
      )}

      {/* Favorites — dashed red border box */}
      {dishes.length > 0 && (
        <View style={styles.favoritesBox}>
          <Text style={styles.favoritesLabel}>YOUR FAVORITES</Text>
          <Text style={styles.favoritesList}>
            {dishes.map(d => d.dish_name).join(', ')}
          </Text>
        </View>
      )}

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <Text style={styles.ctaText}>
          {dishes.length > 0 ? 'View menu →' : '+ Add favorite dishes'}
        </Text>
        {rank === undefined && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onRemoveRestaurant(restaurant.place_id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: RED,
  },
  name: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 22,
    color: '#1A1A1A',
    letterSpacing: -0.5,
    flex: 1,
  },
  address: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#666666',
  },
  cuisineLine: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: RED,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  // Favorites — dashed red border (matches RestaurantDetailScreen)
  favoritesBox: {
    borderWidth: 1.5,
    borderColor: RED,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  favoritesLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: RED,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  favoritesList: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#444444',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    color: RED,
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#999999',
  },
});
