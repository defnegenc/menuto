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

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
}

export function ProfileScreen({ onSelectRestaurant }: Props) {
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

    const updatedUser = {
      ...user,
      favorite_restaurants: [...favoriteRestaurants, testRestaurant],
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
        <View style={styles.restaurantContent}>
          <TouchableOpacity 
            style={styles.restaurantInfo}
            onPress={() => onSelectRestaurant(restaurant)}
          >
            <View style={styles.restaurantHeader}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
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
                  <View key={`${dish.dish_name}-${index}`} style={styles.dishChip}>
                    <Text style={styles.dishChipText}>🍽️ {dish.dish_name}</Text>
                  </View>
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
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveRestaurant(restaurant.place_id)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
    fontWeight: theme.typography.weights.bold,
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
    fontWeight: theme.typography.weights.semibold,
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
    fontWeight: theme.typography.weights.semibold,
  },
  restaurantList: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'stretch',
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
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
  },
  cuisineType: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.tertiary,
    textTransform: 'capitalize',
    fontWeight: theme.typography.weights.medium,
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
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  dishesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  dishChip: {
    backgroundColor: theme.colors.secondary + '20',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  dishChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.secondary,
    fontWeight: theme.typography.weights.medium,
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
    fontWeight: theme.typography.weights.medium,
  },
  removeButton: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: theme.typography.sizes.xxl,
    color: theme.colors.error,
    fontWeight: theme.typography.weights.bold,
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
    fontWeight: theme.typography.weights.semibold,
  },
});