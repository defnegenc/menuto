import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { FavoriteRestaurant, ParsedDish } from '../types';
import { theme } from '../theme';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { SearchBar } from '../components/SearchBar';
import { SearchRestaurantCard } from '../components/SearchRestaurantCard';
import { SearchRestaurantSelected } from '../components/SearchRestaurantSelected';
import { DishRecommendations } from './DishRecommendations';
import { PostMealFeedback } from './PostMealFeedback';
import { MultiDishScoring } from './MultiDishScoring';
import { DishScoringCard } from './choosedish/DishScoringCard';
import { PreferencesPanel } from './choosedish/PreferencesPanel';

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
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showMenuUrlModal, setShowMenuUrlModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [menuUrls, setMenuUrls] = useState<string[]>(['']);
  const [menuText, setMenuText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Question states
  const [hungerLevel, setHungerLevel] = useState(3);
  const [preferenceLevel, setPreferenceLevel] = useState(3);
  const [selectedCravings, setSelectedCravings] = useState<string[]>([]);
  const [mealStructure, setMealStructure] = useState<string>('main');

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
        setShowQuestions(false);
      } else {
        setMenuDishes([]);
        setShowQuestions(false);
      }
    } catch (error) {
      setMenuDishes([]);
      setShowQuestions(false);
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

  const handleAddMenuPDF = () => {
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

  if (showDishRecommendations && selectedRestaurant) {
    return (
      <DishRecommendations
        restaurant={selectedRestaurant}
        userPreferences={{ hungerLevel, preferenceLevel, selectedCravings, mealStructure }}
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
        <UnifiedHeader title="Choose Dish" showUnderline={false} />
        <View style={[styles.parsingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.parsingText}>Parsing your menu...</Text>
          <Text style={styles.parsingSubtext}>This may take a few moments</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UnifiedHeader title="Choose Dish" showUnderline={false} />

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
                  <ActivityIndicator size="small" color={theme.colors.primary} />
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
                selectedRestaurant={selectedRestaurant}
                menuDishes={menuDishes}
                isLoadingMenu={isLoadingMenu}
                showQuestions={showQuestions}
                showReviewModal={showReviewModal}
                onSetShowReviewModal={setShowReviewModal}
                onConfirmMenu={() => {
                  setShowReviewModal(false);
                  setShowQuestions(true);
                }}
                onAddMoreItems={() => {
                  setShowReviewModal(false);
                  setShowMenuUrlModal(true);
                }}
                onAddMenuPDF={handleAddMenuPDF}
                onPasteMenuText={handlePasteMenuText}
                onAddPhoto={handleAddPhoto}
                showTextModal={showTextModal}
                menuText={menuText}
                onSetShowTextModal={setShowTextModal}
                onSetMenuText={setMenuText}
                onSubmitMenuText={handleSubmitMenuText}
                showMenuUrlModal={showMenuUrlModal}
                menuUrls={menuUrls}
                onSetShowMenuUrlModal={setShowMenuUrlModal}
                onSetMenuUrls={setMenuUrls}
                onSubmitMenuUrls={handleSubmitMenuUrls}
              />

              {showQuestions && menuDishes.length > 0 && (
                <PreferencesPanel
                  hungerLevel={hungerLevel}
                  preferenceLevel={preferenceLevel}
                  selectedCravings={selectedCravings}
                  mealStructure={mealStructure}
                  onSetHungerLevel={setHungerLevel}
                  onSetPreferenceLevel={setPreferenceLevel}
                  onToggleCraving={toggleCraving}
                  onSetMealStructure={setMealStructure}
                  onContinue={handleContinue}
                />
              )}
            </>
          )}
        </>
      </ScrollView>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  stepText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  stepUnderline: {
    height: 2,
    width: screenWidth * 0.9,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    alignSelf: 'center',
  },
  selectedRestaurantInfo: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  selectedRestaurantName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.bold,
    marginBottom: theme.spacing.xs,
  },
  selectedRestaurantAddress: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  resultsSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  emptyState: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  parsingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  parsingText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  parsingSubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
