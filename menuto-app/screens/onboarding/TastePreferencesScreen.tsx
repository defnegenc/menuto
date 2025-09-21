import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { UserPreferences } from '../../types';
import { theme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';

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

// Popular cities for home base selection
const HOME_BASE_CITIES = [
  { name: 'New York', emoji: '🗽', coordinates: '40.7128,-74.0060' },
  { name: 'Los Angeles', emoji: '🌴', coordinates: '34.0522,-118.2437' },
  { name: 'San Francisco', emoji: '🌉', coordinates: '37.7749,-122.4194' },
  { name: 'London', emoji: '☕', coordinates: '51.5074,-0.1278' },
  { name: 'Istanbul', emoji: '🕌', coordinates: '41.0082,28.9784' },
];

interface Props {
  onComplete: () => void;
  onBack?: () => void;
}

export function TastePreferencesScreen({ onComplete, onBack }: Props) {
  const { user, setUser } = useStore();
  const userId = useStore((state) => state.userId);
  const insets = useSafeAreaInsets();
  
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSearch, setCuisineSearch] = useState<string>('');
  const [showAllCuisines, setShowAllCuisines] = useState<boolean>(false);
  const [spiceTolerance, setSpiceTolerance] = useState<number>(3);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  
  // Home base selection
  const [selectedHomeBase, setSelectedHomeBase] = useState<string>('');

  // Pre-fill existing preferences if user has them
  useEffect(() => {
    if (user) {
      if (Array.isArray(user.preferred_cuisines)) {
        setSelectedCuisines(user.preferred_cuisines.map(c => c[0].toUpperCase() + c.slice(1)));
      }
      if (typeof user.spice_tolerance === 'number') setSpiceTolerance(user.spice_tolerance);
      if (Array.isArray(user.dietary_restrictions)) {
        setDietaryRestrictions(user.dietary_restrictions.map(r => r[0].toUpperCase() + r.slice(1)));
      }
      if (user.home_base) {
        setSelectedHomeBase(user.home_base);
      }
    }
  }, [user]);

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

  const toggleHomeBase = (cityName: string) => {
    setSelectedHomeBase(selectedHomeBase === cityName ? '' : cityName);
  };

  const handleComplete = async () => {
    if (selectedCuisines.length === 0) {
      Alert.alert('Please select at least one cuisine preference');
      return;
    }

    const preferences: UserPreferences = {
      preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
      spice_tolerance: spiceTolerance,
      price_preference: 2, // Default price preference
      dietary_restrictions: dietaryRestrictions.map(r => r.toLowerCase()),
      home_base: selectedHomeBase || undefined,
    };

    console.log('🎯 Taste preferences to save:', preferences);

    // Use the actual user ID from the store
    if (userId) {
      console.log('💾 Saving taste preferences for user:', userId);
      setUser(preferences, userId);
    } else {
      console.log('❌ No userId available for taste preferences');
    }
    
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
      case 4: return 'Spicy is my middle name';
      case 5: return 'Set me on fire';
      default: return 'Gentle warmth';
    }
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.customHeader}>
        <Text style={styles.customHeaderTitle}>Let's learn your taste</Text>
        <Text style={styles.customHeaderSubtitle}>This helps us recommend dishes you'll love</Text>
      </View>
      <ScrollView style={[styles.scrollView, { paddingBottom: insets.bottom }]} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Cuisines</Text>
          <Text style={styles.sectionSubtitle}>Select all that you enjoy</Text>
          
          <SearchBar
            value={cuisineSearch}
            onChangeText={setCuisineSearch}
            placeholder="Search cuisines (e.g., Turkish, Georgian, Persian...)"
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
            
            {/* Simple slider with round stops */}
            <View style={styles.customSlider}>
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill, 
                    { width: `${((spiceTolerance - 1) / 4) * 100}%` }
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Home Base City</Text>
          <Text style={styles.sectionSubtitle}>Optional - helps with local restaurant recommendations</Text>
          
          <View style={styles.chipsContainer}>
            {HOME_BASE_CITIES.map(city => 
              renderChip(
                `${city.emoji} ${city.name}`, 
                selectedHomeBase === city.name,
                () => toggleHomeBase(city.name)
              )
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  customHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  customHeaderTitle: {
    fontSize: theme.typography.sizes.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    fontFamily: 'Artifact', // Using the fancy font for mid-aligned look
  },
  customHeaderSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
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
    backgroundColor: theme.colors.secondary,
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
    backgroundColor: theme.colors.secondary,
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
