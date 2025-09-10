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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { UserPreferences } from '../../types';
import { theme } from '../../theme';
import { UnifiedHeader } from '../../components/UnifiedHeader';

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
const POPULAR_CITIES = [
  // Major US cities
  { name: 'New York', coordinates: '40.7128,-74.0060', country: 'USA', isLocal: true },
  { name: 'San Francisco', coordinates: '37.7749,-122.4194', country: 'USA' },
  { name: 'Los Angeles', coordinates: '34.0522,-118.2437', country: 'USA' },
  { name: 'Chicago', coordinates: '41.8781,-87.6298', country: 'USA' },
  { name: 'Seattle', coordinates: '47.6062,-122.3321', country: 'USA' },
  { name: 'Boston', coordinates: '42.3601,-71.0589', country: 'USA' },
  { name: 'Austin', coordinates: '30.2672,-97.7431', country: 'USA' },
  { name: 'Miami', coordinates: '25.7617,-80.1918', country: 'USA' },
  { name: 'Denver', coordinates: '39.7392,-104.9903', country: 'USA' },
  { name: 'Portland', coordinates: '45.5152,-122.6784', country: 'USA' },
  { name: 'Nashville', coordinates: '36.1627,-86.7816', country: 'USA' },
  { name: 'Atlanta', coordinates: '33.7490,-84.3880', country: 'USA' },
  { name: 'Dallas', coordinates: '32.7767,-96.7970', country: 'USA' },
  { name: 'Houston', coordinates: '29.7604,-95.3698', country: 'USA' },
  { name: 'Phoenix', coordinates: '33.4484,-112.0740', country: 'USA' },
  { name: 'Las Vegas', coordinates: '36.1699,-115.1398', country: 'USA' },
  
  // International cities
  { name: 'London', coordinates: '51.5074,-0.1278', country: 'UK' },
  { name: 'Paris', coordinates: '48.8566,2.3522', country: 'France' },
  { name: 'Tokyo', coordinates: '35.6762,139.6503', country: 'Japan' },
  { name: 'Sydney', coordinates: '-33.8688,151.2093', country: 'Australia' },
  { name: 'Toronto', coordinates: '43.6532,-79.3832', country: 'Canada' },
  { name: 'Vancouver', coordinates: '49.2827,-123.1207', country: 'Canada' },
  { name: 'Berlin', coordinates: '52.5200,13.4050', country: 'Germany' },
  { name: 'Amsterdam', coordinates: '52.3676,4.9041', country: 'Netherlands' },
  { name: 'Barcelona', coordinates: '41.3851,2.1734', country: 'Spain' },
  { name: 'Rome', coordinates: '41.9028,12.4964', country: 'Italy' },
  { name: 'Madrid', coordinates: '40.4168,-3.7038', country: 'Spain' },
  { name: 'Milan', coordinates: '45.4642,9.1900', country: 'Italy' },
  { name: 'Zurich', coordinates: '47.3769,8.5417', country: 'Switzerland' },
  { name: 'Vienna', coordinates: '48.2082,16.3738', country: 'Austria' },
  { name: 'Prague', coordinates: '50.0755,14.4378', country: 'Czech Republic' },
  { name: 'Warsaw', coordinates: '52.2297,21.0122', country: 'Poland' },
  { name: 'Stockholm', coordinates: '59.3293,18.0686', country: 'Sweden' },
  { name: 'Copenhagen', coordinates: '55.6761,12.5683', country: 'Denmark' },
  { name: 'Oslo', coordinates: '59.9139,10.7522', country: 'Norway' },
  { name: 'Helsinki', coordinates: '60.1699,24.9384', country: 'Finland' },
];

interface Props {
  onComplete: () => void;
  onBack?: () => void;
}

