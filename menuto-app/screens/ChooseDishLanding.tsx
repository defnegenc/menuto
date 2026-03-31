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
import { AddMenuOptions } from '../components/AddMenuOptions';
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

  const resetFlow = () => {
    setSelectedRestaurant(null);
    setSearchText('');
    setSearchResults([]);
    setMenuDishes([]);
    setIsLoadingMenu(false);
    setIsParsing(false);
    setHungerLevel(3);
    setPreferenceLevel(3);
    setSelectedCravings([]);
    setDiningOccasion('');
    setFreeTextMood('');
    setShowDishRecommendations(false);
    setShowMultiDishScoring(false);
    setShowPostMealFeedback(false);
    setSelectedDishesForScoring([]);
    setSelectedDishForFeedback(null);
  };

  const handleDishRecommendationContinue = (dishes: any[]) => {
    setSelectedDishesForScoring(dishes); setShowDishRecommendations(false); setShowMultiDishScoring(true);
  };
  const handleMultiDishScoringComplete = (_dishes: any[], _addToFavorites: boolean[]) => {
    resetFlow();
    Alert.alert('Done!', 'Your feedback has been saved.', [{ text: 'OK' }]);
  };
  const handleFeedbackComplete = (_rating: number, _feedback: string) => {
    resetFlow();
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
        <View style={{ paddingTop: insets.top + 8 }}>
          <ScreenHeader title="Find your" accent="dish" />
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
          {/* ── STEP 1: Find restaurant ───────────────────── */}
          <View style={styles.stepBlock}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, selectedRestaurant && styles.stepNumberDone]}>
                <Text style={[styles.stepNumberText, selectedRestaurant && styles.stepNumberTextDone]}>
                  {selectedRestaurant ? '✓' : '1'}
                </Text>
              </View>
              <View style={styles.stepMeta}>
                <Text style={styles.stepTitle}>
                  {selectedRestaurant ? selectedRestaurant.name : 'Find a restaurant'}
                </Text>
                {selectedRestaurant && (
                  <Text style={styles.stepSubtitle}>
                    {selectedRestaurant.vicinity?.split(',').slice(0, 2).join(', ')}
                  </Text>
                )}
                {!selectedRestaurant && !searchText && (
                  <Text style={styles.stepSubtitle}>Search by name or browse nearby</Text>
                )}
              </View>
              {selectedRestaurant && (
                <TouchableOpacity onPress={() => { setSelectedRestaurant(null); setSearchText(''); setMenuDishes([]); }}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search — only when no restaurant selected */}
            {!selectedRestaurant && (
              <View style={styles.stepContent}>
                <SearchBar
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search restaurants..."
                />
                {searchResults.length > 0 && (
                  <View style={styles.resultsSection}>
                    {searchResults.map(renderRestaurantCard)}
                  </View>
                )}
                {isSearching && (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="small" color={TERRA} />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                )}
                {!isSearching && searchResults.length === 0 && searchText.length > 1 && (
                  <Text style={styles.noResultsText}>No restaurants found</Text>
                )}
              </View>
            )}
          </View>

          {/* ── STEP 2: Menu ─────────────────────────────── */}
          {selectedRestaurant && (
            <View style={styles.stepBlock}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, menuFound && styles.stepNumberDone]}>
                  <Text style={[styles.stepNumberText, menuFound && styles.stepNumberTextDone]}>
                    {menuFound ? '✓' : '2'}
                  </Text>
                </View>
                <View style={styles.stepMeta}>
                  <Text style={styles.stepTitle}>
                    {menuFound ? 'Menu ready' : isLoadingMenu ? 'Loading menu...' : 'Add a menu'}
                  </Text>
                  <Text style={styles.stepSubtitle}>
                    {menuFound
                      ? `${menuDishes.length} dishes available`
                      : 'Photo, link, or paste text'}
                  </Text>
                </View>
                {menuFound && (
                  <TouchableOpacity onPress={() => setShowReviewModal(true)}>
                    <Text style={styles.changeLink}>Review</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!menuFound && !isLoadingMenu && (
                <View style={styles.stepContent}>
                  <AddMenuOptions
                    onAddPhoto={handleAddPhoto}
                    onAddLink={() => { setMenuUrls(['']); setShowMenuUrlModal(true); }}
                    onPasteText={() => setShowTextModal(true)}
                  />
                </View>
              )}
            </View>
          )}

          {/* ── STEP 3: Preferences ──────────────────────── */}
          {selectedRestaurant && menuFound && (
            <View style={styles.stepBlock}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepMeta}>
                  <Text style={styles.stepTitle}>Set your preferences</Text>
                  <Text style={styles.stepSubtitle}>Cravings, hunger, and vibe</Text>
                </View>
              </View>

              <View style={styles.stepContent}>
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
              </View>
            </View>
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
            <Text style={styles.modalTitle}>MENU LINK</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Paste the restaurant's menu URL and we'll extract all dishes.
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
                  placeholderTextColor="#999999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {menuUrls.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      setMenuUrls((prev) => prev.filter((_, i) => i !== idx))
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 20, color: '#CCCCCC', paddingLeft: 8 }}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setMenuUrls((prev) => [...prev, ''])}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 12, color: '#999999', fontFamily: 'DMSans-Regular' }}>+ add another</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            <TouchableOpacity
              style={{
                backgroundColor: menuUrls.some(u => u.trim()) ? '#1A1A1A' : '#E5E5E5',
                borderRadius: 0,
                paddingVertical: 18,
                alignItems: 'center',
              }}
              onPress={handleSubmitMenuUrls}
              disabled={!menuUrls.some(u => u.trim())}
              activeOpacity={0.8}
            >
              <Text style={{
                fontFamily: 'DMSans-Bold',
                fontSize: 16,
                color: menuUrls.some(u => u.trim()) ? '#FFFFFF' : '#999999',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>Parse menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Menu Modal — journal style matching RestaurantDetailScreen */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.modalCancelButton}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {menuDishes.length} DISHES
            </Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Add more items — shared component */}
            <AddMenuOptions
              compact
              onAddPhoto={() => { setShowReviewModal(false); handleAddPhoto(); }}
              onAddLink={() => { setShowReviewModal(false); setMenuUrls(['']); setShowMenuUrlModal(true); }}
              onPasteText={() => { setShowReviewModal(false); setShowTextModal(true); }}
            />

            <View style={styles.reviewDivider} />

            {/* Grouped dishes — journal style */}
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
                      <View style={styles.reviewDishDivider} />
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

