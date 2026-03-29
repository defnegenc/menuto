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
const RED_LIGHT = '#FFF5F5';
const DARK = '#111111';

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
    } else if (selectedRestaurants.length < 5) {
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
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
          />
        </View>

        {/* Selection counter + city */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>SELECTION</Text>
            <Text style={styles.metaCount}>
              <Text style={{ color: RED }}>{selectedRestaurants.length}</Text>
              <Text style={{ color: '#D1D5DB' }}> / </Text>
              <Text style={{ color: '#6B7280' }}>5</Text>
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
                  {selected && <View style={styles.radioDot} />}
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
                    <View style={styles.radioDot} />
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
    color: RED,
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
    color: '#6B7280',
    marginTop: 16,
    maxWidth: '90%',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchIcon: {
    fontSize: 20,
    color: '#9CA3AF',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 17,
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
    color: '#9CA3AF',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cityBadgePin: {
    fontSize: 12,
  },
  cityBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  // Results
  resultsLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
  },
  resultsList: {
    gap: 10,
    marginBottom: 24,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  resultCardSelected: {
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: RED_LIGHT,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: 'IBMPlexMono-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  resultNameSelected: {
    color: '#111827',
  },
  resultAddress: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  resultAddressSelected: {
    color: '#6B7280',
  },
  // Radio
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: RED,
    backgroundColor: RED,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  // Empty
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#9CA3AF',
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
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  ctaText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
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
