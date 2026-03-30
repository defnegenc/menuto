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
  const [selectedMenuType, setSelectedMenuType] = useState<string>('all');
  const [showMenuUrlModal, setShowMenuUrlModal] = useState(false);
  const [menuUrls, setMenuUrls] = useState<string[]>(['']);

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  // Simple flag to prevent duplicate loads
  const hasLoadedRef = useRef(false);
  const restaurantId = restaurant.place_id;
  // Contract: RestaurantDetailScreen should always have a stable place_id.
  // App.tsx remounts this screen via `key={selectedRestaurant.place_id}`.
  const restaurantKey = restaurant.place_id;
  
  // Track current request to cancel it when switching restaurants
  const currentRequestRef = useRef<AbortController | null>(null);
  const currentParseRequestRef = useRef<AbortController | null>(null);
  const opSeqRef = useRef(0);
  const textParseInFlightRef = useRef(false);
  const abortReasonMapRef = useRef<WeakMap<AbortController, string>>(new WeakMap());

  const abortWithReason = useCallback((controller: AbortController, reason: string) => {
    try {
      abortReasonMapRef.current.set(controller, reason);
    } catch {}
    try {
      controller.abort();
    } catch {}
  }, []);
  
  // ScrollView ref for scrolling to favorites
  const scrollViewRef = useRef<ScrollView>(null);

  // Load menu on mount. We rely on App.tsx key-remount to switch restaurants.
  // This avoids aborting parses due to transient restaurant identity churn.
  useEffect(() => {
    console.log(`🔄 RestaurantDetailScreen mounted for: ${restaurant.name} (${restaurant.place_id})`);
    opSeqRef.current += 1;
    hasLoadedRef.current = false;
    loadRestaurantMenu({ force: true });

    return () => {
      console.log(`🧹 RestaurantDetailScreen unmounting for: ${restaurant.name} (${restaurant.place_id})`);
      if (currentRequestRef.current) {
        abortWithReason(currentRequestRef.current, "unmount_menu_load");
        currentRequestRef.current = null;
      }
      if (currentParseRequestRef.current) {
        abortWithReason(currentParseRequestRef.current, "unmount_parse");
        currentParseRequestRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  const loadRestaurantMenu = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force && (isLoading || isParsing)) return; // Prevent concurrent loads unless forced

    const seq = opSeqRef.current;
    
    // Set loaded flag to prevent duplicate calls
    hasLoadedRef.current = true;
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), 60000);
    
    try {
      setIsLoading(true);
      const response = await api.getRestaurantMenu(restaurant.name, restaurant.place_id, abortController);
      
      if (opSeqRef.current !== seq) return; // stale response

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
      if (opSeqRef.current === seq) {
        setMenuDishes([]);
      }
    } finally {
      clearTimeout(timeoutId);
      if (opSeqRef.current === seq) {
        setIsLoading(false);
      }
      // Clear the current request reference
      if (currentRequestRef.current === abortController) {
        currentRequestRef.current = null;
      }
    }
  }, [restaurant.name, restaurant.place_id, isLoading, isParsing]);

  const handleAddMenuPDF = async () => {
    setMenuUrls(['']);
    setShowMenuUrlModal(true);
  };

  const handleSubmitMenuUrls = async () => {
    const urls = menuUrls.map(u => (u || '').trim()).filter(Boolean);
    if (urls.length === 0) {
      Alert.alert('Error', 'Please add at least one menu URL.');
      return;
    }
    const invalid = urls.find(u => !/^https?:\/\//i.test(u));
    if (invalid) {
      Alert.alert('Error', `Invalid URL: ${invalid}`);
      return;
    }

    setShowMenuUrlModal(false);
    setShowAddMoreOptions(false);
    setIsParsing(true);

    // Fire-and-forget: call backend ingest, then poll for completion
    console.log('🚀 Ingesting menu URLs for:', restaurant.name, urls);

    try {
      const ingestResult = await api.ingestMenus(
        restaurant.place_id,
        restaurant.name,
        urls
      );
      console.log('✅ Ingest accepted:', ingestResult);

      // Poll for completion (background parsing may take a while)
      const ingestId = ingestResult.ingest_id;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 3s = 3 minutes max

      const poll = async (): Promise<void> => {
        attempts++;
        try {
          const status = await api.getIngestStatus(restaurant.place_id, ingestId);
          console.log(`📊 Ingest ${ingestId} status:`, status.status, status.url_status);

          if (status.status === 'done' || status.status === 'failed') {
            // Count successes/failures
            const ok = Object.values(status.url_status).filter(s => s === 'done').length;
            const failed = Object.values(status.url_status).filter(s => s === 'failed').length;

            setIsParsing(false);
            await loadRestaurantMenu({ force: true });
            Alert.alert(
              status.status === 'done' ? 'Done!' : 'Completed with errors',
              `Parsed ${ok} menu${ok === 1 ? '' : 's'}${failed ? `, failed ${failed}` : ''}.`
            );
            return;
          }

          // Still running, poll again
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            setIsParsing(false);
            Alert.alert('Timeout', 'Menu parsing is taking longer than expected. Check back later.');
          }
        } catch (pollError) {
          console.error('Poll error:', pollError);
          setIsParsing(false);
        }
      };

      // Start polling after a short delay
      setTimeout(poll, 2000);

    } catch (error) {
      console.error('❌ Ingest failed:', error);
      setIsParsing(false);
      Alert.alert('Error', 'Failed to start menu parsing. Please try again.');
    }
  };

  const handlePasteMenuText = () => {
    setShowPasteModal(true);
  };

  const handleSearchMenu = (text: string) => {
    setSearchText(text);
    if (text.trim()) {
      const filtered = menuDishes.filter(dish => 
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
    const seq = opSeqRef.current;
    setShowAddMoreOptions(false);
    setIsParsing(true);
    const abortController = new AbortController();
    currentParseRequestRef.current = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), 60000);
    try {
      const response = await api.parseAndStoreMenu(url, restaurant.name, restaurant.place_id, abortController);
      if (response.success) {
        if (opSeqRef.current !== seq) return;
        setMenuDishes(response.dishes);
        console.log(`✅ URL parsing completed for: ${restaurant.name}`);
        Alert.alert('Success', `Added ${response.count} dishes to the menu!`);
        
        // Add a small delay before trying to fetch the menu again
        setTimeout(() => {
          if (opSeqRef.current === seq) {
            loadRestaurantMenu();
          }
        }, 2000); // 2 second delay
      }
    } catch (error) {
      // Aborts are expected when navigating away or replacing an in-flight request
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('ℹ️ URL parse aborted (stale request / navigation).');
        return;
      }
      console.error('❌ Menu parsing error:', error);
      Alert.alert('Error', 'Failed to parse menu. Please check the URL and try again.');
    } finally {
      clearTimeout(timeoutId);
      if (currentParseRequestRef.current === abortController) {
        currentParseRequestRef.current = null;
      }
      if (opSeqRef.current === seq) {
        setIsParsing(false);
      }
    }
  };

  const parseMenuFromScreenshot = async (imageUri: string) => {
    setShowAddMoreOptions(false);
    setIsParsing(true);
    const seq = opSeqRef.current;
    const abortController = new AbortController();
    currentParseRequestRef.current = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), 60000);
    try {
      console.log('📸 Parsing menu screenshot for:', restaurant.name);
      console.log('📸 Image URI:', imageUri);
      
      const result = await api.parseMenuFromScreenshot(
        imageUri,
        restaurant.name,
        restaurant.place_id || '',
        abortController
      );
      
      console.log('✅ Menu parsing result:', JSON.stringify(result, null, 2));
      
      if (result && result.dishes && result.dishes.length > 0) {
        if (opSeqRef.current !== seq) return;
        Alert.alert(
          'Success!', 
          `Menu parsed successfully! Found ${result.dishes.length} dishes.`,
          [{ text: 'OK' }]
        );
        
        // Refresh the menu after parsing
        await loadRestaurantMenu({ force: true });
      } else {
        Alert.alert(
          'No Dishes Found', 
          'The image was processed but no menu items were found. Please try a clearer image or paste the menu text instead.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      // Aborts are expected when navigating away or replacing an in-flight request
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('ℹ️ Screenshot parse aborted (stale request / navigation).');
        return;
      }
      console.error('❌ Error parsing menu screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Error', 
        `Failed to parse menu: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      clearTimeout(timeoutId);
      if (currentParseRequestRef.current === abortController) {
        currentParseRequestRef.current = null;
      }
      if (opSeqRef.current === seq) {
        setIsParsing(false);
      }
    }
  };

  const parseMenuFromText = async () => {
    // Prevent duplicate invocations (e.g. double-tap submit / re-entrancy)
    if (textParseInFlightRef.current) {
      console.log('ℹ️ parseMenuFromText ignored: already in flight');
      return;
    }
    if (!menuText.trim()) {
      Alert.alert('Error', 'Please paste some menu text first.');
      return;
    }
    
    console.log(`🔄 Starting text parsing for: ${restaurant.name}`);
    console.log('Restaurant:', restaurant.name);
    console.log('Text length:', menuText.length);
    
    setShowAddMoreOptions(false);
    setIsParsing(true);
    textParseInFlightRef.current = true;
    const seq = opSeqRef.current;

    // Cancel any in-flight parse before starting a new one (prevents double-submit races)
    if (currentParseRequestRef.current) {
      try {
        console.log('🛑 Aborting previous parse before starting new text parse');
        abortWithReason(currentParseRequestRef.current, "replaced_by_new_text_parse");
      } catch {}
      currentParseRequestRef.current = null;
    }

    // Fire-and-forget: use ingest endpoint so parsing continues even if user navigates away
    try {
      console.log('🚀 Ingesting menu text for:', restaurant.name, 'length:', menuText.trim().length);

      const ingestResult = await api.ingestMenuText(
        restaurant.place_id,
        restaurant.name,
        menuText.trim()
      );
      console.log('✅ Text ingest accepted:', ingestResult);

      // Poll for completion
      const ingestId = ingestResult.ingest_id;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 3s = 3 minutes max

      const poll = async (): Promise<void> => {
        attempts++;
        try {
          const status = await api.getIngestStatus(restaurant.place_id, ingestId);
          console.log(`📊 Text ingest ${ingestId} status:`, status.status);

          if (status.status === 'done' || status.status === 'failed') {
            const success = status.status === 'done';

            if (opSeqRef.current !== seq) return;
            setIsParsing(false);
            textParseInFlightRef.current = false;

            if (success && status.results?.text?.dish_count > 0) {
              setMenuText('');
              await loadRestaurantMenu({ force: true });
              Alert.alert('Success!', `Menu parsed! Found ${status.results.text.dish_count} dishes.`);
            } else if (success) {
              Alert.alert('No Dishes Found', 'The text was processed but no menu items were found.');
            } else {
              const errMsg = status.results?.text?.error || 'Unknown error';
              Alert.alert('Error', `Failed to parse menu: ${errMsg}`);
            }
            return;
          }

          // Still running, poll again
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            if (opSeqRef.current === seq) {
              setIsParsing(false);
              textParseInFlightRef.current = false;
            }
            Alert.alert('Timeout', 'Menu parsing is taking longer than expected. Check back later.');
          }
        } catch (pollError) {
          console.error('Poll error:', pollError);
          if (opSeqRef.current === seq) {
            setIsParsing(false);
            textParseInFlightRef.current = false;
          }
        }
      };

      // Start polling after a short delay
      setTimeout(poll, 2000);

    } catch (error) {
      console.error('❌ Text ingest failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to start menu parsing: ${errorMessage}`);
      if (opSeqRef.current === seq) {
        setIsParsing(false);
      }
      textParseInFlightRef.current = false;
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
      // Track favorite removal
      if (dish.id && restaurant.place_id) {
        api.trackDishFavorite(String(dish.id), restaurant.place_id, 'remove')
          .catch(err => console.warn('Failed to track favorite removal:', err));
      }
      
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
      
      // If we're in search mode, add the dish back to filtered results
      if (wasFromSearch) {
        const updatedFilteredDishes = [...filteredDishes, dish];
        setFilteredDishes(updatedFilteredDishes);
      }
    } else {
      console.log('⭐ Adding dish to favorites');
      // Track favorite addition
      if (dish.id && restaurant.place_id) {
        api.trackDishFavorite(String(dish.id), restaurant.place_id, 'add')
          .catch(err => console.warn('Failed to track favorite addition:', err));
      }
      
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
        // Remove the dish from filtered results immediately
        const updatedFilteredDishes = filteredDishes.filter(d => d.name !== dish.name);
        setFilteredDishes(updatedFilteredDishes);
        
        // Scroll to favorites section after a short delay to allow state update
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
        
        // Clear search only if it was the only result
        if (wasOnlySearchResult) {
          setSearchText('');
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

  const availableMenuTypes = useMemo(() => {
    const set = new Set<string>();
    for (const d of menuDishes) {
      set.add(((d.menu_type || 'menu') as string).toLowerCase());
    }
    const arr = Array.from(set);
    arr.sort();
    return arr;
  }, [menuDishes]);

  // Auto-select first menu type when multiple are available
  useEffect(() => {
    if (availableMenuTypes.length > 1 && !availableMenuTypes.includes(selectedMenuType)) {
      setSelectedMenuType(availableMenuTypes[0]);
    } else if (availableMenuTypes.length === 1) {
      // Only one menu type, no need to filter
      setSelectedMenuType(availableMenuTypes[0]);
    }
  }, [availableMenuTypes]);

  const menuTypeFilteredDishes = useMemo(() => {
    // If only one menu type or selected matches, show all non-favorites
    if (availableMenuTypes.length <= 1) return nonFavoriteDishes;
    return nonFavoriteDishes.filter(d => ((d.menu_type || 'menu') as string).toLowerCase() === selectedMenuType);
  }, [nonFavoriteDishes, selectedMenuType, availableMenuTypes]);

  const groupedDishes = useMemo(() => {
    const categories: { [key: string]: ParsedDish[] } = {};
    menuTypeFilteredDishes.forEach(dish => {
      const category = dish.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(dish);
    });
    return categories;
  }, [menuTypeFilteredDishes]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Editorial journal header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backArrow}>{'←'}</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View style={styles.titleAccentLine} />
          <View style={styles.titleTextCol}>
            <Text style={styles.restaurantName} numberOfLines={2}>{restaurant.name}</Text>
            <Text style={styles.cuisineLine}>
              {(restaurant.cuisine_type || 'DINING').toUpperCase()}{restaurant.rating ? ` · ${restaurant.rating}\u2605` : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.restaurantAddress} numberOfLines={1}>
          {(restaurant.vicinity ?? 'Location unknown').split(',').slice(0, 3).join(', ')}
        </Text>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E9323D" />
          <Text style={styles.loadingMessage}>Loading menu</Text>
          <Text style={styles.loadingSubMessage}>Getting your restaurant's delicious dishes ready</Text>
        </View>
      )}

      {isParsing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E9323D" />
          <Text style={styles.loadingMessage}>{loadingMessages[loadingMessageIndex]}</Text>
          <Text style={styles.loadingSubMessage}>Menu is parsing! Check back later to see the menu items.</Text>
        </View>
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
              {/* Minimal search bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInput}>
                  <Text style={styles.searchIcon}>⌕</Text>
                  <TextInput
                    style={styles.searchTextInput}
                    value={searchText}
                    onChangeText={handleSearchMenu}
                    placeholder="Search dishes..."
                    placeholderTextColor="#999999"
                  />
                </View>
              </View>

              {/* Search Results - inline dish items */}
              {searchText.trim() && (
                <View style={styles.searchResultsSection}>
                  <Text style={styles.sectionTitle}>
                    Search Results
                  </Text>

                  {filteredDishes.map((dish, index) => (
                    <View key={dish.id || `search-dish-${index}`}>
                      <View style={styles.dishRow}>
                        <View style={styles.dishTextCol}>
                          <Text style={styles.dishName}>{dish.name}</Text>
                          {dish.description ? (
                            <Text style={styles.dishDescription} numberOfLines={2}>{dish.description}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity onPress={() => handleAddDishToFavorites(dish)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                          <Text style={isDishFavorite(dish) ? styles.heartFilled : styles.heartEmpty}>♥</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.dishDivider} />
                    </View>
                  ))}
                  {filteredDishes.length === 0 && (
                    <Text style={styles.noResultsText}>No dishes found matching "{searchText}"</Text>
                  )}
                </View>
              )}

              {/* Your Favorites — dashed red border box */}
              {(() => {
                const favoriteDishes = getFavoriteDishesForRestaurant();
                return favoriteDishes.length > 0 ? (
                  <View style={styles.favoritesBox}>
                    <Text style={styles.favoritesBoxLabel}>YOUR FAVORITES</Text>
                    <Text style={styles.favoritesBoxList}>
                      {favoriteDishes.map(f => f.dish_name).join(', ')}
                    </Text>
                  </View>
                ) : null;
              })()}

              {/* Menu header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.sectionTitle}>Menu</Text>
                  {showAddMoreOptions ? (
                    <TouchableOpacity style={styles.addMoreButton} onPress={() => setShowAddMoreOptions(false)}>
                      <Text style={styles.addMoreButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.addMoreButton} onPress={() => setShowAddMoreOptions(true)}>
                      <Text style={styles.addMoreButtonText}>+ Add More</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {showAddMoreOptions && (
                  <View style={styles.addMoreContainer}>
                    <NoMenuState
                      onAddMenuPDF={handleAddMenuPDF}
                      onPasteMenuText={handlePasteMenuText}
                      onAddPhoto={handleAddPhoto}
                      compact
                    />
                  </View>
                )}
              </View>

              {/* Menu Type Tabs — simple text tabs */}
              {availableMenuTypes.length > 1 && (
                <View style={styles.menuTypeTabsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuTypeTabsScroll}>
                    {availableMenuTypes.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={styles.menuTypeTab}
                        onPress={() => setSelectedMenuType(p)}
                      >
                        <Text style={[
                          styles.menuTypeTabText,
                          selectedMenuType === p && styles.menuTypeTabTextActive
                        ]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                        {selectedMenuType === p && <View style={styles.menuTypeTabActiveLine} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Category filter — text pills, no background when inactive */}
              <View style={styles.categoryFilterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryFilterContainer}>
                    <TouchableOpacity
                      style={styles.categoryFilterButton}
                      onPress={() => setSelectedCategory('all')}
                    >
                      <Text style={[
                        styles.categoryFilterText,
                        selectedCategory === 'all' && styles.categoryFilterTextActive
                      ]}>All</Text>
                      {selectedCategory === 'all' && <View style={styles.categoryUnderline} />}
                    </TouchableOpacity>

                    {Object.keys(groupedDishes).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={styles.categoryFilterButton}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Text style={[
                          styles.categoryFilterText,
                          selectedCategory === category && styles.categoryFilterTextActive
                        ]}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                        {selectedCategory === category && <View style={styles.categoryUnderline} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Dish items — inline, no cards */}
              {selectedCategory === 'all' ? (
                Object.entries(groupedDishes).map(([category, dishes]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                    {dishes.map((dish, index) => (
                      <View key={dish.id || `dish-${index}`}>
                        <View style={styles.dishRow}>
                          <View style={styles.dishTextCol}>
                            <Text style={styles.dishName}>{dish.name}</Text>
                            {dish.description ? (
                              <Text style={styles.dishDescription} numberOfLines={2}>{dish.description}</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity onPress={() => handleAddDishToFavorites(dish)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Text style={isDishFavorite(dish) ? styles.heartFilled : styles.heartEmpty}>♥</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.dishDivider} />
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                groupedDishes[selectedCategory] && (
                  <View style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}</Text>
                    {groupedDishes[selectedCategory].map((dish, index) => (
                      <View key={dish.id || `dish-${index}`}>
                        <View style={styles.dishRow}>
                          <View style={styles.dishTextCol}>
                            <Text style={styles.dishName}>{dish.name}</Text>
                            {dish.description ? (
                              <Text style={styles.dishDescription} numberOfLines={2}>{dish.description}</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity onPress={() => handleAddDishToFavorites(dish)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Text style={isDishFavorite(dish) ? styles.heartFilled : styles.heartEmpty}>♥</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.dishDivider} />
                      </View>
                    ))}
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer CTA removed — user navigates via tab bar or back button */}

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

      {/* Menu URL Modal (multi-URL with + button) */}
      <Modal
        visible={showMenuUrlModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMenuUrlModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Menu URLs</Text>
            <TouchableOpacity onPress={handleSubmitMenuUrls}>
              <Text style={styles.modalSubmitButton}>Parse</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Add one or more menu links (website, PDF, or image). We'll parse and save them to this restaurant.
            </Text>

            {menuUrls.map((value, idx) => (
              <View key={`menu-url-${idx}`} style={styles.menuUrlRow}>
                <TextInput
                  style={[styles.menuUrlInput, { flex: 1 }]}
                  value={value}
                  onChangeText={(text) => {
                    setMenuUrls(prev => prev.map((p, i) => (i === idx ? text : p)));
                  }}
                  placeholder="https://example.com/menu or menu.pdf"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {menuUrls.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeUrlButton}
                    onPress={() => setMenuUrls(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={styles.removeUrlButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addUrlButton}
              onPress={() => setMenuUrls(prev => [...prev, ''])}
            >
              <Text style={styles.addUrlButtonText}>+ Add another URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ── Header ────────────────────────────────── */
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 14,
    color: '#666666',
  },
  backLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 4,
    color: '#666666',
    textTransform: 'uppercase',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eyebrowLine: {
    width: 32,
    height: 2,
    backgroundColor: '#1A1A1A',
  },
  eyebrowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1A1A1A',
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  titleAccentLine: {
    width: 3,
    backgroundColor: '#E9323D',
    borderRadius: 1.5,
    marginTop: 6,
    marginBottom: 6,
  },
  titleTextCol: {
    flex: 1,
  },
  restaurantName: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  cuisineLine: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    letterSpacing: 3,
    color: '#E9323D',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },

  /* ── Loading ───────────────────────────────── */
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingMessage: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#1A1A1A',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubMessage: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },

  /* ── Scroll / Menu container ───────────────── */
  scrollView: {
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100, // room for fixed bottom CTA
  },

  /* ── Search ────────────────────────────────── */
  searchContainer: {
    marginBottom: 24,
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
    color: '#8C7E77',
    transform: [{ scaleX: -1 }],
  },
  searchTextInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },
  searchResultsSection: {
    marginBottom: 32,
  },
  noResultsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
    fontFamily: 'DMSans-Regular',
  },

  /* ── Section titles ────────────────────────── */
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1A1A1A',
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  /* ── Favorites dashed box ──────────────────── */
  favoritesBox: {
    borderWidth: 2,
    borderColor: '#E9323D',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 32,
  },
  favoritesBoxLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#E9323D',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  favoritesBoxList: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#444444',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  /* ── Menu header / THE MENU label ──────────── */
  menuHeader: {
    marginBottom: 20,
  },
  menuTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  // menuLabel styles removed — using sectionTitle instead
  addMoreButton: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  addMoreButtonText: {
    color: '#E9323D',
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  addMoreContainer: {
    width: '100%',
    marginTop: 12,
  },

  /* ── Menu type tabs ────────────────────────── */
  menuTypeTabsContainer: {
    marginBottom: 20,
  },
  menuTypeTabsScroll: {
    flexGrow: 0,
  },
  menuTypeTab: {
    marginRight: 24,
    paddingBottom: 6,
    alignItems: 'center',
  },
  menuTypeTabText: {
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    color: '#666666',
  },
  menuTypeTabTextActive: {
    color: '#E9323D',
    fontFamily: 'DMSans-Bold',
  },
  menuTypeTabActiveLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#E9323D',
    marginTop: 4,
    borderRadius: 1,
  },

  /* ── Category filter ───────────────────────── */
  categoryFilterSection: {
    marginBottom: 24,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  categoryFilterButton: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  categoryFilterText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: '#666666',
  },
  categoryFilterTextActive: {
    color: '#E9323D',
    fontFamily: 'DMSans-Bold',
  },
  categoryUnderline: {
    width: '100%',
    height: 2,
    backgroundColor: '#E9323D',
    marginTop: 3,
    borderRadius: 1,
  },

  /* ── Category sections ─────────────────────── */
  categorySection: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#1A1A1A',
    textTransform: 'uppercase',
    marginBottom: 16,
    marginTop: 8,
  },

  /* ── Dish items (inline, no cards) ─────────── */
  dishRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  dishTextCol: {
    flex: 1,
  },
  dishName: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 20,
    color: '#1A1A1A',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  dishDescription: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
    marginTop: 2,
  },
  heartFilled: {
    fontSize: 22,
    color: '#E9323D',
    marginTop: 2,
  },
  heartEmpty: {
    fontSize: 22,
    color: '#E5E5E5',
    marginTop: 2,
  },
  dishDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 16,
    marginBottom: 40,
  },

  /* ── Fixed bottom CTA ──────────────────────── */
  // bottomCta removed — user navigates via tab bar
  _unused: {
  },

  /* ── Modals ────────────────────────────────── */
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCancelButton: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'DMSans-Regular',
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    letterSpacing: -0.5,
    color: '#1A1A1A',
  },
  modalSubmitButton: {
    fontSize: 14,
    color: '#E9323D',
    fontFamily: 'DMSans-Bold',
  },
  modalSubmitButtonDisabled: {
    color: '#999999',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalInstructions: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'DMSans-Regular',
  },
  menuUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  menuUrlInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#FAFAF9',
    fontFamily: 'DMSans-Regular',
  },
  addUrlButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
  },
  addUrlButtonText: {
    fontSize: 14,
    color: '#E9323D',
    fontFamily: 'DMSans-Bold',
  },
  removeUrlButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: '#E9323D',
  },
  removeUrlButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'DMSans-Regular',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    textAlignVertical: 'top',
  },
});