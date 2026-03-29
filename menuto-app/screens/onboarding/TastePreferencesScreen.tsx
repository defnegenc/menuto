import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { UserPreferences } from '../../types';
import {
  DIETARY_RESTRICTIONS,
  SPICE_LABELS,
} from '../../constants';

const RED = '#E9323D';
const RED_LIGHT = '#FFF5F5';
const DARK = '#111111';
const MEDIUM = '#6B7280';
const LIGHT_TEXT = '#9CA3AF';

const NEIGHBORHOODS: Record<string, string[]> = {
  'New York': [
    'West Village', 'SoHo', 'Lower East Side', 'Tribeca',
    'Williamsburg', 'Chelsea', 'Upper West Side', 'East Village',
    'Bushwick', 'Park Slope', 'Greenpoint', 'Nolita',
  ],
  'San Francisco': [
    'Mission', 'Hayes Valley', 'North Beach', 'Marina',
    'Castro', 'SoMa', 'Nob Hill', 'Chinatown',
  ],
  'Los Angeles': [
    'Silver Lake', 'Los Feliz', 'West Hollywood', 'Venice',
    'Santa Monica', 'Highland Park', 'Echo Park', 'DTLA',
  ],
  'London': [
    'Soho', 'Shoreditch', 'Covent Garden', 'Brixton',
    'Camden', 'Notting Hill', 'Hackney', 'Peckham',
  ],
  'Istanbul': [
    'Beyoğlu', 'Kadıköy', 'Beşiktaş', 'Balat',
    'Cihangir', 'Moda', 'Nişantaşı', 'Karaköy',
  ],
};

const CITIES = Object.keys(NEIGHBORHOODS);

const CUISINE_REGIONS: Record<string, string[]> = {
  Popular: [
    'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian',
    'Thai', 'French', 'American', 'Korean', 'Vietnamese',
    'Turkish', 'Greek', 'Lebanese', 'Spanish',
  ],
  Asian: [
    'Japanese', 'Chinese', 'Thai', 'Korean', 'Vietnamese', 'Indian',
    'Persian', 'Georgian', 'Nepalese', 'Pakistani', 'Sri Lankan',
    'Afghan', 'Indonesian', 'Malaysian', 'Filipino', 'Burmese',
    'Tibetan', 'Mongolian', 'Uzbek', 'Sichuan', 'Cantonese',
  ],
  'Middle East': [
    'Turkish', 'Lebanese', 'Moroccan', 'Palestinian', 'Egyptian',
    'Syrian', 'Jordanian', 'Iraqi', 'Yemeni', 'Kurdish', 'Cypriot',
    'Tunisian', 'Algerian', 'Israeli', 'Libyan',
  ],
  European: [
    'Italian', 'French', 'Spanish', 'Greek', 'Portuguese',
    'Basque', 'Catalan', 'Galician', 'Sicilian', 'German',
    'Polish', 'Hungarian', 'Croatian', 'Serbian', 'Russian',
    'Ukrainian', 'Swedish', 'Irish', 'Dutch', 'Belgian',
  ],
  Americas: [
    'Mexican', 'American', 'Peruvian', 'Colombian', 'Brazilian',
    'Argentinian', 'Cuban', 'Puerto Rican', 'Jamaican',
    'Cajun', 'Creole', 'Soul Food',
  ],
  African: [
    'Ethiopian', 'Eritrean', 'Nigerian', 'Ghanaian', 'Senegalese',
    'South African', 'Kenyan', 'Somali', 'Congolese', 'Cameroonian',
  ],
};

const REGION_TABS = Object.keys(CUISINE_REGIONS);

interface Props {
  onComplete: () => void;
  onBack?: () => void;
}

type Step = 'dietary' | 'cuisines' | 'neighborhood';

