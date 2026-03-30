import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { FavoriteRestaurant, ParsedDish } from '../types';
import { SearchBar } from '../components/SearchBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchRestaurantCard } from '../components/SearchRestaurantCard';
import { SearchRestaurantSelected } from '../components/SearchRestaurantSelected';
import { DishRecommendations } from './DishRecommendations';
import { PostMealFeedback } from './PostMealFeedback';
import { MultiDishScoring } from './MultiDishScoring';
import { DishScoringCard } from './choosedish/DishScoringCard';
import { PreferencesPanel } from './choosedish/PreferencesPanel';

const RED = '#E9323D';
const TERRA = RED; // alias for any remaining refs

interface Props {
  onSelectRestaurant?: (restaurant: FavoriteRestaurant) => void;
  onNavigateToRecommendations?: (
    restaurant: FavoriteRestaurant,
    preferences: {
      hungerLevel: number;
      preferenceLevel: number;
      selectedCravings: string[];
    }
  ) => void;
}

export function ChooseDishLanding({
  onSelectRestaurant,
  onNavigateToRecommendations,
}: Props) {
  const { user } = useStore();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [menuDishes, setMenuDishes] = useState<ParsedDish[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Modals managed here (moved out of DishScoringCard)
  const [showTextModal, setShowTextModal] = useState(false);
  const [showMenuUrlModal, setShowMenuUrlModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [menuUrls, setMenuUrls] = useState<string[]>(['']);
  const [menuText, setMenuText] = useState('');

  // Question states
  const [hungerLevel, setHungerLevel] = useState(3);
  const [preferenceLevel, setPreferenceLevel] = useState(3);
  const [selectedCravings, setSelectedCravings] = useState<string[]>([]);
  const [diningOccasion, setDiningOccasion] = useState<string>('solo');
  const [freeTextMood, setFreeTextMood] = useState('');

  // Feedback flow states
  const [showDishRecommendations, setShowDishRecommendations] = useState(false);
  const [showMultiDishScoring, setShowMultiDishScoring] = useState(false);
  const [showPostMealFeedback, setShowPostMealFeedback] = useState(false);
  const [selectedDishForFeedback, setSelectedDishForFeedback] = useState<any>(null);
  const [selectedDishesForScoring, setSelectedDishesForScoring] = useState<any[]>([]);

  const insets = useSafeAreaInsets();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchText.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        searchExternalRestaurants();
      }, 300);
    } else {
      setSearchResults([]);
      setSelectedRestaurant(null);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const searchExternalRestaurants = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchPlaces(searchText.trim());
      const allRestaurants = results.restaurants || [];
      setSearchResults(allRestaurants);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRestaurantSelection = async (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setIsLoadingMenu(true);
    try {
      const response = await api.getRestaurantMenu(restaurant.name, restaurant.place_id);
      if (response.dishes && Array.isArray(response.dishes) && response.dishes.length > 0) {
        setMenuDishes(response.dishes);
      } else {
        setMenuDishes([]);
      }
    } catch (error) {
      setMenuDishes([]);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // Shared polling helper for menu ingestion
  const pollIngestStatus = async (placeId: string, ingestId: string, onDone?: (status: any) => void) => {
    let done = false;
    let attempts = 0;
    // eslint-disable-next-line no-await-in-loop
    while (!done && attempts < 60) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;
      try {
        const status = await api.getIngestStatus(placeId, ingestId);
        if (status.status === 'done' || status.status === 'failed') {
          done = true;
          if (onDone) onDone(status);
        }
      } catch { /* ignore polling error */ }
    }
    if (!done) Alert.alert('Timeout', 'Menu parsing is taking longer than expected. Please check back later.');
  };

  const handleAddMenuLink = () => {
    if (!selectedRestaurant) { Alert.alert('Error', 'No restaurant selected'); return; }
    setMenuUrls(['']);
    setShowMenuUrlModal(true);
  };

  const handleSubmitMenuUrls = async () => {
    if (!selectedRestaurant) { Alert.alert('Error', 'No restaurant selected'); return; }
    const urls = menuUrls.map((u) => (u || '').trim()).filter(Boolean);
    if (urls.length === 0) { Alert.alert('Error', 'Please add at least one menu URL.'); return; }
    const invalid = urls.find((u) => !/^https?:\/\//i.test(u));
    if (invalid) { Alert.alert('Error', `Invalid URL: ${invalid}`); return; }
    try {
      setShowMenuUrlModal(false);
      setIsParsing(true);
      const ingestResult = await api.ingestMenus(selectedRestaurant.place_id, selectedRestaurant.name, urls);
      await pollIngestStatus(selectedRestaurant.place_id, ingestResult.ingest_id, (status) => {
        const successCount = Object.values(status.url_status).filter((s: any) => s === 'done').length;
        const failCount = Object.values(status.url_status).filter((s: any) => s === 'failed').length;
        Alert.alert('Done!', `Parsed ${successCount} menu${successCount === 1 ? '' : 's'}${failCount ? `, failed ${failCount}` : ''}.`);
      });
      await handleRestaurantSelection(selectedRestaurant);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePasteMenuText = () => { setShowTextModal(true); };

  const handleSubmitMenuText = async () => {
    if (!menuText.trim()) { Alert.alert('Error', 'Please enter some menu text'); return; }
    if (!selectedRestaurant) { Alert.alert('Error', 'No restaurant selected'); return; }
    setIsParsing(true);
    setShowTextModal(false);
    try {
      const ingestResult = await api.ingestMenuText(selectedRestaurant.place_id, selectedRestaurant.name, menuText.trim());
      await pollIngestStatus(selectedRestaurant.place_id, ingestResult.ingest_id, (status) => {
        if (status.status === 'done') {
          Alert.alert('Success!', `Menu parsed successfully! Found ${status.results?.text?.dish_count || 0} dishes.`, [{ text: 'OK' }]);
          setMenuText('');
        } else {
          Alert.alert('Error', `Failed to parse menu: ${status.results?.text?.error || 'Unknown error'}`, [{ text: 'OK' }]);
        }
      });
      await handleRestaurantSelection(selectedRestaurant);
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') return;
      Alert.alert('Error', `Failed to parse menu: ${error instanceof Error ? error.message : 'Unknown error'}`, [{ text: 'OK' }]);
    } finally {
      setIsParsing(false);
    }
  };

  const parseMenuFromScreenshot = async (imageUri: string) => {
    if (!selectedRestaurant) return;
    setIsParsing(true);
    try {
      const result = await api.parseMenuFromScreenshot(imageUri, selectedRestaurant.name, selectedRestaurant.place_id);
      if (result?.dishes?.length > 0) {
        Alert.alert('Success!', `Menu parsed successfully! Found ${result.dishes.length} dishes.`, [{ text: 'OK' }]);
        await handleRestaurantSelection(selectedRestaurant);
      } else {
        Alert.alert('No Dishes Found', 'The image was processed but no menu items were found. Please try a clearer image or paste the menu text instead.', [{ text: 'OK' }]);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to parse menu: ${error instanceof Error ? error.message : 'Unknown error'}`, [{ text: 'OK' }]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddPhoto = () => {
    if (!selectedRestaurant) { Alert.alert('Error', 'No restaurant selected'); return; }
    Alert.alert('Upload Menu Photo', 'Choose how you want to add your menu photo:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: async () => {
        try {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission Required', 'Sorry, we need camera permissions to take menu photos.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]) await parseMenuFromScreenshot(result.assets[0].uri);
        } catch { Alert.alert('Error', 'Failed to open camera. Please try again.'); }
      }},
      { text: 'Upload from Gallery', onPress: async () => {
        try {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission Required', 'Sorry, we need gallery permissions to upload menu photos.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]) await parseMenuFromScreenshot(result.assets[0].uri);
        } catch { Alert.alert('Error', 'Failed to open gallery. Please try again.'); }
      }},
    ]);
  };

  const toggleCraving = (craving: string) => {
    setSelectedCravings((prev) =>
      prev.includes(craving) ? prev.filter((c) => c !== craving) : [...prev, craving]
    );
  };

  const handleContinue = () => {
    if (!selectedRestaurant) { Alert.alert('Please select a restaurant first'); return; }
    setShowDishRecommendations(true);
  };

  const handleDishRecommendationContinue = (dishes: any[]) => {
    setSelectedDishesForScoring(dishes); setShowDishRecommendations(false); setShowMultiDishScoring(true);
  };
  const handleMultiDishScoringComplete = (_dishes: any[], _addToFavorites: boolean[]) => {
    setShowMultiDishScoring(false); setSelectedDishesForScoring([]);
    Alert.alert('Feedback Submitted!', 'Thank you for your feedback. Your preferences have been saved.', [{ text: 'OK' }]);
  };
  const handleFeedbackComplete = (_rating: number, _feedback: string) => {
    setShowPostMealFeedback(false); setSelectedDishForFeedback(null);
  };
  const handleBackToRecommendations = () => {
    setShowPostMealFeedback(false); setShowMultiDishScoring(false); setShowDishRecommendations(true);
  };
  const handleBackToChooseDishLanding = () => { setShowDishRecommendations(false); };

  const renderRestaurantCard = (restaurant: any) => {
    const isSelected = selectedRestaurant?.place_id === restaurant.place_id;
    const Component = isSelected ? SearchRestaurantSelected : SearchRestaurantCard;
    return <Component key={restaurant.place_id} restaurant={restaurant} onPress={() => handleRestaurantSelection(restaurant)} />;
  };

  // Derived state: menu is found when we have dishes and aren't loading
  const menuFound = !isLoadingMenu && menuDishes.length > 0;

  if (showDishRecommendations && selectedRestaurant) {
    return (
      <DishRecommendations
        restaurant={selectedRestaurant}
        userPreferences={{ hungerLevel, preferenceLevel, selectedCravings, diningOccasion, freeTextMood }}
        onContinue={handleDishRecommendationContinue}
        onBack={handleBackToChooseDishLanding}
      />
    );
  }

  if (showMultiDishScoring && selectedRestaurant && selectedDishesForScoring.length > 0) {
    return (
      <MultiDishScoring
        restaurant={selectedRestaurant}
        selectedDishes={selectedDishesForScoring}
        onComplete={handleMultiDishScoringComplete}
        onBack={handleBackToRecommendations}
      />
    );
  }

  if (showPostMealFeedback && selectedDishForFeedback) {
    return (
      <PostMealFeedback
        dish={selectedDishForFeedback}
        onComplete={handleFeedbackComplete}
        onBack={handleBackToRecommendations}
      />
    );
  }

  if (isParsing) {
    return (
      <View style={styles.container}>
        <View style={[styles.editorialHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>Choose Dish</Text>
          </View>
          <Text style={styles.headerTitle}>
            Find your{'\n'}<Text style={styles.headerAccent}>dish</Text>
          </Text>
        </View>
        <ParsingScreen restaurantName={selectedRestaurant?.name} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <ScreenHeader title="Find your" accent="dish" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <>
          {/* Step 1: Search for restaurant */}
          {!searchText && !selectedRestaurant && (
            <View style={styles.stepSection}>
              <Text style={styles.stepText}>Step 1: Search for a restaurant</Text>
              <View style={styles.stepUnderline} />
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search restaurants..."
            />
          </View>

          {/* Selected Restaurant Info */}
          {selectedRestaurant && (
            <View style={styles.selectedRestaurantInfo}>
              <Text style={styles.selectedRestaurantName}>
                {selectedRestaurant.name}
              </Text>
              <Text style={styles.selectedRestaurantAddress}>
                {selectedRestaurant.vicinity
                  ? selectedRestaurant.vicinity.split(',').slice(0, 3).join(', ')
                  : ''}
              </Text>
            </View>
          )}

          {/* Search Results */}
          {searchText && !selectedRestaurant && (
            <>
              {searchResults.length > 0 && (
                <View style={styles.resultsSection}>
                  {searchResults.map(renderRestaurantCard)}
                </View>
              )}
              {isSearching && (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color={TERRA} />
                  <Text style={styles.loadingText}>Searching restaurants...</Text>
                </View>
              )}
              {!isSearching && searchResults.length === 0 && searchText && !selectedRestaurant && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No restaurants found for "{searchText}". Try a different search term.
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Menu section when restaurant is selected */}
          {selectedRestaurant && (
            <>
              <DishScoringCard
                menuDishes={menuDishes}
                isLoadingMenu={isLoadingMenu}
                menuFound={menuFound}
                onAddPhoto={handleAddPhoto}
                onAddMenuLink={handleAddMenuLink}
                onPasteMenuText={handlePasteMenuText}
                onReviewMenu={() => setShowReviewModal(true)}
              />

              {/* Preferences show immediately when menu is found */}
              {menuFound && (
                <PreferencesPanel
                  hungerLevel={hungerLevel}
                  preferenceLevel={preferenceLevel}
                  selectedCravings={selectedCravings}
                  diningOccasion={diningOccasion}
                  freeTextMood={freeTextMood}
                  onSetHungerLevel={setHungerLevel}
                  onSetPreferenceLevel={setPreferenceLevel}
                  onToggleCraving={toggleCraving}
                  onSetDiningOccasion={setDiningOccasion}
                  onSetFreeTextMood={setFreeTextMood}
                  onContinue={handleContinue}
                />
              )}
            </>
          )}
        </>
      </ScrollView>

      {/* Text Input Modal */}
      <Modal
        visible={showTextModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTextModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Paste Menu Text</Text>
            <TouchableOpacity onPress={handleSubmitMenuText} disabled={!menuText.trim()}>
              <Text
                style={[
                  styles.modalSubmitButton,
                  !menuText.trim() && styles.modalSubmitButtonDisabled,
                ]}
              >
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
              onChangeText={setMenuText}
              placeholder="Paste menu text here..."
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* Menu URL Modal */}
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
            <Text style={styles.modalTitle}>Paste Menu Link</Text>
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
                    setMenuUrls((prev) =>
                      prev.map((p, i) => (i === idx ? text : p))
                    );
                  }}
                  placeholder="https://example.com/menu"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {menuUrls.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeUrlButton}
                    onPress={() =>
                      setMenuUrls((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Text style={styles.removeUrlButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addUrlButton}
              onPress={() => setMenuUrls((prev) => [...prev, ''])}
            >
              <Text style={styles.addUrlButtonText}>+ Add another URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Menu Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.modalCancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {menuDishes.length} dishes
            </Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {(() => {
              const grouped: { [key: string]: ParsedDish[] } = {};
              menuDishes.forEach((dish) => {
                const category = dish.category || 'other';
                if (!grouped[category]) {
                  grouped[category] = [];
                }
                grouped[category].push(dish);
              });
              return Object.keys(grouped).map((category) => (
                <View key={category} style={styles.reviewCategorySection}>
                  <Text style={styles.reviewCategoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  {grouped[category].map((dish, idx) => (
                    <View key={idx} style={styles.reviewDishItem}>
                      <Text style={styles.reviewDishName}>{dish.name}</Text>
                      {dish.description && (
                        <Text style={styles.reviewDishDescription}>{dish.description}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ));
            })()}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Parsing screen with animated messages
const PARSING_MESSAGES = [
  'Reading menu...',
  'Extracting dishes...',
  'Almost done...',
];

function ParsingScreen({ restaurantName }: { restaurantName?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) => (prev < PARSING_MESSAGES.length - 1 ? prev + 1 : prev));
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [opacity]);

  return (
    <View style={styles.parsingContainer}>
      {restaurantName && (
        <Text style={styles.parsingRestaurantName}>{restaurantName}</Text>
      )}
      <View style={styles.parsingDotsRow}>
        <View style={[styles.parsingDot, { opacity: 0.3 }]} />
        <View style={[styles.parsingDot, { opacity: 0.6 }]} />
        <View style={styles.parsingDot} />
      </View>
      <Animated.Text style={[styles.parsingText, { opacity }]}>
        {PARSING_MESSAGES[messageIndex]}
      </Animated.Text>
      <Text style={styles.parsingSubtext}>This may take a few moments</Text>
    </View>
  );
}

const MEDIUM = '#5A4D48';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Editorial header
  editorialHeader: {
    paddingHorizontal: 24,
    paddingBottom: 8,
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
    backgroundColor: '#1B2541',
  },
  eyebrowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1B2541',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: '#1C1917',
  },
  headerAccent: {
    fontFamily: 'PlayfairDisplay-Italic',
    color: RED,
    fontWeight: '500',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  stepText: {
    fontSize: 12,
    color: MEDIUM,
    marginBottom: 8,
    fontFamily: 'DMSans-Regular',
  },
  stepUnderline: {
    height: 1,
    backgroundColor: '#E7E5E4',
    alignSelf: 'stretch',
  },
  selectedRestaurantInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectedRestaurantName: {
    fontSize: 42,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -2.5,
    marginBottom: 4,
  },
  selectedRestaurantAddress: {
    fontSize: 12,
    color: '#A8A29E',
    fontFamily: 'DMSans-Regular',
    fontStyle: 'italic',
  },
  resultsSection: {
    paddingHorizontal: 16,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#A8A29E',
    fontFamily: 'DMSans-Regular',
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: MEDIUM,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },

  // Parsing screen
  parsingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  parsingRestaurantName: {
    fontSize: 28,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -1.5,
    marginBottom: 32,
    textAlign: 'center',
  },
  parsingDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  parsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TERRA,
  },
  parsingText: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    textAlign: 'center',
  },
  parsingSubtext: {
    fontSize: 14,
    color: '#78716C',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },

  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  modalCancelButton: {
    fontSize: 14,
    color: '#5A4D48',
    fontFamily: 'DMSans-Regular',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
  },
  modalSubmitButton: {
    fontSize: 14,
    color: TERRA,
    fontFamily: 'DMSans-Bold',
  },
  modalSubmitButtonDisabled: {
    color: '#A8A29E',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalInstructions: {
    fontSize: 14,
    color: '#5A4D48',
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: 'DMSans-Regular',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1C1917',
    fontFamily: 'DMSans-Regular',
    borderWidth: 1,
    borderColor: '#F5F5F4',
    textAlignVertical: 'top',
  },
  menuUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  menuUrlInput: {
    borderWidth: 1,
    borderColor: '#F5F5F4',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1C1917',
    backgroundColor: '#FAFAF9',
    fontFamily: 'DMSans-Regular',
  },
  addUrlButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
  },
  addUrlButtonText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: TERRA,
  },
  removeUrlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  removeUrlButtonText: {
    color: '#5A4D48',
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
  },

  // Review modal
  reviewCategorySection: {
    marginBottom: 16,
    backgroundColor: '#FAFAF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 16,
  },
  reviewCategoryTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewDishItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  reviewDishName: {
    fontSize: 14,
    color: '#1C1917',
    marginBottom: 4,
    fontFamily: 'DMSans-Medium',
  },
  reviewDishDescription: {
    fontSize: 12,
    color: '#A8A29E',
    fontFamily: 'DMSans-Regular',
    fontStyle: 'italic',
  },
});