// Parsing screen — editorial loading with floating text
const PARSING_MESSAGES = [
  'Flipping through the menu',
  'Spotting the good stuff',
  'Tasting with our eyes',
  'Plating it all together',
];

function ParsingScreen({ restaurantName }: { restaurantName?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const dotOpacity1 = useRef(new Animated.Value(0.2)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.2)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.2)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  // Gentle floating
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, [floatAnim]);

  // Dot pulse
  useEffect(() => {
    const makePulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      ]));
    const p1 = makePulse(dotOpacity1, 0);
    const p2 = makePulse(dotOpacity2, 200);
    const p3 = makePulse(dotOpacity3, 400);
    p1.start(); p2.start(); p3.start();
    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, [dotOpacity1, dotOpacity2, dotOpacity3]);

  // Progress line
  useEffect(() => {
    Animated.timing(lineWidth, {
      toValue: 1,
      duration: 15000,
      useNativeDriver: false,
    }).start();
  }, [lineWidth]);

  // Rotate messages — state update via setTimeout to avoid useInsertionEffect conflict
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % PARSING_MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }, 220);
    }, 3000);
    return () => clearInterval(interval);
  }, [textOpacity]);

  const lineWidthInterp = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.parsingContainer}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }], alignItems: 'center' }}>
        {/* Restaurant name — big serif */}
        {restaurantName && (
          <Text style={styles.parsingRestaurantName}>{restaurantName}</Text>
        )}

        {/* Animated dots */}
        <View style={styles.parsingDotsRow}>
          {[dotOpacity1, dotOpacity2, dotOpacity3].map((dot, i) => (
            <Animated.View key={i} style={[styles.parsingDot, { opacity: dot }]} />
          ))}
        </View>

        {/* Status message */}
        <Animated.Text style={[styles.parsingText, { opacity: textOpacity }]}>
          {PARSING_MESSAGES[messageIndex]}
        </Animated.Text>
      </Animated.View>

      {/* Progress line at bottom */}
      <View style={styles.parsingProgressTrack}>
        <Animated.View style={[styles.parsingProgressFill, { width: lineWidthInterp }]} />
      </View>

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
    backgroundColor: '#1A1A1A',
  },
  eyebrowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1A1A1A',
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
  // Steps
  stepBlock: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberDone: {
    backgroundColor: '#E9323D',
  },
  stepNumberText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  stepNumberTextDone: {
    color: '#FFFFFF',
  },
  stepMeta: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 17,
    color: '#1A1A1A',
  },
  stepSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#9CA3AF',
  },
  changeLink: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    color: '#E9323D',
  },
  stepContent: {
    marginTop: 16,
  },
  noResultsText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
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
    fontSize: 10,
    color: '#1A1A1A',
    marginBottom: 0,
    fontFamily: 'DMSans-Bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  stepUnderline: {
    height: 0,
    backgroundColor: 'transparent',
    alignSelf: 'stretch',
  },
  selectedRestaurantInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectedRestaurantName: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Italic',
    color: '#1C1917',
    letterSpacing: -1,
    marginBottom: 4,
  },
  selectedRestaurantAddress: {
    fontSize: 14,
    color: '#8C7E77',
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
    fontSize: 14,
    color: '#666666',
    fontFamily: 'DMSans-Regular',
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },

  // Parsing screen
  parsingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  parsingRestaurantName: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Italic',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  parsingDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  parsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E9323D',
  },
  parsingText: {
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
    color: '#444444',
    textAlign: 'center',
  },
  parsingProgressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 1,
    overflow: 'hidden',
    marginHorizontal: 40,
  },
  parsingProgressFill: {
    height: 2,
    backgroundColor: '#E9323D',
    borderRadius: 1,
  },
  parsingSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
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
    color: '#666666',
    fontFamily: 'DMSans-Regular',
  },
  modalTitle: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: '#1A1A1A',
    textTransform: 'uppercase',
    letterSpacing: 3,
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
    color: '#444444',
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
    borderRadius: 0,
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
    borderRadius: 0,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  removeUrlButtonText: {
    color: '#666666',
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },

  // Review modal — journal style
  addMoreSection: {
    marginBottom: 16,
  },
  addMoreLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1B2541',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  addMoreRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addMoreBtn: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addMoreBtnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
    color: '#1A1A1A',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 24,
  },
  reviewCategorySection: {
    marginBottom: 24,
  },
  reviewCategoryTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1B2541',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  reviewDishItem: {
    marginBottom: 24,
  },
  reviewDishName: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 18,
    color: '#1A1A1A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  reviewDishDescription: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
  },
  reviewDishDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 16,
  },
});