export function TastePreferencesScreen({ onComplete, onBack }: Props) {
  const { user, setUser } = useStore();
  const userId = useStore((state) => state.userId);
  
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSearch, setCuisineSearch] = useState<string>('');
  const [showAllCuisines, setShowAllCuisines] = useState<boolean>(false);
  const [spiceTolerance, setSpiceTolerance] = useState<number>(3);
  const [pricePreferences, setPricePreferences] = useState<number[]>([2]); // Multiple selection
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  
  // Home base selection
  const [selectedHomeBase, setSelectedHomeBase] = useState<string>('');
  const [homeBaseSearch, setHomeBaseSearch] = useState<string>('');
  const [showHomeBasePicker, setShowHomeBasePicker] = useState<boolean>(false);

  // Pre-fill existing preferences if user has them
  useEffect(() => {
    if (user) {
      if (Array.isArray(user.preferred_cuisines)) {
        setSelectedCuisines(user.preferred_cuisines.map(c => c[0].toUpperCase() + c.slice(1)));
      }
      if (typeof user.spice_tolerance === 'number') setSpiceTolerance(user.spice_tolerance);
      if (typeof user.price_preference === 'number') setPricePreferences([user.price_preference]);
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

  const getFilteredCities = () => {
    if (!homeBaseSearch.trim()) {
      return POPULAR_CITIES;
    }
    
    return POPULAR_CITIES.filter(city =>
      city.name.toLowerCase().includes(homeBaseSearch.toLowerCase()) ||
      (city.country && city.country.toLowerCase().includes(homeBaseSearch.toLowerCase()))
    );
  };

  const selectHomeBase = (cityName: string) => {
    setSelectedHomeBase(cityName);
    setShowHomeBasePicker(false);
    setHomeBaseSearch('');
  };

  const clearHomeBase = () => {
    setSelectedHomeBase('');
  };

  const handleComplete = async () => {
    if (selectedCuisines.length === 0) {
      Alert.alert('Please select at least one cuisine preference');
      return;
    }

    const preferences: UserPreferences = {
      preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
      spice_tolerance: spiceTolerance,
      price_preference: Math.min(...pricePreferences), // Use minimum for backward compatibility
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
      <UnifiedHeader 
        title="Let's learn your taste" 
        subtitle="This helps us recommend dishes you'll love" 
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Home Base City</Text>
          <Text style={styles.sectionSubtitle}>Optional - helps with local restaurant recommendations</Text>
          
          <TouchableOpacity 
            style={styles.homeBaseSelector}
            onPress={() => setShowHomeBasePicker(!showHomeBasePicker)}
          >
            {selectedHomeBase ? (
              <View style={styles.selectedHomeBase}>
                <Text style={styles.selectedHomeBaseText}>🏠 {selectedHomeBase}</Text>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    clearHomeBase();
                  }}
                  style={styles.clearHomeBaseButton}
                >
                  <Text style={styles.clearHomeBaseText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.homeBasePlaceholder}>Tap to select your home city</Text>
            )}
          </TouchableOpacity>

          {showHomeBasePicker && (
            <View style={styles.homeBasePicker}>
              <TextInput
                style={styles.homeBaseSearchInput}
                value={homeBaseSearch}
                onChangeText={setHomeBaseSearch}
                placeholder="Search cities..."
                placeholderTextColor={theme.colors.text.secondary}
              />
              
              <ScrollView style={styles.homeBaseList} showsVerticalScrollIndicator={false}>
                {getFilteredCities().map((city) => (
                  <TouchableOpacity
                    key={`${city.name}-${city.coordinates}`}
                    style={[
                      styles.homeBaseItem,
                      city.isLocal && styles.localCityItem,
                      selectedHomeBase === city.name && styles.homeBaseItemSelected
                    ]}
                    onPress={() => selectHomeBase(city.name)}
                  >
                    <View style={styles.homeBaseInfo}>
                      <View style={styles.homeBaseNameRow}>
                        <Text style={styles.homeBaseName}>{city.name}</Text>
                        {city.isLocal && <Text style={styles.localBadge}>🏠</Text>}
                      </View>
                      {city.country && (
                        <Text style={styles.homeBaseCountry}>{city.country}</Text>
                      )}
                    </View>
                    {selectedHomeBase === city.name && (
                      <Text style={styles.selectedIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
  
  // Home base picker styles
  homeBaseSelector: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  selectedHomeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedHomeBaseText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.weights.medium,
  },
  clearHomeBaseButton: {
    padding: theme.spacing.xs,
  },
  clearHomeBaseText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  homeBasePlaceholder: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
  },
  homeBasePicker: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 300,
  },
  homeBaseSearchInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    margin: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
  },
  homeBaseList: {
    maxHeight: 200,
    paddingHorizontal: theme.spacing.md,
  },
  homeBaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  homeBaseItemSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  localCityItem: {
    backgroundColor: theme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  homeBaseInfo: {
    flex: 1,
  },
  homeBaseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeBaseName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    flex: 1,
  },
  localBadge: {
    fontSize: 12,
    marginLeft: theme.spacing.xs,
  },
  homeBaseCountry: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  selectedIcon: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
