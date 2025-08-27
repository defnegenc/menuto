import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { UserPreferences } from '../types';
import { theme } from '../theme';

const POPULAR_CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 
  'Thai', 'French', 'American', 'Korean', 'Vietnamese',
  'Mediterranean', 'Greek', 'Spanish', 'Turkish'
];

const ALL_CUISINES = [
  // Popular cuisines (already shown above)
  ...POPULAR_CUISINES,
  
  // Regional Asian
  'Persian', 'Georgian', 'Nepalese', 'Pakistani',
  'Bangladeshi', 'Sri Lankan', 'Afghan', 'Indonesian',
  'Malaysian', 'Filipino', 'Burmese', 'Laotian', 'Cambodian',
  
  // Middle Eastern & North African
  'Lebanese', 'Moroccan', 'Tunisian', 'Algerian', 'Egyptian', 'Israeli',
  'Syrian', 'Jordanian', 'Iraqi', 'Yemeni', 'Ethiopian',
  'Eritrean', 'Sudanese',
  
  // European
  'Russian', 'Ukrainian', 'Polish', 'Hungarian', 'Czech',
  'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Albanian',
  'Portuguese', 'Dutch', 'German', 'Austrian', 'Swiss',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Estonian',
  'Latvian', 'Lithuanian',
  
  // Latin American & Caribbean
  'Peruvian', 'Colombian', 'Venezuelan', 'Ecuadorian', 'Brazilian',
  'Argentinian', 'Chilean', 'Bolivian', 'Paraguayan', 'Uruguayan',
  'Cuban', 'Dominican', 'Puerto Rican', 'Jamaican', 'Haitian',
  'Trinidadian', 'Barbadian',
  
  // African
  'Nigerian', 'Ghanaian', 'Senegalese', 'Ivorian', 'Malian',
  'South African', 'Kenyan', 'Tanzanian', 'Ugandan',
  
  // Specialty & Fusion
  'Fusion', 'Experimental', 'Vegan', 'Vegetarian', 'Raw', 'Molecular Gastronomy',
  'Farm-to-Table', 'Comfort Food', 'Soul Food', 'Cajun', 'Creole'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Nut-Free', 'Keto', 'Pescatarian', 'Halal', 'Kosher'
];

interface Props {
  onComplete: () => void;
  onBack?: () => void;
}

