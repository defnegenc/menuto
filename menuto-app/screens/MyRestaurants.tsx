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
import { RestaurantCard } from '../components/RestaurantCard';
import { SearchRestaurantCard } from '../components/SearchRestaurantCard';
import { SearchRestaurantSelected } from '../components/SearchRestaurantSelected';

const TERRA = '#E9323D';
const DARK = '#1C1917';
const MEDIUM = '#5A4D48';
const LIGHT_TEXT = '#8C7E77';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onAddRestaurant?: () => void;
}

export function MyRestaurants({ onSelectRestaurant, onAddRestaurant }: Props) {
  const { user, setUser, userId } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUserData = async () => {
      if (userId && !user?.favorite_restaurants) {
        try {
          setIsLoading(true);
          const userData = await api.getUserPreferences(userId);
          if (userData) setUser(userData, userId);
        } catch (error) {
          console.error('MyRestaurants: Failed to load:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [userId, user, setUser]);

  const favoriteRestaurants = user?.favorite_restaurants || [];
  const favoriteDishes = user?.favorite_dishes || [];

  const filteredRestaurants = favoriteRestaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchText.toLowerCase()) ||
    restaurant.vicinity.toLowerCase().includes(searchText.toLowerCase()) ||
    restaurant.cuisine_type?.toLowerCase().includes(searchText.toLowerCase())
  );

  // External search
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurants, setSelectedRestaurants] = useState<any[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchText.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => searchExternalRestaurants(), 300);
    } else {
      setSearchResults([]);
      setSelectedRestaurants([]);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchText]);

  const searchExternalRestaurants = async () => {
    if (!searchText.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const results = await api.searchPlaces(searchText.trim());
      const existingPlaceIds = new Set(favoriteRestaurants.map(r => r.place_id));
      setSearchResults((results.restaurants || []).filter((r: any) => !existingPlaceIds.has(r.place_id)));
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  };

  const toggleRestaurantSelection = (restaurant: any) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    setSelectedRestaurants(isSelected
      ? selectedRestaurants.filter(r => r.place_id !== restaurant.place_id)
      : [...selectedRestaurants, restaurant]);
  };

  const confirmSelectedRestaurants = async () => {
    if (!user || !userId || selectedRestaurants.length === 0) return;
    const newRestaurants = selectedRestaurants.map(r => ({
      place_id: r.place_id, name: r.name, vicinity: r.vicinity,
      cuisine_type: r.cuisine_type || 'Restaurant', rating: r.rating || 4.0
    }));
    const updatedUser = { ...user, favorite_restaurants: [...favoriteRestaurants, ...newRestaurants] };
    setUser(updatedUser, userId);
    setSelectedRestaurants([]); setSearchResults([]); setSearchText('');
    Alert.alert('Added!', `${newRestaurants.length} restaurant${newRestaurants.length > 1 ? 's' : ''} added to your spots.`);
  };

  const getFavoriteDishesForRestaurant = (restaurant: FavoriteRestaurant): FavoriteDish[] =>
    favoriteDishes.filter(d => d.restaurant_id === restaurant.place_id || d.restaurant_id === restaurant.name);

  const handleRemoveRestaurant = (restaurantId: string) => {
    Alert.alert('Remove Restaurant', 'Remove this restaurant from your spots?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        if (!user || !userId) return;
        const updated = { ...user, favorite_restaurants: favoriteRestaurants.filter(r => r.place_id !== restaurantId) };
        setUser(updated, userId);
      }},
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your spots</Text>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchText}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search restaurants..."
            placeholderTextColor={LIGHT_TEXT}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={TERRA} />
            <Text style={styles.emptySubtext}>Loading your spots...</Text>
          </View>
        ) : (
          <>
            {/* Your Restaurants */}
            {!searchText && favoriteRestaurants.length > 0 && (
              <View style={styles.restaurantList}>
                {favoriteRestaurants.map(restaurant => (
                  <RestaurantCard
                    key={restaurant.place_id}
                    restaurant={restaurant}
                    dishes={getFavoriteDishesForRestaurant(restaurant)}
                    onSelectRestaurant={onSelectRestaurant}
                    onRemoveRestaurant={handleRemoveRestaurant}
                  />
                ))}
              </View>
            )}

            {/* Filtered results */}
            {searchText && filteredRestaurants.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>YOUR SPOTS</Text>
                <View style={styles.restaurantList}>
                  {filteredRestaurants.map(restaurant => (
                    <RestaurantCard
                      key={restaurant.place_id}
                      restaurant={restaurant}
                      dishes={getFavoriteDishesForRestaurant(restaurant)}
                      onSelectRestaurant={onSelectRestaurant}
                      onRemoveRestaurant={handleRemoveRestaurant}
                    />
                  ))}
                </View>
              </>
            )}

            {/* External search results */}
            {searchText && searchResults.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ADD NEW</Text>
                <View style={styles.restaurantList}>
                  {searchResults.map(restaurant => {
                    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
                    return isSelected
                      ? <SearchRestaurantSelected key={restaurant.place_id} restaurant={restaurant} onPress={() => toggleRestaurantSelection(restaurant)} />
                      : <SearchRestaurantCard key={restaurant.place_id} restaurant={restaurant} onPress={() => toggleRestaurantSelection(restaurant)} />;
                  })}
                </View>
              </>
            )}

            {/* Searching */}
            {searchText && isSearching && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={TERRA} />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            )}

            {/* No results */}
            {searchText && !isSearching && filteredRestaurants.length === 0 && searchResults.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptySubtext}>No restaurants found for "{searchText}"</Text>
              </View>
            )}

            {/* Empty state */}
            {!searchText && favoriteRestaurants.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No spots yet</Text>
                <Text style={styles.emptySubtext}>Search above to find and save your favorite restaurants.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Confirm footer */}
      {selectedRestaurants.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.footerButton} onPress={confirmSelectedRestaurants} activeOpacity={0.9}>
            <Text style={styles.footerButtonText}>
              Add {selectedRestaurants.length} restaurant{selectedRestaurants.length > 1 ? 's' : ''}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 36,
    color: DARK,
    letterSpacing: -2,
  },
  // Search
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchIcon: {
    fontSize: 18,
    color: LIGHT_TEXT,
  },
  searchText: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: DARK,
  },
  clearText: {
    fontSize: 16,
    color: LIGHT_TEXT,
    padding: 4,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  restaurantList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    letterSpacing: 3,
    color: TERRA,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: LIGHT_TEXT,
  },
  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: DARK,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: LIGHT_TEXT,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  footerButton: {
    backgroundColor: TERRA,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  footerButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
