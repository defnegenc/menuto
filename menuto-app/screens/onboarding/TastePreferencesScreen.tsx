import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { UserPreferences } from '../../types';
import {
  POPULAR_CUISINES,
  DIETARY_RESTRICTIONS,
  SPICE_LABELS,
} from '../../constants';

const TERRA = '#E9323D';
const TERRA_LIGHT = '#FDECED';
const CREAM = '#FFFFFF';
const DARK = '#2C2421';
const MEDIUM = '#5A4D48';
const LIGHT_TEXT = '#8C7E77';

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
  const renderCuisines = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepLabel}>
        <Text style={styles.stepLabelText}>Cuisine Preferences</Text>
      </View>
      <Text style={styles.headline}>
        What cuisines{'\n'}do you <Text style={styles.headlineAccent}>love?</Text>
      </Text>
      <Text style={styles.subline}>Select all that make you happy.</Text>

      <View style={styles.pillGrid}>
        {POPULAR_CUISINES.map(cuisine =>
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
    backgroundColor: CREAM,
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
    gap: 8,
    width: 120,
    marginBottom: 40,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  progressDotActive: {
    backgroundColor: TERRA,
  },
  progressDotInactive: {
    backgroundColor: `${TERRA}30`,
  },
  // Step content
  stepContent: {
    gap: 0,
  },
  stepLabel: {
    marginBottom: 20,
  },
  stepLabelText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: TERRA,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.5,
    color: DARK,
    marginBottom: 16,
  },
  headlineAccent: {
    color: TERRA,
  },
  subline: {
    fontFamily: 'DMSans-Regular',
    fontSize: 18,
    lineHeight: 26,
    color: MEDIUM,
    maxWidth: 310,
    marginBottom: 32,
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
    backgroundColor: TERRA_LIGHT,
    borderWidth: 2,
    borderColor: TERRA,
  },
  pillUnselected: {
    borderWidth: 1,
    borderColor: `${TERRA}40`,
    backgroundColor: 'transparent',
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
    color: TERRA,
  },
  pillTextUnselected: {
    color: DARK,
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
    backgroundColor: TERRA,
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
    backgroundColor: TERRA,
    borderColor: TERRA,
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
    color: TERRA,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Map placeholder
  mapPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: `${TERRA}08`,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${TERRA}15`,
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
    backgroundColor: `${TERRA}15`,
  },
  mapPing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TERRA,
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
    borderColor: `${TERRA}20`,
  },
  mapBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: TERRA,
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
    backgroundColor: TERRA,
    borderColor: TERRA,
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
    backgroundColor: CREAM,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: TERRA,
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
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
