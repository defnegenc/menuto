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
import { UnifiedHeader } from '../components/UnifiedHeader';
import { LoadingScreen } from '../components/LoadingScreen';

interface Restaurant {
  place_id: string;
  name: string;
  vicinity: string;
  cuisine_type?: string;
  rating?: number;
}

interface City {
  name: string;
  coordinates: string; // "lat,lng" format
  country?: string;
  isLocal?: boolean; // For user's home base or nearby cities
}

interface Props {
  isOnboarding?: boolean;
  onComplete?: (restaurants: Restaurant[]) => void;
  onBack?: () => void;
  minSelection?: number;
}

export function RestaurantSearchScreen({ isOnboarding = false, onComplete, onBack, minSelection = 3 }: Props) {
  const { user, setUser, userId } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'unavailable'>('loading');
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  
  // City selection state
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [citySearchResults, setCitySearchResults] = useState<City[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const citySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Popular cities for quick selection
  const POPULAR_CITIES: City[] = [
    // Major US cities
    { name: 'New York', coordinates: '40.7128,-74.0060', country: 'USA', isLocal: true },
    { name: 'San Francisco', coordinates: '37.7749,-122.4194', country: 'USA' },
    { name: 'Los Angeles', coordinates: '34.0522,-118.2437', country: 'USA' },
    { name: 'Chicago', coordinates: '41.8781,-87.6298', country: 'USA' },
    { name: 'Seattle', coordinates: '47.6062,-122.3321', country: 'USA' },
    { name: 'Boston', coordinates: '42.3601,-71.0589', country: 'USA' },
    { name: 'Austin', coordinates: '30.2672,-97.7431', country: 'USA' },
    { name: 'Miami', coordinates: '25.7617,-80.1918', country: 'USA' },
    { name: 'Denver', coordinates: '39.7392,-104.9903', country: 'USA' },
    { name: 'Portland', coordinates: '45.5152,-122.6784', country: 'USA' },
    { name: 'Nashville', coordinates: '36.1627,-86.7816', country: 'USA' },
    { name: 'Atlanta', coordinates: '33.7490,-84.3880', country: 'USA' },
    { name: 'Dallas', coordinates: '32.7767,-96.7970', country: 'USA' },
    { name: 'Houston', coordinates: '29.7604,-95.3698', country: 'USA' },
    { name: 'Phoenix', coordinates: '33.4484,-112.0740', country: 'USA' },
    { name: 'Las Vegas', coordinates: '36.1699,-115.1398', country: 'USA' },
    
    // International cities
    { name: 'London', coordinates: '51.5074,-0.1278', country: 'UK' },
    { name: 'Paris', coordinates: '48.8566,2.3522', country: 'France' },
    { name: 'Tokyo', coordinates: '35.6762,139.6503', country: 'Japan' },
    { name: 'Sydney', coordinates: '-33.8688,151.2093', country: 'Australia' },
    { name: 'Toronto', coordinates: '43.6532,-79.3832', country: 'Canada' },
    { name: 'Vancouver', coordinates: '49.2827,-123.1207', country: 'Canada' },
    { name: 'Berlin', coordinates: '52.5200,13.4050', country: 'Germany' },
    { name: 'Amsterdam', coordinates: '52.3676,4.9041', country: 'Netherlands' },
    { name: 'Barcelona', coordinates: '41.3851,2.1734', country: 'Spain' },
    { name: 'Rome', coordinates: '41.9028,12.4964', country: 'Italy' },
    { name: 'Madrid', coordinates: '40.4168,-3.7038', country: 'Spain' },
    { name: 'Milan', coordinates: '45.4642,9.1900', country: 'Italy' },
    { name: 'Zurich', coordinates: '47.3769,8.5417', country: 'Switzerland' },
    { name: 'Vienna', coordinates: '48.2082,16.3738', country: 'Austria' },
    { name: 'Prague', coordinates: '50.0755,14.4378', country: 'Czech Republic' },
    { name: 'Warsaw', coordinates: '52.2297,21.0122', country: 'Poland' },
    { name: 'Stockholm', coordinates: '59.3293,18.0686', country: 'Sweden' },
    { name: 'Copenhagen', coordinates: '55.6761,12.5683', country: 'Denmark' },
    { name: 'Oslo', coordinates: '59.9139,10.7522', country: 'Norway' },
    { name: 'Helsinki', coordinates: '60.1699,24.9384', country: 'Finland' },
  ];

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

  // Debounced city search effect
  useEffect(() => {
    if (citySearchTimeoutRef.current) {
      clearTimeout(citySearchTimeoutRef.current);
    }
    
    if (citySearchQuery.trim().length >= 2) {
      citySearchTimeoutRef.current = setTimeout(() => {
        searchCities();
      }, 300); // 300ms debounce
    } else if (citySearchQuery.trim().length === 0) {
      setCitySearchResults([]);
    }
    
    return () => {
      if (citySearchTimeoutRef.current) {
        clearTimeout(citySearchTimeoutRef.current);
      }
    };
  }, [citySearchQuery]);

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

  const searchCities = async () => {
    if (!citySearchQuery.trim()) {
      setCitySearchResults([]);
      return;
    }

    setIsSearchingCities(true);
    try {
      // Filter popular cities based on search query
      const filteredCities = POPULAR_CITIES.filter(city =>
        city.name.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
        (city.country && city.country.toLowerCase().includes(citySearchQuery.toLowerCase()))
      );
      setCitySearchResults(filteredCities);
    } catch (error) {
      console.error('City search error:', error);
      setCitySearchResults([]);
    } finally {
      setIsSearchingCities(false);
    }
  };

  const getGroupedCities = () => {
    const citiesToShow = citySearchQuery.trim() ? citySearchResults : POPULAR_CITIES;
    
    // Get user's home base and mark it as local
    const homeBase = user?.home_base;
    const citiesWithHomeBase = citiesToShow.map(city => ({
      ...city,
      isLocal: city.isLocal || !!(homeBase && city.name === homeBase)
    }));
    
    const localCities = citiesWithHomeBase.filter(city => city.isLocal);
    const otherCities = citiesWithHomeBase.filter(city => !city.isLocal);
    
    return { localCities, otherCities };
  };

  const searchRestaurantsAutocomplete = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Priority: selected city > home base > user location > fallback to SF
      let locationParam = null;
      if (selectedCity) {
        locationParam = selectedCity.coordinates;
      } else if (user?.home_base) {
        // Find home base coordinates
        const homeBaseCity = POPULAR_CITIES.find(city => city.name === user.home_base);
        if (homeBaseCity) {
          locationParam = homeBaseCity.coordinates;
        }
      } else if (userLocation) {
        locationParam = `${userLocation.latitude},${userLocation.longitude}`;
      }
      
      const results = await api.searchPlaces(searchQuery.trim(), locationParam);
      console.log('🔍 Search results:', results);
      console.log('🔍 Restaurants found:', results.restaurants?.length || 0);
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

  const selectCity = (city: City) => {
    setSelectedCity(city);
    setShowCityPicker(false);
    setCitySearchQuery('');
    setCitySearchResults([]);
    
    // Clear restaurant search results when city changes
    setSearchResults([]);
    setSearchQuery('');
  };

  const clearCitySelection = () => {
    setSelectedCity(null);
    setSearchResults([]);
    setSearchQuery('');
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
      <UnifiedHeader 
        title="Add Restaurants" 
        subtitle="Search and tap to add restaurants you love"
        showBackButton={!isOnboarding}
        onBack={onBack}
      />

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
          
          <TouchableOpacity 
            style={styles.locationStatus}
            onPress={() => setShowCityPicker(!showCityPicker)}
          >
            {selectedCity ? (
              <>
                <Text style={styles.locationIcon}>🏙️</Text>
                <Text style={styles.locationText}>{selectedCity.name}</Text>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    clearCitySelection();
                  }}
                  style={styles.clearButtonContainer}
                >
                  <Text style={styles.clearButton}>✕</Text>
                </TouchableOpacity>
              </>
            ) : locationStatus === 'loading' ? (
              <>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.locationText}>Getting location...</Text>
              </>
            ) : user?.home_base ? (
              <>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>Using {user.home_base}</Text>
              </>
            ) : locationStatus === 'granted' ? (
              <>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>Using your location</Text>
              </>
            ) : (
              <>
                <Text style={styles.locationIcon}>🌍</Text>
                <Text style={styles.locationText}>Tap to choose city</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* City Picker */}
      {showCityPicker && (
        <View style={styles.cityPickerContainer}>
          <View style={styles.cityPickerHeader}>
            <Text style={styles.cityPickerTitle}>Choose a City</Text>
            <TouchableOpacity onPress={() => setShowCityPicker(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.citySearchInput}
            value={citySearchQuery}
            onChangeText={setCitySearchQuery}
            placeholder="Search cities..."
            placeholderTextColor={theme.colors.text.secondary}
          />
          
          <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
            {(() => {
              const { localCities, otherCities } = getGroupedCities();
              
              return (
                <>
                  {/* Local Cities Section */}
                  {localCities.length > 0 && (
                    <>
                      <View style={styles.citySectionHeader}>
                        <Text style={styles.citySectionTitle}>📍 Local Area</Text>
                      </View>
                      {localCities.map((city) => (
                        <TouchableOpacity
                          key={`${city.name}-${city.coordinates}`}
                          style={[
                            styles.cityItem,
                            styles.localCityItem,
                            selectedCity?.coordinates === city.coordinates && styles.cityItemSelected
                          ]}
                          onPress={() => selectCity(city)}
                        >
                          <View style={styles.cityInfo}>
                            <View style={styles.cityNameRow}>
                              <Text style={styles.cityName}>{city.name}</Text>
                              <Text style={styles.localBadge}>📍</Text>
                            </View>
                            {city.country && (
                              <Text style={styles.cityCountry}>{city.country}</Text>
                            )}
                          </View>
                          {selectedCity?.coordinates === city.coordinates && (
                            <Text style={styles.selectedIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  
                  {/* Other Cities Section */}
                  {otherCities.length > 0 && (
                    <>
                      <View style={styles.citySectionHeader}>
                        <Text style={styles.citySectionTitle}>🌍 Other Cities</Text>
                      </View>
                      {otherCities.map((city) => (
                        <TouchableOpacity
                          key={`${city.name}-${city.coordinates}`}
                          style={[
                            styles.cityItem,
                            selectedCity?.coordinates === city.coordinates && styles.cityItemSelected
                          ]}
                          onPress={() => selectCity(city)}
                        >
                          <View style={styles.cityInfo}>
                            <Text style={styles.cityName}>{city.name}</Text>
                            {city.country && (
                              <Text style={styles.cityCountry}>{city.country}</Text>
                            )}
                          </View>
                          {selectedCity?.coordinates === city.coordinates && (
                            <Text style={styles.selectedIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  
                  {citySearchQuery.trim() && localCities.length === 0 && otherCities.length === 0 && !isSearchingCities && (
                    <View style={styles.emptyCityState}>
                      <Text style={styles.emptyCityText}>No cities found</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </ScrollView>
        </View>
      )}

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
    paddingTop: theme.spacing.md,
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
  clearButtonContainer: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  clearButton: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  cityPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    maxHeight: 300,
  },
  cityPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cityPickerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    padding: theme.spacing.xs,
  },
  citySearchInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
  },
  cityList: {
    maxHeight: 200,
    paddingHorizontal: theme.spacing.lg,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  cityItemSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  localCityItem: {
    backgroundColor: theme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  cityInfo: {
    flex: 1,
  },
  cityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    flex: 1,
  },
  localBadge: {
    fontSize: 12,
    marginLeft: theme.spacing.xs,
  },
  cityCountry: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  selectedIcon: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  citySectionHeader: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  citySectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCityState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyCityText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
  },
});