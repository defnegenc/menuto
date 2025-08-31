import React, { useState, useEffect } from 'react';
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
import { UnifiedHeader } from '../components/UnifiedHeader';
import { DishChip } from '../components/DishChip';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onAddRestaurant?: () => void;
}

export function MyRestaurants({ onSelectRestaurant, onAddRestaurant }: Props) {
  const { user, setUser, userId, debugState } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  // Load user data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      console.log('🔄 MyRestaurants: Loading data for user:', userId);
      console.log('🔄 MyRestaurants: Current user state:', { 
        hasUser: !!user, 
        hasRestaurants: !!user?.favorite_restaurants?.length,
        restaurantCount: user?.favorite_restaurants?.length || 0
      });
      
      if (userId && !user?.favorite_restaurants) {
        try {
          setIsLoading(true);
          console.log('🔄 MyRestaurants: Fetching from backend...');
          const userData = await api.getUserPreferences(userId);
          if (userData) {
            console.log('✅ MyRestaurants: Backend data loaded:', userData);
            setUser(userData, userId);
          } else {
            console.log('❌ MyRestaurants: No backend data found');
          }
        } catch (error) {
          console.log('❌ MyRestaurants: Failed to load from backend:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('✅ MyRestaurants: Using existing local data');
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [userId, user, setUser]);

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

    const testRestaurant3: FavoriteRestaurant = {
      place_id: 'test_italian_place',
      name: "Pizza Palace",
      vicinity: 'Los Angeles, CA',
      cuisine_type: 'Italian'
    };

    const testRestaurant4: FavoriteRestaurant = {
      place_id: 'test_thai_place',
      name: "Thai Delight",
      vicinity: 'Chicago, IL',
      cuisine_type: 'Thai'
    };

    const updatedUser = {
      ...user,
      favorite_restaurants: [...favoriteRestaurants, testRestaurant, testRestaurant2, testRestaurant3, testRestaurant4],
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
    
    // Fix any restaurants that have "Restaurant" as cuisine_type
    const cuisineType = restaurant.cuisine_type === 'Restaurant' ? 'American' : restaurant.cuisine_type;
    
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
              <Text style={styles.cuisineType}>{cuisineType}</Text>
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
      <UnifiedHeader title="My Restaurants" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.emptyStateText}>Loading your restaurants...</Text>
          </View>
        ) : favoriteRestaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🍽️</Text>
            <Text style={styles.emptyStateTitle}>No Restaurants Yet</Text>
            <Text style={styles.emptyStateText}>
              Use the "Add Restaurant" tab to find your favorite places and get personalized recommendations.
            </Text>
            <TouchableOpacity style={styles.addTestButton} onPress={addTestRestaurant}>
              <Text style={styles.addTestButtonText}>+ Add Test Restaurant</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addTestButton, { marginTop: 10, backgroundColor: theme.colors.secondary }]} 
              onPress={() => {
                console.log('🔍 DEBUG: Current user state:', user);
                console.log('🔍 DEBUG: User ID:', userId);
                console.log('🔍 DEBUG: Favorite restaurants:', user?.favorite_restaurants);
                debugState(); // Call store debug function
                Alert.alert('Debug Info', `User ID: ${userId}\nRestaurants: ${user?.favorite_restaurants?.length || 0}\n\nCheck console for store debug info`);
              }}
            >
              <Text style={styles.addTestButtonText}>🔍 Debug User State</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addTestButton, { marginTop: 10, backgroundColor: theme.colors.primary }]} 
              onPress={() => {
                // Force reload user data
                console.log('🔄 Force reloading user data...');
                setUser(null, 'SIGNED_OUT');
                Alert.alert('Reload', 'User data cleared. Try signing in again.');
              }}
            >
              <Text style={styles.addTestButtonText}>🔄 Force Reload</Text>
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
    paddingHorizontal: theme.spacing.lg,
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