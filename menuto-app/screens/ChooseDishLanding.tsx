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
  onNavigateToRecommendations?: (restaurant: FavoriteRestaurant, preferences: {
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  }) => void;
}

export function ChooseDishLanding({ onSelectRestaurant, onNavigateToRecommendations }: Props) {
  const { user, userId } = useStore();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [menuDishes, setMenuDishes] = useState<ParsedDish[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [menuText, setMenuText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  
  // Question states
  const [hungerLevel, setHungerLevel] = useState(3);
  
  // Feedback flow states
  const [showDishRecommendations, setShowDishRecommendations] = useState(false);
  const [showMultiDishScoring, setShowMultiDishScoring] = useState(false);
  const [showPostMealFeedback, setShowPostMealFeedback] = useState(false);
  const [selectedDishForFeedback, setSelectedDishForFeedback] = useState<any>(null);
  const [selectedDishesForScoring, setSelectedDishesForScoring] = useState<any[]>([]);
  const [preferenceLevel, setPreferenceLevel] = useState(3);
  const [selectedCravings, setSelectedCravings] = useState<string[]>([]);
  
  const insets = useSafeAreaInsets();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const favoriteRestaurants = user?.favorite_restaurants || [];

  // Debounced search effect for external restaurants
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchText.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
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
  }, [searchText]);

  const searchExternalRestaurants = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.searchPlaces(searchText.trim());
      console.log('🔍 External search results:', results);
      
      // Show all restaurants (don't filter out existing favorites for dish selection)
      const allRestaurants = results.restaurants || [];
      
      setSearchResults(allRestaurants);
    } catch (error) {
      console.error('External search error:', error);
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
      
      if (response.dishes && Array.isArray(response.dishes) && response.dishes.length > 0) {
        console.log(`✅ Menu found for: ${restaurant.name}`);
        setMenuDishes(response.dishes);
        setShowQuestions(true);
      } else {
        console.log(`❌ No menu found for: ${restaurant.name}`);
        setMenuDishes([]);
        setShowQuestions(false);
      }
    } catch (error) {
      console.error(`Error loading menu for ${restaurant.name}:`, error);
      setMenuDishes([]);
      setShowQuestions(false);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleAddMenuPDF = async () => {
    // For PDF, we'll need to implement file picker
    // For now, show an alert that this feature is coming soon
    Alert.alert(
      'PDF Upload',
      'PDF menu upload is coming soon! For now, you can paste the menu text or take a photo.',
      [{ text: 'OK' }]
    );
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
      console.log('Parsing menu text for:', selectedRestaurant.name);
      
      const result = await api.parseMenuFromText(
        menuText.trim(),
        selectedRestaurant.name,
        selectedRestaurant.vicinity || ''
      );
      
      console.log('Menu parsing result:', result);
      
      Alert.alert(
        'Success!', 
        `Menu parsed successfully! Found ${result.dishes?.length || 0} dishes.`,
        [{ text: 'OK' }]
      );
      
      // Clear the text input
      setMenuText('');
      
      // Refresh the menu after parsing
      await handleRestaurantSelection(selectedRestaurant);
      
    } catch (error) {
      console.error('Error parsing menu text:', error);
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

  const handleAddPhoto = async () => {
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

  const parseMenuFromScreenshot = async (imageUri: string) => {
    if (!selectedRestaurant) return;

    setIsParsing(true);
    try {
      console.log('📸 Parsing menu screenshot for:', selectedRestaurant.name);
      console.log('📸 Image URI:', imageUri);
      
      const result = await api.parseMenuFromScreenshot(
        imageUri,
        selectedRestaurant.name,
        selectedRestaurant.vicinity || ''
      );
      
      console.log('✅ Menu parsing result:', JSON.stringify(result, null, 2));
      
      if (result && result.dishes && result.dishes.length > 0) {
        Alert.alert(
          'Success!', 
          `Menu parsed successfully! Found ${result.dishes.length} dishes.`,
          [{ text: 'OK' }]
        );
        
        // Refresh the menu after parsing
        await handleRestaurantSelection(selectedRestaurant);
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

  const cravingOptions = [
    'light', 'fresh', 'carb-heavy', 'protein-heavy', 'spicy', 'creamy', 'crispy', 'comforting'
  ];

  const toggleCraving = (craving: string) => {
    setSelectedCravings(prev => 
      prev.includes(craving) 
        ? prev.filter(c => c !== craving)
        : [...prev, craving]
    );
  };

  const handleContinue = () => {
    if (!selectedRestaurant) {
      Alert.alert('Please select a restaurant first');
      return;
    }

    console.log('Continue clicked with preferences:', {
      hungerLevel,
      preferenceLevel,
      selectedCravings,
      restaurant: selectedRestaurant
    });

    // Show dish recommendations within this component
    setShowDishRecommendations(true);
  };

  // Feedback flow handlers
  const handleDishRecommendationContinue = (dishes: any[]) => {
    console.log('Dishes selected for scoring:', dishes);
    setSelectedDishesForScoring(dishes);
    setShowDishRecommendations(false);
    setShowMultiDishScoring(true);
  };

  const handleMultiDishScoringComplete = (dishes: any[], addToFavorites: boolean[]) => {
    console.log('Multi-dish scoring completed:', { dishes, addToFavorites });
    
    // Complete the flow - no need for additional feedback screen
    setShowMultiDishScoring(false);
    setSelectedDishesForScoring([]);
    
    // Show success message
    Alert.alert(
      'Feedback Submitted!',
      'Thank you for your feedback. Your preferences have been saved.',
      [{ text: 'OK' }]
    );
  };

  const handleFeedbackComplete = (rating: number, feedback: string) => {
    console.log('Feedback completed:', { rating, feedback });
    setShowPostMealFeedback(false);
    setSelectedDishForFeedback(null);
    // Stay in the same component - user can continue using the app
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
    // Keep the restaurant selected and questions answered, just go back to the main landing view
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

  // Show dish recommendations screen
  if (showDishRecommendations && selectedRestaurant) {
    return (
      <DishRecommendations
        restaurant={selectedRestaurant}
        userPreferences={{
          hungerLevel,
          preferenceLevel,
          selectedCravings
        }}
        onContinue={handleDishRecommendationContinue}
        onBack={handleBackToChooseDishLanding}
      />
    );
  }

  // Show multi-dish scoring screen
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

  // Show post meal feedback screen
      if (showPostMealFeedback && selectedDishForFeedback) {
        return (
          <PostMealFeedback
            dish={selectedDishForFeedback}
            onComplete={handleFeedbackComplete}
            onBack={handleBackToRecommendations}
          />
        );
      }

      // Show parsing loading state
      if (isParsing) {
        return (
          <View style={styles.container}>
            <UnifiedHeader title="Choose Dish" />
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
      <UnifiedHeader title="Choose Dish" />
      
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search restaurants..."
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {!selectedRestaurant ? (
          <>
            {/* Instructions */}
            {!searchText && (
              <View style={styles.instructionsSection}>
                <Text style={styles.stepNumber}>1. Find Restaurant</Text>
                <Text style={styles.stepDescription}>Use the search bar to find the restaurant</Text>
                
                <Text style={[styles.stepNumber, { marginTop: theme.spacing.xl }]}>2. Scan Menu</Text>
                <Text style={styles.stepDescription}>If you're the first user to try this restaurant, add the menu!</Text>
                
                <Text style={[styles.stepNumber, { marginTop: theme.spacing.xl }]}>3. Indicate preferences</Text>
                <Text style={styles.stepDescription}>Let us know what you're in the mood for.</Text>
              </View>
            )}
            
            {/* Search Results */}
            {searchText && (
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
                {!isSearching && searchResults.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No restaurants found for "{searchText}". Try a different search term.
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Selected Restaurant */}
            <View style={styles.selectedSection}>
              {renderRestaurantCard(selectedRestaurant)}
            </View>
            
            {isLoadingMenu ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Checking menu...</Text>
              </View>
            ) : menuDishes.length > 0 ? (
              <>
                {/* Menu Found */}
                <View style={styles.menuFoundSection}>
                  <Text style={styles.menuFoundTitle}>Menu found!</Text>
                  <Text style={styles.menuFoundSubtitle}>Time to choose your dish.</Text>
                </View>
                
                {showQuestions && (
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
                            { left: `${((hungerLevel - 1) / 4) * 100}%` }
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
                      <Text style={styles.questionTitle}>Go for what's popular, or match your preferences?</Text>
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
                            { left: `${((preferenceLevel - 1) / 4) * 100}%` }
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
                      <Text style={styles.questionSubtitle}>Select all that apply</Text>
                      <View style={styles.cravingChipsContainer}>
                        {cravingOptions.map((craving) => (
                          <TouchableOpacity
                            key={craving}
                            style={[
                              styles.cravingChip,
                              selectedCravings.includes(craving) && styles.cravingChipSelected
                            ]}
                            onPress={() => toggleCraving(craving)}
                          >
                            <Text style={[
                              styles.cravingChipText,
                              selectedCravings.includes(craving) && styles.cravingChipTextSelected
                            ]}>
                              {craving}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    {/* Continue Button */}
                    <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                      <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              /* No Menu Yet */
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
              onChangeText={setMenuText}
              placeholder="Paste menu text here..."
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  instructionsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  stepNumber: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  stepDescription: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  resultsSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  selectedSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
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
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  menuFoundTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  menuFoundSubtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  questionsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  questionContainer: {
    marginBottom: theme.spacing.xl,
  },
  questionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.secondary,
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
    backgroundColor: theme.colors.secondary,
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
    backgroundColor: theme.colors.secondary,
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
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  cravingChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cravingChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cravingChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cravingChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  cravingChipTextSelected: {
    color: theme.colors.text.light,
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
