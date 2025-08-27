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
  const [newDishName, setNewDishName] = useState('');
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [filteredDishes, setFilteredDishes] = useState<ParsedDish[]>([]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  // Simple flag to prevent duplicate loads
  const hasLoadedRef = useRef(false);
  const restaurantId = restaurant.place_id;
  
  // Track current request to cancel it when switching restaurants
  const currentRequestRef = useRef<AbortController | null>(null);

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
    setShowAddDishModal(false);
    setMenuText('');
    setNewDishName('');
    setFilteredDishes([]);
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
        setLoadingMessageIndex((prev) => (prev + 1) % 4);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading, isParsing]);

  const loadingMessages = [
    "Extracting dishes...",
    "Prepare for a feast...",
    "Something smells good...",
    "I already know you've got good taste..."
  ];

  const loadRestaurantMenu = async () => {
    if (isLoading || isParsing) return; // Prevent concurrent loads
    
    // Set loaded flag to prevent duplicate calls
    hasLoadedRef.current = true;
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    
    try {
      setIsLoading(true);
      const response = await api.getRestaurantMenuWithPlaceId(restaurant.place_id, restaurant.name);
      
      console.log(`🍽️ Frontend received menu response for ${restaurant.name}:`, response);
      
      if (response.menu_items && response.menu_items.length > 0) {
        console.log(`✅ Setting ${response.menu_items.length} menu items for ${restaurant.name}`);
        setMenuDishes(response.menu_items);
      } else {
        console.log(`❌ No menu items found for ${restaurant.name}`);
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
  };

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

  const handleAddFavoriteDish = () => {
    if (menuDishes.length === 0) {
      Alert.alert(
        'No Menu Yet', 
        'This restaurant doesn\'t have a menu yet. Would you like to add one?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Menu', onPress: () => setShowAddOptions(true) }
        ]
      );
      return;
    }
    setShowAddDishModal(true);
  };

  const handleDishSearch = (text: string) => {
    setNewDishName(text);
    if (text.trim()) {
      const filtered = menuDishes.filter(dish => 
        dish.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredDishes(filtered);
    } else {
      setFilteredDishes([]);
    }
  };

  const handleSelectDish = (dish: ParsedDish) => {
    // Add to user's favorite dishes
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
      setUser(updatedUser, userId);
    }

    setNewDishName('');
    setFilteredDishes([]);
    setShowAddDishModal(false);
    Alert.alert('Success', `Added "${dish.name}" to your favorite dishes!`);
  };

  const handleAddNewDish = async () => {
    if (!newDishName.trim()) {
      Alert.alert('Error', 'Please enter a dish name.');
      return;
    }

    try {
      const response = await api.addDishToMenu(restaurant.name, {
        name: newDishName,
        description: '',
        price: 0,
        category: 'main'
      }, user?.id || 0);

      if (response.success) {
        setMenuDishes([...menuDishes, response.dish]);
        setNewDishName('');
        setFilteredDishes([]);
        setShowAddDishModal(false);
        Alert.alert('Success', `Added "${newDishName}" to the menu!`);
      }
    } catch (error) {
      console.error('Add dish error:', error);
      Alert.alert('Error', 'Failed to add dish. Please try again.');
    }
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

  const renderDishCard = useCallback((dish: ParsedDish, index: number) => (
    <View key={dish.id || `dish-${index}`} style={styles.dishCard}>
      <View style={styles.dishHeader}>
        <Text style={styles.dishName}>{dish.name}</Text>
      </View>
      {dish.description && (
        <Text style={styles.dishDescription}>{dish.description}</Text>
      )}
      <View style={styles.dishCategory}>
        <Text style={styles.categoryText}>{dish.category}</Text>
        {dish.is_user_added && (
          <Text style={styles.userAddedText}>Added by user</Text>
        )}
      </View>
    </View>
  ), []);

  const getFavoriteDishesForRestaurant = () => {
    return (user?.favorite_dishes || []).filter(dish => 
      dish.restaurant_id === restaurant.place_id || 
      dish.restaurant_id === restaurant.name
    );
  };

  const groupedDishes = useMemo(() => {
    const categories: { [key: string]: ParsedDish[] } = {};
    menuDishes.forEach(dish => {
      const category = dish.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(dish);
    });
    return categories;
  }, [menuDishes]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.subtitle}>{restaurant.vicinity}</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      )}

      {isParsing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{loadingMessages[loadingMessageIndex]}</Text>
          <Text style={styles.loadingSubtext}>Menu is parsing! Check back later to see the menu items.</Text>
        </View>
      )}

      {!isLoading && !isParsing && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              {/* Your Favorites Section */}
              {getFavoriteDishesForRestaurant().length > 0 && (
                <View style={styles.favoritesSection}>
                  <Text style={styles.favoritesTitle}>Your Favorites</Text>
                  <View style={styles.favoritesChips}>
                    {getFavoriteDishesForRestaurant().map((favorite, index) => (
                      <View key={`${favorite.dish_name}-${index}`} style={styles.favoriteChip}>
                        <Text style={styles.favoriteChipText}>🍽️ {favorite.dish_name}</Text>
                        <TouchableOpacity 
                          style={styles.removeFavoriteButton}
                          onPress={() => removeFavoriteDish(favorite)}
                        >
                          <Text style={styles.removeFavoriteText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu ({menuDishes.length} dishes)</Text>
                <View style={styles.menuActions}>
                  <TouchableOpacity style={styles.addDishButton} onPress={handleAddFavoriteDish}>
                    <Text style={styles.addDishButtonText}>+ Add Favorite Dish</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addMoreButton} onPress={() => setShowAddOptions(true)}>
                    <Text style={styles.addMoreButtonText}>+ Add More Items</Text>
                  </TouchableOpacity>
                  {onGetRecommendations && (
                    <TouchableOpacity style={styles.recommendationsButton} onPress={onGetRecommendations}>
                      <Text style={styles.recommendationsButtonText}>Get Recommendations</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {Object.entries(groupedDishes).map(([category, dishes]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
                  {dishes.map((dish, index) => renderDishCard(dish, index))}
                </View>
              ))}
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

      {/* Add Dish Modal */}
      <Modal
        visible={showAddDishModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddDishModal(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Dish</Text>
            <TouchableOpacity onPress={handleAddNewDish}>
              <Text style={styles.modalDoneButton}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Text style={styles.searchTitle}>Search Existing Dishes</Text>
            <TextInput
              style={styles.searchInput}
              value={newDishName}
              onChangeText={handleDishSearch}
              placeholder="Type to search existing dishes..."
              placeholderTextColor={theme.colors.text.secondary}
            />
            
            {filteredDishes.length > 0 && (
              <ScrollView style={styles.searchResults}>
                <Text style={styles.searchResultsTitle}>Found Dishes:</Text>
                {filteredDishes.map((dish, index) => (
                  <TouchableOpacity
                    key={dish.id || `filtered-dish-${index}`}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectDish(dish)}
                  >
                    <Text style={styles.searchResultText}>{dish.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {newDishName.trim() && filteredDishes.length === 0 && (
              <View style={styles.addNewSection}>
                <Text style={styles.addNewTitle}>Can't find your favorite?</Text>
                <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewDish}>
                  <Text style={styles.addNewButtonText}>Add "{newDishName}" to Menu</Text>
                </TouchableOpacity>
              </View>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  loadingSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
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
  favoritesSection: {
    marginBottom: 24,
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  favoritesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  favoriteChip: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favoriteChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  removeFavoriteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFavoriteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuHeader: {
    marginBottom: 20,
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
  addDishButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addMoreButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationsButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recommendationsButtonText: {
    color: '#FFFFFF',
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
  dishCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dishName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  dishDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  dishCategory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  userAddedText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
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
  searchContainer: {
    flex: 1,
    padding: 20,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  addNewSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addNewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  addNewButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addNewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    marginBottom: 16,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  searchResultText: {
    fontSize: 16,
    color: theme.colors.text.primary,
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
});