export function TastePreferencesScreen({ onComplete, onBack }: Props) {
  const { user, setUser } = useStore();
  const userId = useStore((state) => state.userId);
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<Step>('dietary');
  const [fadeAnim] = useState(new Animated.Value(1));

  // Step 1: Dietary + spice
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [spiceTolerance, setSpiceTolerance] = useState(3);

  // Step 2: Cuisines
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineRegion, setCuisineRegion] = useState('Popular');

  // Step 3: Neighborhood
  const [selectedCity, setSelectedCity] = useState('New York');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);

  // Pre-fill from existing user
  useEffect(() => {
    if (user) {
      if (Array.isArray(user.preferred_cuisines) && user.preferred_cuisines.length > 0) {
        setSelectedCuisines(user.preferred_cuisines.map((c: string) => c[0].toUpperCase() + c.slice(1)));
      }
      if (typeof user.spice_tolerance === 'number') setSpiceTolerance(user.spice_tolerance);
      if (Array.isArray(user.dietary_restrictions)) {
        setDietaryRestrictions(user.dietary_restrictions.map((r: string) => r[0].toUpperCase() + r.slice(1)));
      }
      if (user.home_base) setSelectedCity(user.home_base);
    }
  }, [user]);

  const animateTransition = (next: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const stepIndex = currentStep === 'dietary' ? 0 : currentStep === 'cuisines' ? 1 : 2;

  const handleNext = () => {
    if (currentStep === 'dietary') {
      animateTransition('cuisines');
    } else if (currentStep === 'cuisines') {
      if (selectedCuisines.length === 0) {
        Alert.alert('Pick at least one', 'Select at least one cuisine you enjoy.');
        return;
      }
      animateTransition('neighborhood');
    }
  };

  const handleStepBack = () => {
    if (currentStep === 'cuisines') {
      animateTransition('dietary');
    } else if (currentStep === 'neighborhood') {
      animateTransition('cuisines');
    } else if (onBack) {
      onBack();
    }
  };

  const handleFinish = async () => {
    if (selectedCuisines.length === 0) {
      Alert.alert('Pick at least one cuisine');
      return;
    }

    const preferences: UserPreferences = {
      preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
      spice_tolerance: spiceTolerance,
      price_preference: 2,
      dietary_restrictions: dietaryRestrictions.map(r => r.toLowerCase()),
      home_base: selectedCity || undefined,
    };

    if (userId) {
      setUser(preferences, userId);
    }
    onComplete();
  };

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const renderPill = (
    text: string,
    isSelected: boolean,
    onPress: () => void,
    size: 'normal' | 'large' = 'normal',
  ) => (
    <TouchableOpacity
      key={text}
      style={[
        styles.pill,
        size === 'large' && styles.pillLarge,
        isSelected ? styles.pillSelected : styles.pillUnselected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.pillText,
          size === 'large' && styles.pillTextLarge,
          isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );

  // ─── Step 1: Dietary + Spice ──────────────────────────────────────────────
  const renderDietary = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepLabel}>
        <View style={styles.stepLabelLine} />
        <Text style={styles.stepLabelText}>Your Palate Profile</Text>
      </View>
      <Text style={styles.headline}>
        Any dietary{'\n'}<Text style={styles.headlineAccent}>needs?</Text>
      </Text>
      <Text style={styles.subline}>
        We'll filter recommendations to match what you can eat. Skip if no restrictions.
      </Text>

      <View style={styles.pillGrid}>
        {DIETARY_RESTRICTIONS.map(restriction =>
          renderPill(
            restriction,
            dietaryRestrictions.includes(restriction),
            () => toggleItem(restriction, dietaryRestrictions, setDietaryRestrictions),
            'large',
          )
        )}
      </View>

      {/* Spice tolerance */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Spice tolerance</Text>
        <View style={styles.spiceContainer}>
          {/* Track with dots overlaid — dots centered on the line */}
          <View style={styles.spiceTrackWrapper}>
            <View style={styles.spiceTrack}>
              <View style={[styles.spiceFill, { width: `${((spiceTolerance - 1) / 4) * 100}%` }]} />
            </View>
            <View style={styles.spiceDotsRow}>
              {[1, 2, 3, 4, 5].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.spiceDot, spiceTolerance >= level && styles.spiceDotActive]}
                  onPress={() => setSpiceTolerance(level)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                />
              ))}
            </View>
          </View>
          <View style={styles.spiceLabelRow}>
            <Text style={styles.spiceLabelEnd}>Mild</Text>
            <View style={styles.spiceCenter}>
              <Text style={styles.spiceEmoji}>{'🌶️'.repeat(spiceTolerance)}</Text>
              <Text style={styles.spiceLabel}>{SPICE_LABELS[spiceTolerance]}</Text>
            </View>
            <Text style={styles.spiceLabelEnd}>Fire</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ─── Step 2: Cuisines ─────────────────────────────────────────────────────
  const currentRegionCuisines = CUISINE_REGIONS[cuisineRegion] || [];

  const renderCuisines = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepLabel}>
        <View style={styles.stepLabelLine} />
        <Text style={styles.stepLabelText}>Cuisine Preferences</Text>
      </View>
      <Text style={styles.headline}>
        What cuisines{'\n'}do you <Text style={styles.headlineAccent}>love?</Text>
      </Text>
      <Text style={styles.subline}>Select all that make you happy.</Text>

      {/* Selected count */}
      {selectedCuisines.length > 0 && (
        <Text style={styles.selectedCount}>
          {selectedCuisines.length} selected
        </Text>
      )}

      {/* Region tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
        <View style={styles.regionRow}>
          {REGION_TABS.map(region => (
            <TouchableOpacity
              key={region}
              style={[styles.regionTab, cuisineRegion === region && styles.regionTabActive]}
              onPress={() => setCuisineRegion(region)}
            >
              <Text style={[styles.regionTabText, cuisineRegion === region && styles.regionTabTextActive]}>
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Cuisine pills for current region */}
      <View style={styles.pillGrid}>
        {currentRegionCuisines.map(cuisine =>
          renderPill(
            cuisine,
            selectedCuisines.includes(cuisine),
            () => toggleItem(cuisine, selectedCuisines, setSelectedCuisines),
            'large',
          )
        )}
      </View>
    </View>
  );

  // ─── Step 3: Neighborhood ─────────────────────────────────────────────────
  const renderNeighborhood = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepLabel}>
        <View style={styles.stepLabelLine} />
        <Text style={styles.stepLabelText}>Location Access</Text>
      </View>
      <Text style={styles.headline}>
        Pick your{'\n'}<Text style={styles.headlineAccent}>neighborhood.</Text>
      </Text>
      <Text style={styles.subline}>
        We'll start by showing you the best spots within walking distance.
      </Text>

      {/* Mini map placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapPingOuter} />
        <View style={styles.mapPing} />
        <View style={styles.mapBadge}>
          <Text style={styles.mapBadgeText}>
            {selectedCity === 'New York' ? 'NYC · Manhattan' : selectedCity}
          </Text>
        </View>
      </View>

      {/* City selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
        <View style={styles.cityRow}>
          {CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
              onPress={() => {
                setSelectedCity(city);
                setSelectedNeighborhoods([]);
              }}
            >
              <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Neighborhood pills */}
      <View style={styles.pillGrid}>
        {(NEIGHBORHOODS[selectedCity] || []).map(hood =>
          renderPill(
            hood,
            selectedNeighborhoods.includes(hood),
            () => toggleItem(hood, selectedNeighborhoods, setSelectedNeighborhoods),
          )
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.progressDot, i <= stepIndex ? styles.progressDotActive : styles.progressDotInactive]}
            />
          ))}
        </View>

        {/* Step content */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {currentStep === 'dietary' && renderDietary()}
          {currentStep === 'cuisines' && renderCuisines()}
          {currentStep === 'neighborhood' && renderNeighborhood()}
        </Animated.View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {currentStep === 'neighborhood' ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Finish Setup</Text>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        )}

        {currentStep === 'dietary' ? (
          onBack ? (
            <TouchableOpacity style={styles.skipButton} onPress={onBack}>
              <Text style={styles.skipText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipButton} onPress={handleNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={styles.skipButton} onPress={handleStepBack}>
            <Text style={styles.skipText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 200,
  },
  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: RED,
  },
  progressDotInactive: {
    backgroundColor: '#E5E7EB',
  },
  // Step content
  stepContent: {
    gap: 0,
  },
  stepLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepLabelLine: {
    width: 32,
    height: 2,
    backgroundColor: RED,
  },
  stepLabelText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: RED,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: '#111827',
    marginBottom: 16,
  },
  headlineAccent: {
    color: RED,
    fontStyle: 'italic',
  },
  subline: {
    fontFamily: 'DMSans-Regular',
    fontSize: 17,
    lineHeight: 26,
    color: '#6B7280',
    maxWidth: '90%',
    marginBottom: 32,
  },
  // Selected count
  selectedCount: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
    color: RED,
    marginBottom: 16,
  },
  // Region tabs
  regionScroll: {
    marginBottom: 20,
    marginHorizontal: -32,
    paddingHorizontal: 32,
  },
  regionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  regionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  regionTabActive: {
    backgroundColor: RED,
    borderColor: RED,
  },
  regionTabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  regionTabTextActive: {
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  // Pills
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pillLarge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pillSelected: {
    backgroundColor: RED_LIGHT,
    borderWidth: 2,
    borderColor: RED,
  },
  pillUnselected: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
  },
  pillTextLarge: {
    fontSize: 16,
  },
  pillTextSelected: {
    fontFamily: 'DMSans-Bold',
    color: RED,
  },
  pillTextUnselected: {
    color: '#374151',
  },
  // Section blocks
  sectionBlock: {
    marginTop: 36,
  },
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    color: DARK,
    marginBottom: 8,
  },
  // Spice
  spiceContainer: {
    marginTop: 12,
    gap: 12,
  },
  spiceTrackWrapper: {
    position: 'relative',
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 11,  // half of dot width — so dots at edges sit centered on track ends
  },
  spiceTrack: {
    position: 'absolute',
    left: 11,
    right: 11,
    height: 3,
    backgroundColor: '#F0EEEC',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  spiceFill: {
    height: 3,
    backgroundColor: RED,
    borderRadius: 1.5,
  },
  spiceDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  spiceDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0DEDA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  spiceDotActive: {
    backgroundColor: RED,
    borderColor: RED,
  },
  spiceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spiceLabelEnd: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: LIGHT_TEXT,
  },
  spiceCenter: {
    alignItems: 'center',
  },
  spiceEmoji: {
    fontSize: 22,
  },
  spiceLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: RED,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Cuisine search
  cuisineSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    paddingHorizontal: 14,
  },
  cuisineSearchInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#1C1917',
    paddingVertical: 12,
  },
  cuisineSearchClear: {
    padding: 4,
  },
  cuisineSearchClearText: {
    fontSize: 16,
    color: '#A8A29E',
  },
  showAllButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RED,
  },
  showAllButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: RED,
  },
  // Map placeholder
  mapPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: `${RED}08`,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${RED}15`,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapPingOuter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${RED}15`,
  },
  mapPing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: RED,
  },
  mapBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${RED}20`,
  },
  mapBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: RED,
  },
  // City selector
  cityScroll: {
    marginBottom: 16,
    marginHorizontal: -32,
    paddingHorizontal: 32,
  },
  cityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  cityChipActive: {
    backgroundColor: RED,
    borderColor: RED,
  },
  cityChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: MEDIUM,
  },
  cityChipTextActive: {
    fontFamily: 'DMSans-Bold',
    color: '#FFF',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: DARK,
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#FFF',
  },
  arrowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#FFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: LIGHT_TEXT,
  },
});
