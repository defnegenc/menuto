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
    // For now, show an alert that this feature needs image picker
    Alert.alert(
      'Photo Upload',
      'Photo menu upload is coming soon! For now, you can paste the menu text.',
      [{ text: 'OK' }]
    );
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

    // Navigate to recommendations screen
    if (onNavigateToRecommendations) {
      onNavigateToRecommendations(selectedRestaurant, {
        hungerLevel,
        preferenceLevel,
        selectedCravings
      });
    } else if (onSelectRestaurant) {
      // Fallback to old behavior
      onSelectRestaurant(selectedRestaurant);
    }
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
});
