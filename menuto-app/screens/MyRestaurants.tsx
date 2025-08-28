import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { FavoriteRestaurant, FavoriteDish } from '../types';
import { theme } from '../theme';
import { ProfileHeader } from '../components/ProfileHeader';
import { DishChip } from '../components/DishChip';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onAddRestaurant?: () => void;
}

export function MyRestaurants({ onSelectRestaurant, onAddRestaurant }: Props) {
  const { user, setUser, userId } = useStore();
  const [isLoading, setIsLoading] = useState(false);

  const favoriteRestaurants = user?.favorite_restaurants || [];
  const favoriteDishes = user?.favorite_dishes || [];

  const getFavoriteDishesForRestaurant = (restaurant: FavoriteRestaurant): FavoriteDish[] => {
    // Match by restaurant name since we don't have a proper restaurant_id mapping
    return favoriteDishes.filter(dish => 
      dish.restaurant_id === restaurant.place_id || 
      dish.restaurant_id === restaurant.name
    );
  };

  const handleRemoveRestaurant = (restaurantId: string) => {
    Alert.alert(
      'Remove Restaurant',
      'Are you sure you want to remove this restaurant from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeRestaurant(restaurantId)
        }
      ]
    );
  };

  const removeRestaurant = async (restaurantId: string) => {
    // TODO: Update user profile in backend
    // For now, just update local state
    console.log('Remove restaurant:', restaurantId);
  };

  const addTestRestaurant = () => {
    const testRestaurant: FavoriteRestaurant = {
      place_id: 'test_jacks_wife_freda',
      name: "Jack's Wife Freda",
      vicinity: 'New York, NY',
      cuisine_type: 'Mediterranean'
    };
    
    const testRestaurant2: FavoriteRestaurant = {
      place_id: 'test_sushi_bar',
      name: "Sushi Bar",
      vicinity: 'San Francisco, CA',
      cuisine_type: 'Japanese'
    };

    const updatedUser = {
      ...user,
      favorite_restaurants: [...favoriteRestaurants, testRestaurant, testRestaurant2],
      preferred_cuisines: user?.preferred_cuisines || [],
      spice_tolerance: user?.spice_tolerance || 0,
      price_preference: user?.price_preference || 0,
      dietary_restrictions: user?.dietary_restrictions || []
    };

    if (user && userId) {
      setUser(updatedUser, userId);
      Alert.alert('Success', 'Test restaurant added! You can now click on it to see the menu parsing.');
    }
  };

  const renderRestaurantCard = (restaurant: FavoriteRestaurant) => {
    const dishes = getFavoriteDishesForRestaurant(restaurant);
    
    return (
      <View key={restaurant.place_id} style={styles.restaurantCard}>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveRestaurant(restaurant.place_id)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.restaurantContent}>
          <TouchableOpacity 
            style={styles.restaurantInfo}
            onPress={() => onSelectRestaurant(restaurant)}
          >
            <View style={styles.restaurantHeader}>
              <Text style={[styles.restaurantName, theme.typography.h2.regular]}>{restaurant.name}</Text>
              <Text style={styles.cuisineType}>{restaurant.cuisine_type}</Text>
            </View>
            <Text style={styles.vicinity}>{restaurant.vicinity}</Text>
            <Text style={styles.tapHint}>Tap to scan menu or get recommendations</Text>
          </TouchableOpacity>
          
          {dishes.length > 0 && (
            <View style={styles.favoriteDishesSection}>
              <Text style={styles.favoriteDishesTitle}>Your Favorite Dishes:</Text>
              <View style={styles.dishesContainer}>
                {dishes.map((dish, index) => (
                  <DishChip
                    key={`${dish.dish_name}-${index}`}
                    dishName={dish.dish_name}
                  />
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.addDishButton}
              onPress={() => onSelectRestaurant(restaurant)}
            >
              <Text style={styles.addDishButtonText}>
                {dishes.length > 0 ? '+ Add Another Favorite' : '+ Add Favorite Dish'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ProfileHeader />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {favoriteRestaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🍽️</Text>
            <Text style={styles.emptyStateTitle}>No Restaurants Yet</Text>
            <Text style={styles.emptyStateText}>
              Use the "Add Restaurant" tab to find your favorite places and get personalized recommendations.
            </Text>
            <TouchableOpacity style={styles.addTestButton} onPress={addTestRestaurant}>
              <Text style={styles.addTestButtonText}>+ Add Test Restaurant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.restaurantList}>
            {favoriteRestaurants.map(renderRestaurantCard)}
          </View>
        )}
        
        {onAddRestaurant && (
          <TouchableOpacity style={styles.addRestaurantButton} onPress={onAddRestaurant}>
            <Text style={styles.addRestaurantButtonText}>+ Add Restaurant</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.huge,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 600,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xxxl,
  },
  addFirstButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxxl,
  },
  addFirstButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: 400,
  },
  addTestButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxxl,
    marginTop: theme.spacing.lg,
  },
  addTestButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: 400,
  },
  restaurantList: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    position: 'relative',
    ...theme.shadows.md,
  },
  restaurantContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  restaurantInfo: {
    marginBottom: theme.spacing.md,
  },
  restaurantHeader: {
    marginBottom: theme.spacing.xs,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: 600,
    color: theme.colors.text.primary,
  },
  cuisineType: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.tertiary,
    textTransform: 'capitalize',
    fontWeight: '500' as const,
  },
  vicinity: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  tapHint: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.muted,
    fontStyle: 'italic',
  },
  favoriteDishesSection: {
    marginBottom: theme.spacing.md,
  },
  favoriteDishesTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: 400,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  dishesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },

  actionButtons: {
    flexDirection: 'row',
  },
  addDishButton: {
    backgroundColor: theme.colors.tertiary + '15',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
    borderStyle: 'dashed',
  },
  addDishButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.tertiary,
    fontWeight: 300,
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
  },
  addMoreButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addMoreButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: 400,
  },
  addRestaurantButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  addRestaurantButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: 600,
  },
});