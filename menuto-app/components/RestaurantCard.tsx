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
      {/* Top row: name + cuisine badge + remove */}
      <View style={styles.topRow}>
        <View style={styles.nameColumn}>
          {rank !== undefined && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        </View>
        {restaurant.cuisine_type && (
          <View style={styles.cuisineBadge}>
            <Text style={styles.cuisineText}>{restaurant.cuisine_type}</Text>
          </View>
        )}
      </View>

      {/* Address */}
      <Text style={styles.address} numberOfLines={1}>{parseAddress(restaurant.vicinity)}</Text>

      {/* Dishes */}
      {dishes.length > 0 && (
        <View style={styles.dishesSection}>
          <Text style={styles.dishesLabel}>FAVORITES</Text>
          <View style={styles.dishesRow}>
            {dishes.map((dish, index) => (
              <View key={`${dish.dish_name}-${index}`} style={styles.dishChip}>
                <Text style={styles.dishChipText}>{dish.dish_name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bottom: CTA + remove */}
      <View style={styles.bottomRow}>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>
            {dishes.length > 0 ? 'View menu →' : '+ Add favorite dishes'}
          </Text>
        </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    gap: 8,
  },
  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nameColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  name: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 19,
    color: '#111827',
    flex: 1,
  },
  cuisineBadge: {
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cuisineText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Address
  address: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Dishes
  dishesSection: {
    marginTop: 8,
    gap: 8,
  },
  dishesLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#D1D5DB',
    textTransform: 'uppercase',
  },
  dishesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dishChip: {
    backgroundColor: '#FFF5F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${RED}20`,
  },
  dishChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: RED,
  },
  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#D1D5DB',
  },
});
