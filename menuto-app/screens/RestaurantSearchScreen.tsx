import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { theme } from '../theme';
import { useStore } from '../store/useStore';
import { SearchHeader } from '../components/SearchHeader';
import { LoadingScreen } from '../components/LoadingScreen';

interface Restaurant {
  place_id: string;
  name: string;
  vicinity: string;
  cuisine_type?: string;
  rating?: number;
}

interface Props {
  isOnboarding?: boolean;
  onComplete?: (restaurants: Restaurant[]) => void;
  minSelection?: number;
}

export function RestaurantSearchScreen({ isOnboarding = false, onComplete, minSelection = 3 }: Props) {
  const { user, setUser, userId } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'unavailable'>('loading');
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchRestaurantsAutocomplete();
      }, 300); // 300ms debounce
    } else if (searchQuery.trim().length === 0) {
      setSearchResults([]);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationStatus('denied');
        Alert.alert(
          'Location Permission',
          'Location access was denied. We\'ll search restaurants in San Francisco instead. You can still search by city name.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setLocationStatus('granted');
      
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('unavailable');
      Alert.alert(
        'Location Unavailable',
        'Could not get your location. We\'ll search restaurants in San Francisco instead.',
        [{ text: 'OK' }]
      );
    }
  };

  const searchRestaurantsAutocomplete = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use user's location if available, otherwise fallback to SF
      let locationParam = null;
      if (userLocation) {
        locationParam = `${userLocation.latitude},${userLocation.longitude}`;
      }
      
      const results = await api.searchPlaces(searchQuery.trim(), locationParam);
      setSearchResults(results.restaurants || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchRestaurants = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Please enter a restaurant name or cuisine type');
      return;
    }

    await searchRestaurantsAutocomplete();
  };

  const toggleRestaurantSelection = (restaurant: Restaurant) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    
    if (isSelected) {
      setSelectedRestaurants(selectedRestaurants.filter(r => r.place_id !== restaurant.place_id));
    } else {
      setSelectedRestaurants([...selectedRestaurants, restaurant]);
    }
  };

  const confirmSelectedRestaurants = async () => {
    if (!user || !userId) return;

    // Check for duplicates
    const existingRestaurants = user.favorite_restaurants || [];
    const newRestaurants = selectedRestaurants.filter(restaurant => 
      !existingRestaurants.some(existing => existing.place_id === restaurant.place_id)
    );

    if (newRestaurants.length === 0) {
      Alert.alert('No new restaurants to add', 'All selected restaurants are already in your list.');
      return;
    }

    // Add all selected restaurants
    const updatedRestaurants = [...existingRestaurants, ...newRestaurants.map(restaurant => ({
      place_id: restaurant.place_id,
      name: restaurant.name,
      vicinity: restaurant.vicinity,
      cuisine_type: restaurant.cuisine_type || 'Restaurant',
      rating: restaurant.rating || 4.0
    }))];

    // Update user and save to Supabase
    const updatedUser = { ...user, favorite_restaurants: updatedRestaurants };
    setUser(updatedUser, userId);
    
    // Clear selection
    setSelectedRestaurants([]);
    
    // Show success message
    Alert.alert(
      'Restaurants Added!', 
      `Added ${newRestaurants.length} restaurant${newRestaurants.length > 1 ? 's' : ''} to your list.`,
      [{ text: 'Great!' }]
    );
  };

  const renderRestaurantCard = (restaurant: Restaurant) => {
    const existingRestaurants = user?.favorite_restaurants || [];
    const isAlreadyAdded = existingRestaurants.some(r => r.place_id === restaurant.place_id);
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    
    return (
      <TouchableOpacity
        key={restaurant.place_id}
        style={[
          styles.restaurantCard,
          isAlreadyAdded && styles.restaurantCardAdded,
          isSelected && styles.restaurantCardSelected
        ]}
        onPress={() => {
          if (isAlreadyAdded) return;
          toggleRestaurantSelection(restaurant);
        }}
        disabled={isAlreadyAdded}
      >
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantVicinity}>{restaurant.vicinity}</Text>
          {restaurant.cuisine_type && (
            <Text style={styles.cuisineType}>{restaurant.cuisine_type}</Text>
          )}
        </View>
        <View style={styles.selectionIndicator}>
          {isAlreadyAdded ? (
            <Text style={styles.addedText}>Added ✓</Text>
          ) : (
            <View style={[
              styles.radioButton,
              isSelected && styles.radioButtonSelected
            ]}>
              {isSelected && <Text style={styles.radioButtonInner}>●</Text>}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SearchHeader />

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Type restaurant name or cuisine (e.g., Sushi, Pizza)..."
            placeholderTextColor={theme.colors.text.secondary}
            onSubmitEditing={searchRestaurants}
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={searchRestaurants}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.selectedCount}>
            {isOnboarding 
              ? `Selected: ${selectedRestaurants.length}/${minSelection}`
              : `Selected: ${selectedRestaurants.length}`
            }
          </Text>
          
          <View style={styles.locationStatus}>
            {locationStatus === 'loading' && (
              <>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.locationText}>Getting location...</Text>
              </>
            )}
            {locationStatus === 'granted' && (
              <>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>Using your location</Text>
              </>
            )}
            {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
              <>
                <Text style={styles.locationIcon}>🌍</Text>
                <Text style={styles.locationText}>Using San Francisco</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {searchResults.map(renderRestaurantCard)}
        
        {searchResults.length === 0 && searchQuery && !isSearching && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No restaurants found. Try a different search term.
            </Text>
          </View>
        )}
      </ScrollView>

      {isOnboarding && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.continueButton,
              selectedRestaurants.length < minSelection && styles.continueButtonDisabled
            ]}
            onPress={async () => {
              console.log('Continue button pressed, selected:', selectedRestaurants.length, 'min:', minSelection);
              if (onComplete && selectedRestaurants.length >= minSelection) {
                console.log('Calling onComplete with', selectedRestaurants.length, 'restaurants');
                // Add selected restaurants to user's favorites
                if (user && userId) {
                  const existingRestaurants = user.favorite_restaurants || [];
                  const newRestaurants = selectedRestaurants.map(restaurant => ({
                    place_id: restaurant.place_id,
                    name: restaurant.name,
                    vicinity: restaurant.vicinity,
                    cuisine_type: restaurant.cuisine_type || 'Restaurant',
                    rating: restaurant.rating || 4.0
                  }));
                  
                  const updatedRestaurants = [...existingRestaurants, ...newRestaurants];
                  console.log('🍽️ Saving restaurants to user:', {
                    userId,
                    existingCount: existingRestaurants.length,
                    newCount: newRestaurants.length,
                    totalCount: updatedRestaurants.length,
                    restaurants: newRestaurants.map(r => r.name)
                  });
                  
                  // Update user's favorite restaurants
                  const updatedUser = { ...user, favorite_restaurants: updatedRestaurants };
                  setUser(updatedUser, userId);
                }
                onComplete(selectedRestaurants);
              } else {
                console.log('Continue button conditions not met');
              }
            }}
            disabled={selectedRestaurants.length < minSelection}
          >
            <Text style={styles.continueButtonText}>
              Continue ({selectedRestaurants.length}/{minSelection})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isOnboarding && selectedRestaurants.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={confirmSelectedRestaurants}
          >
            <Text style={styles.continueButtonText}>
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    maxWidth: '100%',
    alignSelf: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    marginRight: theme.spacing.sm,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: theme.typography.sizes.xl,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.weights.medium,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  locationIcon: {
    fontSize: theme.typography.sizes.sm,
  },
  locationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  restaurantCard: {
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
  restaurantCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
  },
  restaurantCardAdded: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
    opacity: 0.7,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  restaurantVicinity: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  cuisineType: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.tertiary,
    fontWeight: theme.typography.weights.medium,
    textTransform: 'capitalize',
  },
  selectionIndicator: {
    marginLeft: theme.spacing.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  radioButtonInner: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkmark: {
    color: theme.colors.text.light,
    fontWeight: theme.typography.weights.bold,
  },
  addedText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: theme.spacing.huge,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.text.muted,
  },
});