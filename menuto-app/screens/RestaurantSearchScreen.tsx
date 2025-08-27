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

interface Restaurant {
  place_id: string;
  name: string;
  vicinity: string;
  cuisine_type?: string;
  rating?: number;
}

interface Props {}

export function RestaurantSearchScreen({}: Props) {
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

  const addRestaurant = (restaurant: Restaurant) => {
    if (!user || !userId) return;

    // Check if restaurant already exists in user's favorites
    const existingRestaurants = user.favorite_restaurants || [];
    const exists = existingRestaurants.some(r => r.place_id === restaurant.place_id);
    
    if (exists) {
      Alert.alert('Restaurant already added', `${restaurant.name} is already in your restaurants!`);
      return;
    }

    // Add to user's favorites immediately
    const updatedRestaurants = [...existingRestaurants, {
      place_id: restaurant.place_id,
      name: restaurant.name,
      vicinity: restaurant.vicinity,
      cuisine_type: restaurant.cuisine_type || 'Restaurant',
      rating: restaurant.rating || 4.0
    }];

    const updatedUser = {
      ...user,
      favorite_restaurants: updatedRestaurants
    };

    setUser(updatedUser, userId);
    
    Alert.alert(
      'Restaurant Added!', 
      `${restaurant.name} has been added to your restaurants. You can now get recommendations from their menu!`,
      [{ text: 'Great!' }]
    );
  };

  const renderRestaurantCard = (restaurant: Restaurant) => {
    const existingRestaurants = user?.favorite_restaurants || [];
    const isAlreadyAdded = existingRestaurants.some(r => r.place_id === restaurant.place_id);
    
    return (
      <TouchableOpacity
        key={restaurant.place_id}
        style={[
          styles.restaurantCard,
          isAlreadyAdded && styles.restaurantCardAdded
        ]}
        onPress={() => addRestaurant(restaurant)}
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
            <Text style={styles.addButton}>+ Add</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Add Restaurants</Text>
          <Text style={styles.subtitle}>
            Search and tap to add restaurants you love
          </Text>
        </View>
      </View>

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
            Selected: {selectedRestaurants.length}/3
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
    fontWeight: theme.typography.weights.semibold,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  searchSection: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
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
    paddingHorizontal: theme.spacing.xl,
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
    backgroundColor: theme.colors.primary + '10',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
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
});