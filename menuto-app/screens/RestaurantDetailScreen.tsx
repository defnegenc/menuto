// dev probe
// @ts-ignore
global.__dumpStore = () => console.log('store', JSON.stringify(useStore.getState(), null, 2));

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { FavoriteRestaurant, ParsedDish } from '../types';
import { theme } from '../theme';
import { Header } from '../components/Header';
import { MenuItemCard } from '../components/MenuItemCard';
import { DishChip } from '../components/DishChip';
import { LoadingScreen } from '../components/LoadingScreen';
import { SearchBar } from '../components/SearchBar';
import { NoMenuState } from '../components/NoMenuState';

interface Props {
  restaurant: FavoriteRestaurant;
  onBack: () => void;
  onGetRecommendations?: () => void;
  onNavigateToDishRecommendations?: (restaurant: FavoriteRestaurant, preferences: {
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  }) => void;
}

export function RestaurantDetailScreen({ restaurant, onBack, onGetRecommendations, onNavigateToDishRecommendations }: Props) {
  const { user, setUser, userId } = useStore();
  const [menuDishes, setMenuDishes] = useState<ParsedDish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false); // Separate state for parsing
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showAddMoreOptions, setShowAddMoreOptions] = useState(false);
  const [menuText, setMenuText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filteredDishes, setFilteredDishes] = useState<ParsedDish[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  // Simple flag to prevent duplicate loads
  const hasLoadedRef = useRef(false);
  const restaurantId = restaurant.place_id;
  
  // Track current request to cancel it when switching restaurants
  const currentRequestRef = useRef<AbortController | null>(null);
  
  // ScrollView ref for scrolling to favorites
  const scrollViewRef = useRef<ScrollView>(null);

  // Load menu when restaurant changes
  useEffect(() => {
    console.log(`🔄 Restaurant changed to: ${restaurant.name} (${restaurant.place_id})`);
    
    // Cancel any existing request when switching restaurants
    if (currentRequestRef.current) {
      console.log(`🛑 Cancelling previous request for ${restaurant.name}`);
      currentRequestRef.current.abort();
      currentRequestRef.current = null;
    }
    
    // IMMEDIATELY reset loading states for the new restaurant
    setIsLoading(false);
    setIsParsing(false);
    
    // Reset all state for this restaurant
    setMenuDishes([]);
    setShowPasteModal(false);
    setShowAddMoreOptions(false);
    setMenuText('');
    setSearchText('');
    setFilteredDishes([]);
    setSelectedCategory('all');
    setLoadingMessageIndex(0);
    
    // Reset the loaded flag when restaurant changes
    hasLoadedRef.current = false;
    
    // Load the menu after a small delay to ensure state is reset
    setTimeout(() => {
      loadRestaurantMenu();
    }, 50);
  }, [restaurant.place_id, restaurant.name]);


  // Rotating loading messages
  useEffect(() => {
    if (isLoading || isParsing) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % 8);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading, isParsing]);

  const loadingMessages = [
    "🍽️ Extracting dishes",
    "🎉 Prepare for a feast",
    "👃 Something smells good",
    "😋 I already know you've got good taste",
    "👨‍🍳 Cooking up the menu",
    "⏰ Almost ready to serve",
    "🥬 Gathering ingredients",
    "⭐ Chef's special coming up"
  ];

  const loadRestaurantMenu = useCallback(async () => {
    if (isLoading || isParsing) return; // Prevent concurrent loads
    
    // Set loaded flag to prevent duplicate calls
    hasLoadedRef.current = true;
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    
    try {
      setIsLoading(true);
      const response = await api.getRestaurantMenu(restaurant.name, restaurant.place_id, abortController);
      
      if (response.dishes && Array.isArray(response.dishes)) {
        // Backend returns dishes directly with their categories
        console.log(`✅ Loaded ${response.dishes.length} dishes with categories:`, response.dishes.map((d: any) => d.category));
        setMenuDishes(response.dishes);
      } else if (response.success === false) {
        // Handle explicit failure case
        console.log('❌ No menu found or API error:', response.message);
        setMenuDishes([]);
      } else {
        console.log('❌ Unexpected response format:', response);
        setMenuDishes([]);
      }
    } catch (error) {
      console.error(`Error loading menu for ${restaurant.name}:`, error);
      setMenuDishes([]);
    } finally {
      setIsLoading(false);
      // Clear the current request reference
      if (currentRequestRef.current === abortController) {
        currentRequestRef.current = null;
      }
    }
  }, [restaurant.name, restaurant.place_id, isLoading, isParsing]);

  const handleAddMenuPDF = async () => {
    Alert.prompt(
      'Add Menu PDF',
      'Enter the URL of the menu PDF:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: async (url) => {
            if (url) {
              await parseMenuFromUrl(url);
            }
          }
        }
      ],
      'plain-text',
      'https://example.com/menu.pdf'
    );
  };

  const handlePasteMenuText = () => {
    setShowPasteModal(true);
  };

  const handleSearchMenu = (text: string) => {
    setSearchText(text);
    if (text.trim()) {
      const filtered = nonFavoriteDishes.filter(dish => 
        dish.name.toLowerCase().includes(text.toLowerCase()) ||
        (dish.description && dish.description.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredDishes(filtered);
    } else {
      setFilteredDishes([]);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Upload Menu Photo',
      'Choose how you want to add your menu photo:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera permissions to take menu photos.');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                await parseMenuFromScreenshot(imageUri);
              }
            } catch (error) {
              console.error('Camera error:', error);
              Alert.alert('Error', 'Failed to open camera. Please try again.');
            }
          }
        },
        { 
          text: 'Upload from Gallery', 
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need gallery permissions to upload menu photos.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                await parseMenuFromScreenshot(imageUri);
              }
            } catch (error) {
              console.error('Gallery error:', error);
              Alert.alert('Error', 'Failed to open gallery. Please try again.');
            }
          }
        }
      ]
    );
  };

  const parseMenuFromUrl = async (url: string) => {
    console.log(`🔄 Starting URL parsing for: ${restaurant.name}`);
    setShowAddMoreOptions(false);
    setIsParsing(true);
    try {
      const response = await api.parseAndStoreMenu(url, restaurant.name, restaurant.place_id);
      if (response.success) {
        setMenuDishes(response.dishes);
        console.log(`✅ URL parsing completed for: ${restaurant.name}`);
        Alert.alert('Success', `Added ${response.count} dishes to the menu!`);
        
        // Add a small delay before trying to fetch the menu again
        setTimeout(() => {
          loadRestaurantMenu();
        }, 2000); // 2 second delay
      }
    } catch (error) {
      console.error('Menu parsing error:', error);
      Alert.alert('Error', 'Failed to parse menu. Please check the URL and try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const parseMenuFromScreenshot = async (imageUri: string) => {
    setShowAddMoreOptions(false);
    setIsParsing(true);
    try {
      console.log('📸 Parsing menu screenshot for:', restaurant.name);
      console.log('📸 Image URI:', imageUri);
      
      const result = await api.parseMenuFromScreenshot(
        imageUri,
        restaurant.name,
        restaurant.vicinity || ''
      );
      
      console.log('✅ Menu parsing result:', JSON.stringify(result, null, 2));
      
      if (result && result.dishes && result.dishes.length > 0) {
        Alert.alert(
          'Success!', 
          `Menu parsed successfully! Found ${result.dishes.length} dishes.`,
          [{ text: 'OK' }]
        );
        
        // Refresh the menu after parsing
        await loadRestaurantMenu();
      } else {
        Alert.alert(
          'No Dishes Found', 
          'The image was processed but no menu items were found. Please try a clearer image or paste the menu text instead.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error parsing menu screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Error', 
        `Failed to parse menu: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsParsing(false);
    }
  };

  const parseMenuFromText = async () => {
    if (!menuText.trim()) {
      Alert.alert('Error', 'Please paste some menu text first.');
      return;
    }
    
    console.log(`🔄 Starting text parsing for: ${restaurant.name}`);
    console.log('Restaurant:', restaurant.name);
    console.log('Text length:', menuText.length);
    
    setShowAddMoreOptions(false);
    setIsParsing(true);
    
    try {
      const result = await api.parseMenuFromText(
        menuText.trim(),
        restaurant.name,
        restaurant.vicinity || ''
      );
      
      console.log('✅ Menu parsing result:', JSON.stringify(result, null, 2));
      
      if (result && result.dishes && result.dishes.length > 0) {
        Alert.alert(
          'Success!', 
          `Menu parsed successfully! Found ${result.dishes.length} dishes.`,
          [{ text: 'OK' }]
        );
        
        // Clear the text input
        setMenuText('');
        
        // Refresh the menu after parsing
        await loadRestaurantMenu();
      } else {
        Alert.alert(
          'No Dishes Found', 
          'The text was processed but no menu items were found. Please try a different format or check your input.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error parsing menu text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Error', 
        `Failed to parse menu: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseText = () => {
    if (!menuText.trim()) {
      Alert.alert('Error', 'Please paste some menu text first.');
      return;
    }
    
    // Close modal and start parsing immediately
    setShowPasteModal(false);
    setTimeout(() => parseMenuFromText(), 100);
  };

  const removeFavoriteDish = (favoriteDish: any) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${favoriteDish.dish_name}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedUser = {
              ...user,
              favorite_dishes: (user?.favorite_dishes || []).filter(dish => 
                !(dish.dish_name === favoriteDish.dish_name && 
                  (dish.restaurant_id === restaurant.place_id || dish.restaurant_id === restaurant.name))
              ),
              preferred_cuisines: user?.preferred_cuisines || [],
              spice_tolerance: user?.spice_tolerance || 0,
              price_preference: user?.price_preference || 0,
              dietary_restrictions: user?.dietary_restrictions || []
            };
            if (user && userId) {
              setUser(updatedUser, userId);
            }
          }
        }
      ]
    );
  };

  const handleAddDishToFavorites = useCallback((dish: ParsedDish) => {
    console.log('🔄 Adding/removing dish from favorites:', dish.name);
    console.log('Current user:', user);
    console.log('Current userId:', userId);
    
    // Check if dish is already in favorites
    const isAlreadyFavorite = (user?.favorite_dishes || []).some(fav => 
      fav.dish_name === dish.name && 
      (fav.restaurant_id === restaurant.place_id || fav.restaurant_id === restaurant.name)
    );

    // Check if this dish was added from search results
    const wasFromSearch = searchText.trim() && filteredDishes.some(fd => fd.name === dish.name);
    const wasOnlySearchResult = wasFromSearch && filteredDishes.length === 1;

    if (isAlreadyFavorite) {
      console.log('🗑️ Removing dish from favorites');
      // Remove from favorites
      const updatedUser = {
        ...user,
        favorite_dishes: (user?.favorite_dishes || []).filter(fav => 
          !(fav.dish_name === dish.name && 
            (fav.restaurant_id === restaurant.place_id || fav.restaurant_id === restaurant.name))
        ),
        preferred_cuisines: user?.preferred_cuisines || [],
        spice_tolerance: user?.spice_tolerance || 0,
        price_preference: user?.price_preference || 0,
        dietary_restrictions: user?.dietary_restrictions || []
      };
      
      if (user && userId) {
        console.log('💾 Saving updated user (removed):', updatedUser);
        setUser(updatedUser, userId);
      }
    } else {
      console.log('⭐ Adding dish to favorites');
      // Add to favorites
      const updatedUser = {
        ...user,
        favorite_dishes: [...(user?.favorite_dishes || []), {
          dish_name: dish.name,
          restaurant_id: restaurant.place_id,
          dessert_name: dish.category === 'dessert' ? dish.name : undefined
        }],
        preferred_cuisines: user?.preferred_cuisines || [],
        spice_tolerance: user?.spice_tolerance || 0,
        price_preference: user?.price_preference || 0,
        dietary_restrictions: user?.dietary_restrictions || []
      };
      
      if (user && userId) {
        console.log('💾 Saving updated user (added):', updatedUser);
        setUser(updatedUser, userId);
      }

      // If added from search results, scroll to favorites and handle search clearing
      if (wasFromSearch) {
        // Scroll to favorites section after a short delay to allow state update
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
        
        // Clear search if it was the only result
        if (wasOnlySearchResult) {
          setSearchText('');
          setFilteredDishes([]);
        }
      }
    }
  }, [user, userId, restaurant.place_id, restaurant.name, setUser, searchText, filteredDishes]);

  const isDishFavorite = useCallback((dish: ParsedDish) => {
    return (user?.favorite_dishes || []).some(fav => 
      fav.dish_name === dish.name && 
      (fav.restaurant_id === restaurant.place_id || fav.restaurant_id === restaurant.name)
    );
  }, [user, restaurant.place_id, restaurant.name]);

  const getFavoriteDishesForRestaurant = useCallback(() => {
    return (user?.favorite_dishes || []).filter(dish => 
      dish.restaurant_id === restaurant.place_id || 
      dish.restaurant_id === restaurant.name
    );
  }, [user?.favorite_dishes, restaurant.place_id, restaurant.name]);

  // Filter out favorited dishes from main menu (they appear in favorites section)
  const nonFavoriteDishes = useMemo(() => {
    return menuDishes.filter(d => !isDishFavorite(d));
  }, [menuDishes, isDishFavorite]);

  const groupedDishes = useMemo(() => {
    const categories: { [key: string]: ParsedDish[] } = {};
    nonFavoriteDishes.forEach(dish => {
      const category = dish.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(dish);
    });
    return categories;
  }, [nonFavoriteDishes]);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBack={onBack}
        restaurantName={restaurant.name}
        restaurantAddress={restaurant.vicinity.split(',').slice(0, 3).join(', ')}
      />

      {isLoading && (
        <LoadingScreen 
          message="Loading menu" 
          subMessage="Getting your restaurant's delicious dishes ready"
        />
      )}

      {isParsing && (
        <LoadingScreen 
          message={loadingMessages[loadingMessageIndex]}
          subMessage="Menu is parsing! Check back later to see the menu items."
        />
      )}

      {!isLoading && !isParsing && (
        <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {menuDishes.length === 0 ? (
            <NoMenuState
              onAddMenuPDF={handleAddMenuPDF}
              onPasteMenuText={handlePasteMenuText}
              onAddPhoto={handleAddPhoto}
            />
          ) : (
            <View style={styles.menuContainer}>
              {/* Search Results - Show above favorites when searching */}
              {searchText.trim() && (
                <View style={styles.searchResultsSection}>
                  <Text style={[styles.sectionTitle, theme.typography.h2.fancy]}>
                    Search Results
                  </Text>
                  
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <SearchBar
                      value={searchText}
                      onChangeText={handleSearchMenu}
                      placeholder="Search the menu..."
                    />
                  </View>
                  
                  {filteredDishes.map((dish, index) => (
                    <MenuItemCard
                      key={dish.id || `search-dish-${index}`}
                      dish={dish}
                      onAddToFavorites={handleAddDishToFavorites}
                      isFavorite={isDishFavorite(dish)}
                    />
                  ))}
                  {filteredDishes.length === 0 && (
                    <Text style={styles.noResultsText}>No dishes found matching "{searchText}"</Text>
                  )}
                </View>
              )}

              {/* Your Favorites Section */}
              <View style={styles.favoritesSection}>
                <Text style={[styles.sectionTitle, theme.typography.h2.fancy]}>Your Favorites</Text>
                
                {/* Search Bar - Only show when not searching */}
                {!searchText.trim() && (
                  <View style={styles.searchContainer}>
                    <SearchBar
                      value={searchText}
                      onChangeText={handleSearchMenu}
                      placeholder="Search the menu..."
                    />
                  </View>
                )}
                {(() => {
                  const favoriteDishes = getFavoriteDishesForRestaurant();
                  return favoriteDishes.length > 0 ? (
                    
                    <View style={styles.favoritesCards}>
                      {favoriteDishes.map((favorite, index) => {
                        // Find the full dish data from menuDishes
                        const fullDish = menuDishes.find(dish => 
                          dish.name === favorite.dish_name
                        );
                        
                        // Always create a proper dish object for consistent display
                        const displayDish: ParsedDish = fullDish || {
                          id: `favorite-${index}`,
                          name: favorite.dish_name,
                          description: '', // No description available for favorites without full dish data
                          category: 'favorite',
                          ingredients: [],
                          dietary_tags: [],
                          is_user_added: false,
                          score: 0,
                          explanation: '',
                          restaurant_id: restaurant.place_id
                        };
                        
                        return (
                          <MenuItemCard
                            key={`${favorite.dish_name}-${index}`}
                            dish={displayDish}
                            onAddToFavorites={handleAddDishToFavorites}
                            isFavorite={true}
                          />
                        );
                      })}
                    </View>
                  ) : null;
                })()}
              </View>

              <View style={styles.menuHeader}>
                <View style={styles.menuTitleRow}>
                  <Text style={[styles.sectionTitle, theme.typography.h2.fancy]}>Menu</Text>
                  {!showAddMoreOptions && (
                    <TouchableOpacity style={styles.addMoreButton} onPress={() => setShowAddMoreOptions(true)}>
                      <Text style={styles.addMoreButtonText}>+ Add More Items</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {showAddMoreOptions && (
                  <View style={styles.addMoreContainer}>
                    <NoMenuState
                      onAddMenuPDF={handleAddMenuPDF}
                      onPasteMenuText={handlePasteMenuText}
                      onAddPhoto={handleAddPhoto}
                      onCancel={() => setShowAddMoreOptions(false)}
                    />
                  </View>
                )}
              </View>

              {/* Category Filter Buttons */}
              <View style={styles.categoryFilterContainer}>
                <TouchableOpacity 
                  style={[
                    styles.categoryFilterButton, 
                    selectedCategory === 'all' && styles.categoryFilterButtonActive
                  ]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[
                    styles.categoryFilterText,
                    selectedCategory === 'all' && styles.categoryFilterTextActive
                  ]}>All</Text>
                </TouchableOpacity>

                {Object.keys(groupedDishes).map((category) => (
                  <TouchableOpacity 
                    key={category}
                    style={[
                      styles.categoryFilterButton, 
                      selectedCategory === category && styles.categoryFilterButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.categoryFilterText,
                      selectedCategory === category && styles.categoryFilterTextActive
                    ]}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedCategory === 'all' ? (
                // Show all dishes grouped by category
                Object.entries(groupedDishes).map(([category, dishes]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category.toUpperCase()} ({dishes.length} items)</Text>
                    {dishes.map((dish, index) => (
                      <MenuItemCard
                        key={dish.id || `dish-${index}`}
                        dish={dish}
                        onAddToFavorites={handleAddDishToFavorites}
                        isFavorite={isDishFavorite(dish)}
                      />
                    ))}
                  </View>
                ))
              ) : (
                // Show dishes for selected category only
                groupedDishes[selectedCategory] && (
                  <View style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{selectedCategory.toUpperCase()} ({groupedDishes[selectedCategory].length} items)</Text>
                    {groupedDishes[selectedCategory].map((dish, index) => (
                      <MenuItemCard
                        key={dish.id || `dish-${index}`}
                        dish={dish}
                        onAddToFavorites={handleAddDishToFavorites}
                        isFavorite={isDishFavorite(dish)}
                      />
                    ))}
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Paste Menu Text Modal */}
      <Modal
        visible={showPasteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPasteModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Paste Menu Text</Text>
            <TouchableOpacity onPress={handleParseText} disabled={!menuText.trim()}>
              <Text style={[styles.modalSubmitButton, !menuText.trim() && styles.modalSubmitButtonDisabled]}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Paste the menu text below. Include dish names, descriptions, and prices if available.
            </Text>
            
            
            <TextInput
              style={styles.textInput}
              value={menuText}
              onChangeText={(text) => {
                console.log('📝 TextInput changed, length:', text.length);
                setMenuText(text);
              }}
              placeholder="Paste menu text here..."
              multiline
              textAlignVertical="top"
              autoFocus
              selectTextOnFocus
              clearButtonMode="while-editing"
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
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
  menuContainer: {
    padding: 20,
  },
  searchResultsSection: {
    marginBottom: 24,
  },
  favoritesSection: {
    marginBottom: 24,
  },
  emptyFavoritesText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  // Search container matching MyRestaurants exactly
  searchContainer: {
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  sectionTitle: {
    marginBottom: 12,
    fontFamily: 'Artifact', // Uses fancy heading style
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  favoritesCards: {
    marginBottom: 16,
  },
  fallbackCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fallbackDishName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  removeButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: theme.colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  menuHeader: {
    marginBottom: 20,
  },
  menuTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addMoreButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  addMoreContainer: {
    width: '100%',
  },
  menuActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancelButton: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalSubmitButton: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalSubmitButtonDisabled: {
    color: theme.colors.text.secondary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  modalInstructions: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.regular,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlignVertical: 'top',
  },
  // Updated category filter styles to match the Figma design
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryFilterButton: {
    backgroundColor: theme.colors.chipDefault, // Light pink background
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25, // Very rounded corners like in the image
    borderWidth: 0, // No border for unselected state
  },
  categoryFilterButtonActive: {
    backgroundColor: theme.colors.secondary, // Dark red when selected
    borderWidth: 0,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary, // Black text for unselected
    fontFamily: theme.typography.fontFamilies.medium,
  },
  categoryFilterTextActive: {
    color: '#FFFFFF', // White text when selected
    fontFamily: theme.typography.fontFamilies.medium,
  },
});