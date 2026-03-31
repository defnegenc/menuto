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
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { POPULAR_CITIES, City } from '../../constants';

const RED = '#E9323D';
const DARK = '#1A1A1A';

interface Restaurant {
  place_id: string;
  name: string;
  vicinity: string;
  cuisine_type?: string;
  rating?: number;
}

interface Props {
  onComplete: () => void;
  onBack?: () => void;
}

export function RestaurantSelectionScreen({ onComplete, onBack }: Props) {
  const { user, setUser, userId } = useStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'unavailable'>('loading');
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      requestLocationPermission();
    });
    return () => { handle.cancel(); isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => searchRestaurants(), 300);
    } else if (searchQuery.trim().length === 0) {
      setSearchResults([]);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setIsInitializing(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!isMountedRef.current) return;
      setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setLocationStatus('granted');
      setIsInitializing(false);
    } catch {
      if (!isMountedRef.current) return;
      setLocationStatus('unavailable');
      setIsInitializing(false);
    }
  };

  const searchRestaurants = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      let locationParam = null;
      if (selectedCity) {
        locationParam = selectedCity.coordinates;
      } else if (user?.home_base) {
        const homeBaseCity = POPULAR_CITIES.find(city => city.name === user.home_base);
        if (homeBaseCity) locationParam = homeBaseCity.coordinates;
      } else if (userLocation) {
        locationParam = `${userLocation.latitude},${userLocation.longitude}`;
      }
      const results = await api.searchPlaces(searchQuery.trim(), locationParam);
      if (!isMountedRef.current) return;
      setSearchResults(results.restaurants || []);
    } catch {
      if (!isMountedRef.current) return;
      setSearchResults([]);
    } finally {
      if (isMountedRef.current) setIsSearching(false);
    }
  };

  const toggleRestaurant = (restaurant: Restaurant) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    if (isSelected) {
      setSelectedRestaurants(selectedRestaurants.filter(r => r.place_id !== restaurant.place_id));
    } else {
      setSelectedRestaurants([...selectedRestaurants, restaurant]);
    }
  };

  const handleComplete = async () => {
    if (selectedRestaurants.length === 0) {
      Alert.alert('Add a restaurant', 'Select at least one restaurant to continue.');
      return;
    }
    if (!user || !userId) return;

    const newRestaurants = selectedRestaurants.map(r => ({
      place_id: r.place_id,
      name: r.name,
      vicinity: r.vicinity,
      cuisine_type: r.cuisine_type || 'Restaurant',
      rating: r.rating || 4.0,
    }));

    const updatedUser = {
      ...user,
      favorite_restaurants: [...(user.favorite_restaurants || []), ...newRestaurants],
    };
    setUser(updatedUser, userId);
    onComplete();
  };

  const isSelected = (restaurant: Restaurant) =>
    selectedRestaurants.some(r => r.place_id === restaurant.place_id);

  const cityName = selectedCity?.name || user?.home_base || 'Nearby';

  if (isInitializing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>Onboarding</Text>
          </View>
          <Text style={styles.headline}>
            Add your{'\n'}
            <Text style={styles.headlineAccent}>restaurants</Text>
          </Text>
          <Text style={styles.subtitle}>
            Search for places you love dining at to build your personalized list.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search restaurants..."
            placeholderTextColor="#8C7E77"
            autoCorrect={false}
          />
        </View>

        {/* Selection counter + city */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>SELECTION</Text>
            <Text style={styles.metaCount}>
              <Text style={{ color: RED }}>{selectedRestaurants.length}</Text>
              <Text style={{ color: '#666666' }}> selected</Text>
            </Text>
          </View>
          <View style={styles.cityBadge}>
            <Text style={styles.cityBadgePin}>📍</Text>
            <Text style={styles.cityBadgeText}>{cityName}</Text>
          </View>
        </View>

        <View style={styles.metaDivider} />

        {/* Results */}
        {searchQuery.trim().length >= 2 && (
          <Text style={styles.resultsLabel}>
            Results for "{searchQuery}"
          </Text>
        )}

        {isSearching && (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color={RED} />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        <View style={styles.resultsList}>
          {searchResults.map(restaurant => {
            const selected = isSelected(restaurant);
            return (
              <TouchableOpacity
                key={restaurant.place_id}
                style={[styles.resultCard, selected && styles.resultCardSelected]}
                onPress={() => toggleRestaurant(restaurant)}
                activeOpacity={0.7}
              >
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultName, selected && styles.resultNameSelected]}>
                    {restaurant.name}
                  </Text>
                  <Text style={[styles.resultAddress, selected && styles.resultAddressSelected]}>
                    {restaurant.vicinity}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <Text style={styles.radioDot}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected restaurants */}
        {selectedRestaurants.length > 0 && !searchQuery && (
          <>
            <Text style={styles.resultsLabel}>Your picks</Text>
            <View style={styles.resultsList}>
              {selectedRestaurants.map(restaurant => (
                <TouchableOpacity
                  key={restaurant.place_id}
                  style={[styles.resultCard, styles.resultCardSelected]}
                  onPress={() => toggleRestaurant(restaurant)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, styles.resultNameSelected]}>{restaurant.name}</Text>
                    <Text style={[styles.resultAddress, styles.resultAddressSelected]}>{restaurant.vicinity}</Text>
                  </View>
                  <View style={[styles.radio, styles.radioSelected]}>
                    <Text style={styles.radioDot}>✓</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {!searchQuery && selectedRestaurants.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Find your favorites</Text>
            <Text style={styles.emptySubtext}>
              Search above to find restaurants you love.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed CTA */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.ctaButton, selectedRestaurants.length === 0 && styles.ctaButtonDisabled]}
          onPress={handleComplete}
          activeOpacity={0.9}
          disabled={selectedRestaurants.length === 0}
        >
          <Text style={styles.ctaText}>Continue</Text>
          {selectedRestaurants.length > 0 && (
            <View style={styles.ctaBadge}>
              <Text style={styles.ctaBadgeText}>{selectedRestaurants.length}/5</Text>
            </View>
          )}
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#9CA3AF',
  },
  // Header
  header: {
    paddingTop: 16,
    marginBottom: 28,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  eyebrowLine: {
    width: 32,
    height: 2,
    backgroundColor: RED,
  },
  eyebrowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1B2541',
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: '#111827',
  },
  headlineAccent: {
    fontFamily: 'PlayfairDisplay-Italic',
    color: RED,
    fontWeight: '500',
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 17,
    lineHeight: 26,
    color: '#666666',
    marginTop: 16,
    maxWidth: '90%',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchIcon: {
    fontSize: 20,
    color: '#8C7E77',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#111827',
  },
  // Meta row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  metaLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#1B2541',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaCount: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 15,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAFAF9',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cityBadgePin: {
    fontSize: 12,
  },
  cityBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#666666',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 20,
  },
  // Results
  resultsLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#1B2541',
    textTransform: 'uppercase',
    marginBottom: 14,
    paddingLeft: 4,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  searchingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#666666',
  },
  resultsList: {
    gap: 0,
    marginBottom: 24,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 12,
  },
  resultCardSelected: {
    backgroundColor: '#FEFAFA',
    borderLeftWidth: 3,
    borderLeftColor: RED,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 18,
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  resultNameSelected: {
    color: '#1A1A1A',
  },
  resultAddress: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  resultAddressSelected: {
    color: '#444444',
  },
  // Radio
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: RED,
    backgroundColor: RED,
  },
  radioDot: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  // Empty
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  ctaButton: {
    backgroundColor: DARK,
    borderRadius: 0,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  ctaText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  ctaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  ctaBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  ctaArrow: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    marginLeft: 4,
  },
});
