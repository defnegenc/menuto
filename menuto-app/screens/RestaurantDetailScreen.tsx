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

interface Props {
  restaurant: FavoriteRestaurant;
  onBack: () => void;
  onGetRecommendations?: () => void;
}

export function RestaurantDetailScreen({ restaurant, onBack, onGetRecommendations }: Props) {
  const { user, setUser, userId } = useStore();
  const [menuDishes, setMenuDishes] = useState<ParsedDish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false); // Separate state for parsing
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
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
    
    // Reset all state for this restaurant
    setMenuDishes([]);
    setIsLoading(false);
    setIsParsing(false);
    setShowAddOptions(false);
    setShowPasteModal(false);

    setMenuText('');
    setSearchText('');
    setFilteredDishes([]);
    setSelectedCategory('all');

    setLoadingMessageIndex(0);
    
    // Reset the loaded flag when restaurant changes
    hasLoadedRef.current = false;
    
    // Load the menu for this specific restaurant
    loadRestaurantMenu();
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
      'Add Menu Photo',
      'Choose how you want to add a menu photo:',
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
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
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
                allowsEditing: true,
                aspect: [4, 3],
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
    setShowAddOptions(false); // Close the modal
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
    setShowAddOptions(false); // Close the modal
    setIsParsing(true);
    try {
      const response = await api.parseMenuFromScreenshot(imageUri, restaurant.name, restaurant.place_id);
      if (response.success) {
        setMenuDishes(response.dishes);
        Alert.alert('Success', `Added ${response.count} dishes to the menu!`);
        
        // Add a small delay before trying to fetch the menu again
        setTimeout(() => {
          loadRestaurantMenu();
        }, 2000); // 2 second delay
      }
    } catch (error) {
      console.error('Menu parsing error:', error);
      Alert.alert('Error', 'Failed to parse menu screenshot. Please try again.');
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
    
    setIsParsing(true);
    
    try {
      const response = await api.parseMenuFromText(menuText, restaurant.name, restaurant.place_id);
      console.log(`✅ Text parsing response for ${restaurant.name}:`, response);
      
      if (response.success && response.dishes) {
        setMenuDishes(response.dishes);
        setMenuText('');
        console.log(`✅ Text parsing completed for: ${restaurant.name}`);
        Alert.alert('Success', `Added ${response.dishes.length} dishes to the menu!`);
        
        // Add a small delay before trying to fetch the menu again
        setTimeout(() => {
          loadRestaurantMenu();
        }, 2000); // 2 second delay
      } else {
        Alert.alert('Error', response.message || 'Failed to parse menu text.');
      }
    } catch (error) {
      console.error(`❌ Menu parsing error for ${restaurant.name}:`, error);
      Alert.alert('Error', `Failed to parse menu text: ${String(error)}`);
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
    parseMenuFromText();
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
        restaurantAddress={restaurant.vicinity}
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Menu Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add a menu to see dishes and get recommendations
              </Text>
              
              <View style={styles.addOptions}>
                <TouchableOpacity style={styles.addButton} onPress={handleAddMenuPDF}>
                  <Text style={styles.addButtonIcon}>📄</Text>
                  <Text style={styles.addButtonText}>Add Menu PDF</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addButton} onPress={handlePasteMenuText}>
                  <Text style={styles.addButtonIcon}>📝</Text>
                  <Text style={styles.addButtonText}>Paste Menu Text</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addButton} onPress={handleAddPhoto}>
                  <Text style={styles.addButtonIcon}>📸</Text>
                  <Text style={styles.addButtonText}>Add Menu Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                    <View style={styles.searchInputContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search the menu!"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={searchText}
                        onChangeText={handleSearchMenu}
                      />
                    </View>
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
                    <View style={styles.searchInputContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search the menu!"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={searchText}
                        onChangeText={handleSearchMenu}
                      />
                    </View>
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
                  <TouchableOpacity style={styles.addMoreButton} onPress={() => setShowAddOptions(true)}>
                    <Text style={styles.addMoreButtonText}>+ Add More Items</Text>
                  </TouchableOpacity>
                </View>
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
                    <Text style={styles.categoryTitle}>{category.toUpperCase()} ({dishes.length})</Text>
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
                    <Text style={styles.categoryTitle}>{selectedCategory.toUpperCase()} ({groupedDishes[selectedCategory].length} dishes total)</Text>
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
        key={`paste-modal-${showPasteModal}`}
        visible={showPasteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPasteModal(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Paste Menu Text</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowPasteModal(false);
                setTimeout(() => parseMenuFromText(), 100);
              }}
            >
              <Text style={styles.modalDoneButton}>Parse</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.menuTextInput}
            value={menuText}
            onChangeText={setMenuText}
            placeholder="Paste your menu text here..."
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            textAlignVertical="top"
          />
        </SafeAreaView>
      </Modal>

      {/* Add More Items Modal */}
      <Modal
        visible={showAddOptions}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddOptions(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add More Menu Items</Text>
            <View style={{ width: 60 }} />
          </View>
          
          <View style={styles.addOptionsContainer}>
            <TouchableOpacity style={styles.addOptionButton} onPress={handleAddMenuPDF}>
              <Text style={styles.addOptionIcon}>📄</Text>
              <Text style={styles.addOptionText}>Add Menu PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.addOptionButton} onPress={handlePasteMenuText}>
              <Text style={styles.addOptionIcon}>📝</Text>
              <Text style={styles.addOptionText}>Paste Menu Text</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.addOptionButton} onPress={handleAddPhoto}>
              <Text style={styles.addOptionIcon}>📸</Text>
              <Text style={styles.addOptionText}>Add Menu Photo</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Header styles removed - now using Header component
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.huge,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.huge,
  },
  addOptions: {
    width: '100%',
    gap: 16,
  },
  addButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  addButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
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
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    paddingHorizontal: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  noResultsText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
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
  },

  menuHeader: {
    marginBottom: 20,
  },
  menuTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },

  addMoreButton: {
    backgroundColor: theme.colors.secondary, // Secondary color background
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  addMoreButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 14,
    fontWeight: '600',
  },

  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  // Dish card styles removed - now using MenuItemCard component
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  modalCloseButton: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  modalDoneButton: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuTextInput: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlignVertical: 'top',
  },

  addOptionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  addOptionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: 16,
  },
  addOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryFilterButton: {
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  categoryFilterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  categoryFilterTextActive: {
    color: '#FFFFFF',
  },
});
