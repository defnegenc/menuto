import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { theme } from '../theme';
import { FavoriteRestaurant } from '../types';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onSignOut?: () => void;
}

export function ProfileScreen({ onSelectRestaurant, onSignOut }: Props) {
  const { user } = useStore();
  
  // Use favorite restaurants (first 3) for the top restaurants display
  const top3Restaurants = user?.favorite_restaurants?.slice(0, 3) || [];
  
  const getSpiceEmoji = (level: number) => {
    return '🌶️'.repeat(level);
  };
  
  const getPriceEmoji = (level: number) => {
    return '$'.repeat(level);
  };

  const renderChip = (text: string) => (
    <View key={text} style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Profile Pic and Name */}
        <View style={styles.header}>
          <View style={styles.profilePicContainer}>
            <View style={styles.profilePic}>
              <Text style={styles.profilePicText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Preferences</Text>
          
          {/* Cuisine Preferences */}
          {user?.preferred_cuisines && user.preferred_cuisines.length > 0 && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Favorite Cuisines</Text>
              <View style={styles.chipsContainer}>
                {user.preferred_cuisines.map(cuisine => 
                  renderChip(cuisine.charAt(0).toUpperCase() + cuisine.slice(1))
                )}
              </View>
            </View>
          )}

          {/* Spice Tolerance */}
          {user?.spice_tolerance && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Spice Tolerance</Text>
              <View style={styles.spiceContainer}>
                <Text style={styles.spiceEmoji}>{getSpiceEmoji(user.spice_tolerance)}</Text>
                <Text style={styles.spiceText}>Level {user.spice_tolerance}/5</Text>
              </View>
            </View>
          )}

          {/* Price Preference */}
          {user?.price_preference && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Price Preference</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceEmoji}>{getPriceEmoji(user.price_preference)}</Text>
                <Text style={styles.priceText}>
                  {user.price_preference === 1 ? 'Very Budget-friendly' :
                   user.price_preference === 2 ? 'Budget-friendly' :
                   user.price_preference === 3 ? 'Moderate' : 'Premium'}
                </Text>
              </View>
            </View>
          )}

          {/* Dietary Restrictions */}
          {user?.dietary_restrictions && user.dietary_restrictions.length > 0 && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Dietary Restrictions</Text>
              <View style={styles.chipsContainer}>
                {user.dietary_restrictions.map(restriction => 
                  renderChip(restriction.charAt(0).toUpperCase() + restriction.slice(1))
                )}
              </View>
            </View>
          )}
        </View>

        {/* Top 3 Restaurants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Top Restaurants</Text>
          {top3Restaurants.length > 0 ? (
            <View style={styles.restaurantsContainer}>
              {top3Restaurants.map((restaurant: any, index: number) => (
                <TouchableOpacity
                  key={restaurant.place_id}
                  style={styles.restaurantCard}
                  onPress={() => onSelectRestaurant(restaurant)}
                >
                  <View style={styles.restaurantRank}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.restaurantInfo}>
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    <Text style={styles.restaurantLocation}>{restaurant.vicinity}</Text>
                    {restaurant.cuisine_type && (
                      <Text style={styles.restaurantCuisine}>{restaurant.cuisine_type}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No restaurants added yet</Text>
              <Text style={styles.emptyStateSubtext}>Add restaurants to see them here</Text>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
        {onSignOut && (
          <View style={styles.signOutContainer}>
            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  profilePicContainer: {
    marginBottom: 16,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  preferenceGroup: {
    marginBottom: 24,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  spiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spiceEmoji: {
    fontSize: 20,
  },
  spiceText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceEmoji: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  priceText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  restaurantsContainer: {
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  restaurantLocation: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: theme.colors.tertiary,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  signOutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  signOutButton: {
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});