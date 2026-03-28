import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
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
import { NoMenuState } from '../components/NoMenuState';
import { DishRecommendations } from './DishRecommendations';
import { PostMealFeedback } from './PostMealFeedback';
import { MultiDishScoring } from './MultiDishScoring';

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

  // Question states - deselected by default (middle of slider)
  const [hungerLevel, setHungerLevel] = useState(3);

  // Feedback flow states
  const [showDishRecommendations, setShowDishRecommendations] = useState(false);
  const [showMultiDishScoring, setShowMultiDishScoring] = useState(false);
  const [showPostMealFeedback, setShowPostMealFeedback] = useState(false);
  const [selectedDishForFeedback, setSelectedDishForFeedback] = useState<any>(null);
  const [selectedDishesForScoring, setSelectedDishesForScoring] = useState<any[]>([]);
  const [preferenceLevel, setPreferenceLevel] = useState(3);
  const [selectedCravings, setSelectedCravings] = useState<string[]>([]);
  const [mealStructure, setMealStructure] = useState<string>('main');

  const insets = useSafeAreaInsets();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect for external restaurants
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
      // Show all restaurants (don't filter out existing favorites for dish selection)
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
      // Check if menu exists
      const response = await api.getRestaurantMenu(restaurant.name, restaurant.place_id);

      if (
        response.dishes &&
        Array.isArray(response.dishes) &&
        response.dishes.length > 0
      ) {
        setMenuDishes(response.dishes);
        setShowQuestions(false); // Don't auto-show questions, wait for Review button
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

  const handleAddMenuPDF = () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'No restaurant selected');
      return;
    }

    setMenuUrls(['']);
    setShowMenuUrlModal(true);
  };

  const handleSubmitMenuUrls = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'No restaurant selected');
      return;
    }

    const urls = menuUrls.map((u) => (u || '').trim()).filter(Boolean);
    if (urls.length === 0) {
      Alert.alert('Error', 'Please add at least one menu URL.');
      return;
    }
    const invalid = urls.find((u) => !/^https?:\/\//i.test(u));
    if (invalid) {
      Alert.alert('Error', `Invalid URL: ${invalid}`);
      return;
    }

    try {
      setShowMenuUrlModal(false);
      setIsParsing(true);

      const ingestResult = await api.ingestMenus(
        selectedRestaurant.place_id,
        selectedRestaurant.name,
        urls
      );
      const ingestId = ingestResult.ingest_id;

      // Poll for completion
      let done = false;
      let attempts = 0;
      const maxAttempts = 60; // ~3 min max
      // eslint-disable-next-line no-await-in-loop
      while (!done && attempts < maxAttempts) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;
        try {
          const status = await api.getIngestStatus(
            selectedRestaurant.place_id,
            ingestId
          );
          if (status.status === 'done' || status.status === 'failed') {
            done = true;
            const successCount = Object.values(status.url_status).filter(
              (s) => s === 'done'
            ).length;
            const failCount = Object.values(status.url_status).filter(
              (s) => s === 'failed'
            ).length;
            Alert.alert(
              'Done!',
              `Parsed ${successCount} menu${successCount === 1 ? '' : 's'}${
                failCount ? `, failed ${failCount}` : ''
              }.`
            );
          }
        } catch (pollErr) {
          // ignore polling error
        }
      }
      if (!done) {
        Alert.alert(
          'Timeout',
          'Menu parsing is taking longer than expected. Please check back later.'
        );
      }
      await handleRestaurantSelection(selectedRestaurant);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePasteMenuText = () => {
    setShowTextModal(true);
  };

  const handleSubmitMenuText = async () => {
    if (!menuText.trim()) {
      Alert.alert('Error', 'Please enter some menu text');
      return;
    }

    if (!selectedRestaurant) {
      Alert.alert('Error', 'No restaurant selected');
      return;
    }

    setIsParsing(true);
    setShowTextModal(false);

    try {
      const ingestResult = await api.ingestMenuText(
        selectedRestaurant.place_id,
        selectedRestaurant.name,
        menuText.trim()
      );
      const ingestId = ingestResult.ingest_id;

      // Poll for completion
      let done = false;
      let attempts = 0;
      const maxAttempts = 60; // ~3 min max
      // eslint-disable-next-line no-await-in-loop
      while (!done && attempts < maxAttempts) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;
        try {
          const status = await api.getIngestStatus(
            selectedRestaurant.place_id,
            ingestId
          );
          if (status.status === 'done' || status.status === 'failed') {
            done = true;
            if (status.status === 'done') {
              const dishCount = status.results?.text?.dish_count || 0;
              Alert.alert(
                'Success!',
                `Menu parsed successfully! Found ${dishCount} dishes.`,
                [{ text: 'OK' }]
              );
              setMenuText('');
            } else {
              const errorMsg = status.results?.text?.error || 'Unknown error';
              Alert.alert(
                'Error',
                `Failed to parse menu: ${errorMsg}`,
                [{ text: 'OK' }]
              );
            }
          }
        } catch (pollErr) {
          // ignore polling error
        }
      }
      if (!done) {
        Alert.alert(
          'Timeout',
          'Menu parsing is taking longer than expected. Please check back later.'
        );
      }

      // Refresh the menu after parsing
      await handleRestaurantSelection(selectedRestaurant);
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to parse menu: ${errorMessage}`, [
        { text: 'OK' },
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddPhoto = () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'No restaurant selected');
      return;
    }

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
                Alert.alert(
                  'Permission Required',
                  'Sorry, we need camera permissions to take menu photos.'
                );
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                await parseMenuFromScreenshot(imageUri);
              }
            } catch {
              Alert.alert('Error', 'Failed to open camera. Please try again.');
            }
          },
        },
        {
          text: 'Upload from Gallery',
          onPress: async () => {
            try {
              const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

              if (status !== 'granted') {
                Alert.alert(
                  'Permission Required',
                  'Sorry, we need gallery permissions to upload menu photos.'
                );
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                await parseMenuFromScreenshot(imageUri);
              }
            } catch {
              Alert.alert('Error', 'Failed to open gallery. Please try again.');
            }
          },
        },
      ]
    );
  };

  const parseMenuFromScreenshot = async (imageUri: string) => {
    if (!selectedRestaurant) return;

    setIsParsing(true);
    try {
      const result = await api.parseMenuFromScreenshot(
        imageUri,
        selectedRestaurant.name,
        selectedRestaurant.place_id
      );

      if (result && result.dishes && result.dishes.length > 0) {
        Alert.alert(
          'Success!',
          `Menu parsed successfully! Found ${result.dishes.length} dishes.`,
          [{ text: 'OK' }]
        );

        await handleRestaurantSelection(selectedRestaurant);
      } else {
        Alert.alert(
          'No Dishes Found',
          'The image was processed but no menu items were found. Please try a clearer image or paste the menu text instead.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to parse menu: ${errorMessage}`, [
        { text: 'OK' },
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  const cravingOptions = [
    'light',
    'fresh',
    'carb-heavy',
    'protein-heavy',
    'spicy',
    'creamy',
    'crispy',
    'comforting',
  ];

  const toggleCraving = (craving: string) => {
    setSelectedCravings((prev) =>
      prev.includes(craving)
        ? prev.filter((c) => c !== craving)
        : [...prev, craving]
    );
  };

  const handleContinue = () => {
    if (!selectedRestaurant) {
      Alert.alert('Please select a restaurant first');
      return;
    }

    setShowDishRecommendations(true);
  };

  // Feedback flow handlers
  const handleDishRecommendationContinue = (dishes: any[]) => {
    setSelectedDishesForScoring(dishes);
    setShowDishRecommendations(false);
    setShowMultiDishScoring(true);
  };

  const handleMultiDishScoringComplete = (
    dishes: any[],
    addToFavorites: boolean[]
  ) => {
    setShowMultiDishScoring(false);
    setSelectedDishesForScoring([]);

    Alert.alert(
      'Feedback Submitted!',
      'Thank you for your feedback. Your preferences have been saved.',
      [{ text: 'OK' }]
    );
  };

  const handleFeedbackComplete = (rating: number, feedback: string) => {
    setShowPostMealFeedback(false);
    setSelectedDishForFeedback(null);
  };

  const handleBackToRecommendations = () => {
    setShowPostMealFeedback(false);
    setShowMultiDishScoring(false);
    setShowDishRecommendations(true);
  };

  const handleBackToQuestions = () => {
    setShowDishRecommendations(false);
    setShowQuestions(true);
  };

  const handleBackToRestaurantSelection = () => {
    setShowDishRecommendations(false);
    setShowQuestions(false);
    setSelectedRestaurant(null);
    setMenuDishes([]);
    setSearchText('');
    setSearchResults([]);
  };

  const handleBackToChooseDishLanding = () => {
    setShowDishRecommendations(false);
  };

  const renderRestaurantCard = (restaurant: any) => {
    const isSelected = selectedRestaurant?.place_id === restaurant.place_id;

    if (isSelected) {
      return (
        <SearchRestaurantSelected
          key={restaurant.place_id}
          restaurant={restaurant}
          onPress={() => handleRestaurantSelection(restaurant)}
        />
      );
    }

    return (
      <SearchRestaurantCard
        key={restaurant.place_id}
        restaurant={restaurant}
        onPress={() => handleRestaurantSelection(restaurant)}
      />
    );
  };

  if (showDishRecommendations && selectedRestaurant) {
    return (
      <DishRecommendations
        restaurant={selectedRestaurant}
        userPreferences={{
          hungerLevel,
          preferenceLevel,
          selectedCravings,
          mealStructure,
        }}
        onContinue={handleDishRecommendationContinue}
        onBack={handleBackToChooseDishLanding}
      />
    );
  }

  if (
    showMultiDishScoring &&
    selectedRestaurant &&
    selectedDishesForScoring.length > 0
  ) {
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <>
          {/* Step 1: Search for restaurant - only show when no search text and no restaurant selected */}
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

          {/* Selected Restaurant Info - Show when restaurant is selected */}
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

          {/* Step 2: Show when restaurant is selected but menu not confirmed yet */}
          {selectedRestaurant && !showQuestions && (
            <View style={styles.stepSection}>
              <Text style={styles.stepText}>Step 2: Add or confirm menu</Text>
              <View style={styles.stepUnderline} />
            </View>
          )}

          {/* Menu confirmed - show when menu is found and confirmed */}
          {selectedRestaurant && menuDishes.length > 0 && showQuestions && (
            <>
              <View style={styles.separatorLine} />
              <View style={styles.menuConfirmedSection}>
                <Text style={styles.menuConfirmedText}>Menu confirmed</Text>
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Text style={styles.reviewButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.separatorLine} />
            </>
          )}

          {/* Search Results - only show when searching and no restaurant selected */}
          {searchText && !selectedRestaurant && (
            <>
              {searchResults.length > 0 && (
                <View style={styles.resultsSection}>
                  {searchResults.map(renderRestaurantCard)}
                </View>
              )}

              {/* Loading State */}
              {isSearching && (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Searching restaurants...</Text>
                </View>
              )}

              {/* No Results */}
              {!isSearching &&
                searchResults.length === 0 &&
                searchText &&
                !selectedRestaurant && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No restaurants found for "{searchText}". Try a different search term.
                    </Text>
                  </View>
                )}
            </>
          )}

          {/* Menu loading and content - show when restaurant is selected */}
          {selectedRestaurant && (
            <>
              {isLoadingMenu ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Checking menu...</Text>
                </View>
              ) : menuDishes.length > 0 ? (
                <>
                  {!showQuestions && (
                    <View style={styles.menuFoundSection}>
                      <Text style={styles.menuFoundText}>Menu found!</Text>
                      <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => setShowReviewModal(true)}
                      >
                        <Text style={styles.reviewButtonText}>Review</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {showQuestions && (
                    <>
                      <View style={styles.stepSection}>
                        <Text style={styles.stepText}>
                          Step 3: Indicate your preferences
                        </Text>
                        <View style={styles.stepUnderline} />
                      </View>
                      <View style={styles.questionsSection}>
                        {/* Hunger Level */}
                        <View style={styles.questionContainer}>
                          <Text style={styles.questionTitle}>How hungry are you?</Text>
                          <View style={styles.simpleSlider}>
                            <View style={styles.simpleSliderTrack} />
                            <View style={styles.sliderStops}>
                              {[1, 2, 3, 4, 5].map((level) => (
                                <TouchableOpacity
                                  key={level}
                                  style={styles.invisibleStop}
                                  onPress={() => setHungerLevel(level)}
                                />
                              ))}
                            </View>
                            <View
                              style={[
                                styles.sliderThumb,
                                { left: `${((hungerLevel - 1) / 4) * 100}%` },
                              ]}
                            />
                          </View>
                          <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabel}>Barely hungry</Text>
                            <Text style={styles.sliderLabel}>Ravenous</Text>
                          </View>
                        </View>

                        {/* Preference Level */}
                        <View style={styles.questionContainer}>
                          <Text style={styles.questionTitle}>
                            Go for what's popular, or match your preferences?
                          </Text>
                          <View style={styles.simpleSlider}>
                            <View style={styles.simpleSliderTrack} />
                            <View style={styles.sliderStops}>
                              {[1, 2, 3, 4, 5].map((level) => (
                                <TouchableOpacity
                                  key={level}
                                  style={styles.invisibleStop}
                                  onPress={() => setPreferenceLevel(level)}
                                />
                              ))}
                            </View>
                            <View
                              style={[
                                styles.sliderThumb,
                                { left: `${((preferenceLevel - 1) / 4) * 100}%` },
                              ]}
                            />
                          </View>
                          <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabel}>All me</Text>
                            <Text style={styles.sliderLabel}>Fan favorites</Text>
                          </View>
                        </View>

                        {/* Craving Selection */}
                        <View style={styles.questionContainer}>
                          <Text style={styles.questionTitle}>What are you craving?</Text>
                          <Text style={styles.questionSubtitle}>
                            Select all that apply
                          </Text>
                          <View style={styles.cravingChipsContainer}>
                            {cravingOptions.map((craving) => {
                              const isSelected = selectedCravings.includes(craving);
                              return (
                                <TouchableOpacity
                                  // eslint-disable-next-line react/jsx-key
                                  key={craving}
                                  style={[
                                    styles.cravingChip,
                                    isSelected && styles.cravingChipSelected,
                                  ]}
                                  onPress={() => toggleCraving(craving)}
                                >
                                  <Text
                                    style={[
                                      styles.cravingChipText,
                                      isSelected && styles.cravingChipTextSelected,
                                    ]}
                                  >
                                    {craving}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        {/* Meal Structure Selection */}
                        <View style={styles.questionContainer}>
                          <Text style={styles.questionTitle}>
                            What do you want to order?
                          </Text>
                          <View style={styles.mealStructureContainer}>
                            <TouchableOpacity
                              style={[
                                styles.mealStructureOption,
                                mealStructure === 'main' &&
                                  styles.mealStructureOptionSelected,
                              ]}
                              onPress={() => setMealStructure('main')}
                            >
                              <Text
                                style={[
                                  styles.mealStructureText,
                                  mealStructure === 'main' &&
                                    styles.mealStructureTextSelected,
                                ]}
                              >
                                Just a main
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.mealStructureOption,
                                mealStructure === 'main+starter' &&
                                  styles.mealStructureOptionSelected,
                              ]}
                              onPress={() => setMealStructure('main+starter')}
                            >
                              <Text
                                style={[
                                  styles.mealStructureText,
                                  mealStructure === 'main+starter' &&
                                    styles.mealStructureTextSelected,
                                ]}
                              >
                                Main + starter
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.mealStructureOption,
                                mealStructure === 'share' &&
                                  styles.mealStructureOptionSelected,
                              ]}
                              onPress={() => setMealStructure('share')}
                            >
                              <Text
                                style={[
                                  styles.mealStructureText,
                                  mealStructure === 'share' &&
                                    styles.mealStructureTextSelected,
                                ]}
                              >
                                Something to share
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Continue Button */}
                        <TouchableOpacity
                          style={styles.continueButton}
                          onPress={handleContinue}
                        >
                          <Text style={styles.continueButtonText}>Continue</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.noMenuSection}>
                  <NoMenuState
                    onAddMenuPDF={handleAddMenuPDF}
                    onPasteMenuText={handlePasteMenuText}
                    onAddPhoto={handleAddPhoto}
                  />
                </View>
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

      {/* Review Menu Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Menu Summary</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalInstructions}>
              Review the menu items found for {selectedRestaurant?.name}
            </Text>

            {(() => {
              // Group dishes by category
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
                  {grouped[category].slice(0, 5).map((dish, idx) => (
                    <View key={idx} style={styles.reviewDishItem}>
                      <Text style={styles.reviewDishName}>{dish.name}</Text>
                      {dish.description && (
                        <Text style={styles.reviewDishDescription}>{dish.description}</Text>
                      )}
                    </View>
                  ))}
                  {grouped[category].length > 5 && (
                    <Text style={styles.reviewMoreText}>
                      + {grouped[category].length - 5} more items
                    </Text>
                  )}
                </View>
              ));
            })()}
          </ScrollView>

          <View style={styles.reviewModalActions}>
            <TouchableOpacity
              style={styles.reviewActionButton}
              onPress={() => {
                setShowReviewModal(false);
                setShowMenuUrlModal(true);
              }}
            >
              <Text style={styles.reviewActionButtonText}>Add more items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewActionButton, styles.reviewConfirmButton]}
              onPress={() => {
                setShowReviewModal(false);
                setShowQuestions(true);
              }}
            >
              <Text
                style={[
                  styles.reviewActionButtonText,
                  styles.reviewConfirmButtonText,
                ]}
              >
                Confirm
              </Text>
            </TouchableOpacity>
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
                    setMenuUrls((prev) =>
                      prev.map((p, i) => (i === idx ? text : p))
                    );
                  }}
                  placeholder="https://example.com/menu or menu.pdf"
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
  restaurantHeaderSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  restaurantHeaderInfo: {
    flexDirection: 'column',
  },
  restaurantNameText: {
    fontSize: 40,
    fontWeight: theme.typography.weights.bold,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.bold,
    marginBottom: 6,
  },
  restaurantAddressText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  resultsSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  selectedSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  selectedRestaurantSeparator: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  separatorLine: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  selectedRestaurantContainer: {
    marginVertical: theme.spacing.sm,
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
  menuFoundSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuFoundText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
    flex: 1,
  },
  menuConfirmedSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuConfirmedText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
    flex: 1,
  },
  reviewButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 4,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  questionsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  questionContainer: {
    marginBottom: theme.spacing.xxxl,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  simpleSlider: {
    width: '100%',
    height: 40,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    position: 'relative',
  },
  simpleSliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  sliderStops: {
    position: 'absolute',
    top: 0,
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invisibleStop: {
    flex: 1,
    height: '100%',
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  noMenuSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  noMenuTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  noMenuSubtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  questionSubtitle: {
    fontSize: 15,
    color: '#000000',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  cravingChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cravingChip: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cravingChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cravingChipText: {
    fontSize: 13,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  cravingChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  mealStructureContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  mealStructureOption: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  mealStructureOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mealStructureText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  mealStructureTextSelected: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.medium,
  },

  // Modal styles
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
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalSubmitButton: {
    fontSize: theme.typography.sizes.md,
    color: '#000000',
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
    color: '#000000',
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
  menuUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  menuUrlInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  addUrlButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  addUrlButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  removeUrlButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.secondary,
  },
  removeUrlButtonText: {
    color: theme.colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  reviewCategorySection: {
    marginBottom: theme.spacing.lg,
  },
  reviewCategoryTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.normal,
    color: '#000000',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  reviewDishItem: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reviewDishName: {
    fontSize: 13,
    color: '#000000',
    marginBottom: 4,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  reviewDishDescription: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  reviewMoreText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    fontFamily: theme.typography.fontFamilies.regular,
    marginTop: theme.spacing.xs,
  },
  reviewModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  reviewActionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  reviewConfirmButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reviewActionButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  reviewConfirmButtonText: {
    color: '#FFFFFF',
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