export function OnboardingScreen({ onComplete, onBack }: Props) {
  const setUser = useStore((state) => state.setUser);
  
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSearch, setCuisineSearch] = useState<string>('');
  const [showAllCuisines, setShowAllCuisines] = useState<boolean>(false);
  const [spiceTolerance, setSpiceTolerance] = useState<number>(3);
  const [pricePreferences, setPricePreferences] = useState<number[]>([2]); // Multiple selection
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setDietaryRestrictions(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const togglePricePreference = (price: number) => {
    setPricePreferences(prev =>
      prev.includes(price)
        ? prev.filter(p => p !== price)
        : [...prev, price].sort()
    );
  };

  const getFilteredCuisines = () => {
    const cuisinesToShow = cuisineSearch.trim() 
      ? ALL_CUISINES.filter(cuisine =>
          cuisine.toLowerCase().includes(cuisineSearch.toLowerCase())
        )
      : showAllCuisines 
        ? ALL_CUISINES 
        : POPULAR_CUISINES;
    
    return cuisinesToShow;
  };

  const handleComplete = () => {
    if (selectedCuisines.length === 0) {
      Alert.alert('Please select at least one cuisine preference');
      return;
    }

    const preferences: UserPreferences = {
      preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
      spice_tolerance: spiceTolerance,
      price_preference: Math.min(...pricePreferences), // Use minimum for backward compatibility
      dietary_restrictions: dietaryRestrictions.map(r => r.toLowerCase()),
    };

    // Generate a mock user ID (in real app, this would come from auth)
    const mockUserId = '00000000-0000-0000-0000-000000000001';
    
    setUser(preferences, mockUserId);
    onComplete();
  };

  const renderChip = (
    text: string, 
    isSelected: boolean, 
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={text}
      style={[
        styles.chip,
        isSelected && styles.chipSelected
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.chipText,
        isSelected && styles.chipTextSelected
      ]}>
        {text}
      </Text>
    </TouchableOpacity>
  );

  const getSpiceEmoji = (level: number) => {
    return '🌶️'.repeat(level);
  };

  const getSpiceLabel = (level: number) => {
    switch(level) {
      case 1: return 'Hand me the milk';
      case 2: return 'Gentle warmth';
      case 3: return 'Bring it on';
      case 4: return 'I can handle this';
      case 5: return 'Set me on fire';
      default: return 'Gentle warmth';
    }
  };

  const renderPriceLevel = (level: number) => (
    <TouchableOpacity
      key={level}
      style={[
        styles.priceButton,
        pricePreferences.includes(level) && styles.priceButtonSelected
      ]}
      onPress={() => togglePricePreference(level)}
    >
      <Text style={[
        styles.priceText,
        pricePreferences.includes(level) && styles.priceTextSelected
      ]}>
        {'$'.repeat(level)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Let's learn your taste</Text>
          <Text style={styles.subtitle}>This helps us recommend dishes you'll love</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Cuisines</Text>
          <Text style={styles.sectionSubtitle}>Select all that you enjoy</Text>
          
          <TextInput
            style={styles.searchInput}
            value={cuisineSearch}
            onChangeText={setCuisineSearch}
            placeholder="Search cuisines (e.g., Turkish, Georgian, Persian...)"
            placeholderTextColor={theme.colors.text.secondary}
          />
          
          <View style={styles.chipsContainer}>
            {getFilteredCuisines().map(cuisine => 
              renderChip(
                cuisine, 
                selectedCuisines.includes(cuisine),
                () => toggleCuisine(cuisine)
              )
            )}
          </View>
          
          {!cuisineSearch.trim() && !showAllCuisines && (
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => setShowAllCuisines(true)}
            >
              <Text style={styles.expandButtonText}>
                + Show More Cuisines ({ALL_CUISINES.length - POPULAR_CUISINES.length} more)
              </Text>
            </TouchableOpacity>
          )}
          
          {showAllCuisines && !cuisineSearch.trim() && (
            <TouchableOpacity 
              style={styles.collapseButton}
              onPress={() => setShowAllCuisines(false)}
            >
              <Text style={styles.collapseButtonText}>
                − Show Less
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spice Tolerance</Text>
          
          <View style={styles.spiceSliderContainer}>
            {/* Current selection display */}
            <View style={styles.currentSelectionDisplay}>
              <Text style={styles.currentPeppers}>
                {getSpiceEmoji(spiceTolerance)}
              </Text>
            </View>
            
            {/* Custom slider with round stops */}
            <View style={styles.customSlider}>
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill, 
                    { width: `${(spiceTolerance / 5) * 100}%` }
                  ]} 
                />
                {/* Round stops */}
                <View style={styles.sliderStops}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.sliderStop,
                        spiceTolerance >= level && styles.sliderStopActive,
                      ]}
                      onPress={() => setSpiceTolerance(level)}
                    />
                  ))}
                </View>
              </View>
            </View>
            
            {/* Funny description text */}
            <Text style={styles.spiceDescription}>
              {getSpiceLabel(spiceTolerance)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <Text style={styles.sectionSubtitle}>Select all ranges you're comfortable with</Text>
          <View style={styles.priceContainer}>
            {[1, 2, 3, 4].map(renderPriceLevel)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <Text style={styles.sectionSubtitle}>Optional</Text>
          <View style={styles.chipsContainer}>
            {DIETARY_RESTRICTIONS.map(restriction =>
              renderChip(
                restriction,
                dietaryRestrictions.includes(restriction),
                () => toggleDietaryRestriction(restriction)
              )
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    fontSize: theme.typography.sizes.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.xxxl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.weights.medium,
  },
  chipTextSelected: {
    color: theme.colors.text.light,
  },
  expandButton: {
    backgroundColor: theme.colors.tertiary + '15',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
    borderStyle: 'dashed',
  },
  expandButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.tertiary,
    fontWeight: theme.typography.weights.medium,
  },
  collapseButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  collapseButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.weights.medium,
  },
  spiceSliderContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  currentSelectionDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  currentPeppers: {
    fontSize: 28,
    lineHeight: 32,
  },
  customSlider: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: theme.colors.tertiary,
    borderRadius: 3,
  },
  sliderStops: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  sliderStop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  sliderStopActive: {
    backgroundColor: theme.colors.tertiary,
    borderColor: theme.colors.tertiary,
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  priceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  priceButtonSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  priceText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
  },
  priceTextSelected: {
    color: theme.colors.text.light,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginVertical: theme.spacing.xxxl,
  },
  continueButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
  },
});