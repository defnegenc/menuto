import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { FavoriteRestaurant, FavoriteDish } from '../types';
import { theme } from '../theme';
import { DishChip } from '../components/DishChip';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { SearchBar } from '../components/SearchBar';
import { RestaurantCard } from '../components/RestaurantCard';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onAddRestaurant?: () => void;
}

export function MyRestaurants({ onSelectRestaurant, onAddRestaurant }: Props) {
  const { user, setUser, userId, debugState } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const insets = useSafeAreaInsets();

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

  // Filter restaurants based on search text
  const filteredRestaurants = favoriteRestaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchText.toLowerCase()) ||
    restaurant.vicinity.toLowerCase().includes(searchText.toLowerCase()) ||
    restaurant.cuisine_type?.toLowerCase().includes(searchText.toLowerCase())
  );

  // Search state for external restaurants
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurants, setSelectedRestaurants] = useState<any[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect for external restaurants
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchText.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchExternalRestaurants();
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setSelectedRestaurants([]);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  const searchExternalRestaurants = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.searchPlaces(searchText.trim());
      console.log('🔍 External search results:', results);
      
      // Filter out restaurants that are already in favorites
      const existingPlaceIds = new Set(favoriteRestaurants.map(r => r.place_id));
      const newRestaurants = (results.restaurants || []).filter((restaurant: any) => 
        !existingPlaceIds.has(restaurant.place_id)
      );
      
      setSearchResults(newRestaurants);
    } catch (error) {
      console.error('External search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleRestaurantSelection = (restaurant: any) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    
    if (isSelected) {
      setSelectedRestaurants(selectedRestaurants.filter(r => r.place_id !== restaurant.place_id));
    } else {
      setSelectedRestaurants([...selectedRestaurants, restaurant]);
    }
  };

  const confirmSelectedRestaurants = async () => {
    if (!user || !userId) return;

    if (selectedRestaurants.length === 0) {
      Alert.alert('No restaurants selected');
      return;
    }

    // Add selected restaurants to favorites
    const newRestaurants = selectedRestaurants.map(restaurant => ({
      place_id: restaurant.place_id,
      name: restaurant.name,
      vicinity: restaurant.vicinity,
      cuisine_type: restaurant.cuisine_type || 'Restaurant',
      rating: restaurant.rating || 4.0
    }));

    const updatedRestaurants = [...favoriteRestaurants, ...newRestaurants];
    const updatedUser = { ...user, favorite_restaurants: updatedRestaurants };
    setUser(updatedUser, userId);
    
    // Clear selection and search
    setSelectedRestaurants([]);
    setSearchResults([]);
    setSearchText('');
    
    Alert.alert(
      'Restaurants Added!', 
      `Added ${newRestaurants.length} restaurant${newRestaurants.length > 1 ? 's' : ''} to your list.`,
      [{ text: 'Great!' }]
    );
  };

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
    
    return (
      <RestaurantCard
        key={restaurant.place_id}
        restaurant={restaurant}
        dishes={dishes}
        onSelectRestaurant={onSelectRestaurant}
        onRemoveRestaurant={handleRemoveRestaurant}
      />
    );
  };

  const renderExternalRestaurantCard = (restaurant: any) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    
    // Parse address to show street, city, and state (exclude zip and country)
    const parseAddress = (vicinity: string) => {
      const parts = vicinity.split(',').map(part => part.trim());
      return parts.slice(0, 3).join(', ');
    };
    
    return (
      <TouchableOpacity
        key={restaurant.place_id}
        style={[
          styles.externalRestaurantCard,
          isSelected && styles.externalRestaurantCardSelected
        ]}
        onPress={() => toggleRestaurantSelection(restaurant)}
      >
        <View style={styles.externalRestaurantInfo}>
          <Text style={styles.externalRestaurantName}>{restaurant.name}</Text>
          <Text style={styles.externalRestaurantVicinity}>{parseAddress(restaurant.vicinity)}</Text>
          {restaurant.cuisine_type && (
            <Text style={styles.externalRestaurantCuisine}>{restaurant.cuisine_type}</Text>
          )}
        </View>
        <View style={styles.externalSelectionIndicator}>
          <View style={[
            styles.externalRadioButton,
            isSelected && styles.externalRadioButtonSelected
          ]}>
            {isSelected && <Text style={styles.externalRadioButtonInner}>●</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader title="My Restaurants" />
      
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search restaurants..."
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 50}]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.emptyStateText}>Loading your restaurants...</Text>
          </View>
        ) : (
          <>
            {/* Your Restaurants Section */}
            {!searchText && favoriteRestaurants.length > 0 && (
              <View style={styles.restaurantList}>
                {favoriteRestaurants.map(renderRestaurantCard)}
              </View>
            )}
            
            {/* Search Results - Your Restaurants */}
            {searchText && filteredRestaurants.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Your Restaurants</Text>
                <View style={styles.restaurantList}>
                  {filteredRestaurants.map(renderRestaurantCard)}
                </View>
              </>
            )}
            
            {/* Search Results - External Restaurants */}
            {searchText && searchResults.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Add New Restaurants</Text>
                <View style={styles.externalRestaurantList}>
                  {searchResults.map(renderExternalRestaurantCard)}
                </View>
              </>
            )}
            
            {/* Loading State */}
            {searchText && isSearching && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Searching restaurants...</Text>
              </View>
            )}
            
            {/* No Results */}
            {searchText && !isSearching && filteredRestaurants.length === 0 && searchResults.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateTitle}>No Results</Text>
                <Text style={styles.emptyStateText}>
                  No restaurants found for "{searchText}". Try a different search term.
                </Text>
              </View>
            )}
            
            {/* No Restaurants Yet */}
            {!searchText && favoriteRestaurants.length === 0 && (
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
            )}
          </>
        )}
      </ScrollView>

      {/* Fixed Footer Add Button - Only show when restaurants are selected */}
      {selectedRestaurants.length > 0 && (
        <View style={[styles.footer, { paddingBottom: 10 }]}>
          <TouchableOpacity 
            style={styles.footerAddButton}
            onPress={confirmSelectedRestaurants}
          >
            <Text style={styles.footerAddButtonText}>
              Add {selectedRestaurants.length} Restaurant{selectedRestaurants.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerAddButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  footerAddButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamilies.semibold, // Added DM Sans
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    fontFamily: theme.typography.fontFamilies.semibold, // Added DM Sans
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular, // Added DM Sans
  },
  externalRestaurantList: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  externalRestaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadows.sm,
  },
  externalRestaurantCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  externalRestaurantInfo: {
    flex: 1,
  },
  externalRestaurantName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.semibold, // Added DM Sans
  },
  externalRestaurantVicinity: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.regular, // Added DM Sans
  },
  externalRestaurantCuisine: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.tertiary,
    fontWeight: theme.typography.weights.medium,
    textTransform: 'capitalize',
    fontFamily: theme.typography.fontFamilies.medium, // Added DM Sans
  },
  externalSelectionIndicator: {
    marginLeft: theme.spacing.md,
  },
  externalRadioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  externalRadioButtonSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  externalRadioButtonInner: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamilies.bold, // Added DM Sans
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    fontFamily: theme.typography.fontFamilies.semibold, // Added DM Sans
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xxxl,
    fontFamily: theme.typography.fontFamilies.regular, // Added DM Sans
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
    fontFamily: theme.typography.fontFamilies.regular, // Added DM Sans
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
    fontFamily: theme.typography.fontFamilies.regular, // Added DM Sans
  },
  restaurantList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
});