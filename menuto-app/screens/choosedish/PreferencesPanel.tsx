import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';

interface PreferencesPanelProps {
  hungerLevel: number;
  preferenceLevel: number;
  selectedCravings: string[];
  mealStructure: string;
  onSetHungerLevel: (level: number) => void;
  onSetPreferenceLevel: (level: number) => void;
  onToggleCraving: (craving: string) => void;
  onSetMealStructure: (structure: string) => void;
  onContinue: () => void;
}

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

export function PreferencesPanel({
  hungerLevel,
  preferenceLevel,
  selectedCravings,
  mealStructure,
  onSetHungerLevel,
  onSetPreferenceLevel,
  onToggleCraving,
  onSetMealStructure,
  onContinue,
}: PreferencesPanelProps) {
  return (
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
                  onPress={() => onSetHungerLevel(level)}
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
                  onPress={() => onSetPreferenceLevel(level)}
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
                  key={craving}
                  style={[
                    styles.cravingChip,
                    isSelected && styles.cravingChipSelected,
                  ]}
                  onPress={() => onToggleCraving(craving)}
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
              onPress={() => onSetMealStructure('main')}
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
              onPress={() => onSetMealStructure('main+starter')}
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
              onPress={() => onSetMealStructure('share')}
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
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const TERRA = '#E9323D';
const MEDIUM_COLOR = '#5A4D48';
const LIGHT_TEXT = '#8C7E77';

const styles = StyleSheet.create({
  stepSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  stepText: {
    fontSize: 13,
    color: MEDIUM_COLOR,
    marginBottom: theme.spacing.sm,
    fontFamily: 'DMSans-Regular',
  },
  stepUnderline: {
    height: 1,
    backgroundColor: '#E7E5E4',
    alignSelf: 'stretch',
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
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -1.5,
    marginBottom: theme.spacing.sm,
  },
  questionSubtitle: {
    fontSize: 14,
    color: MEDIUM_COLOR,
    marginBottom: theme.spacing.md,
    fontFamily: 'DMSans-Regular',
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
    backgroundColor: '#F5F5F4',
    borderRadius: 999,
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
    backgroundColor: TERRA,
    ...theme.shadows.md,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: LIGHT_TEXT,
    fontFamily: 'DMSans-Regular',
  },
  cravingChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cravingChip: {
    backgroundColor: '#FAFAF9',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  cravingChipSelected: {
    backgroundColor: TERRA,
    borderColor: TERRA,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cravingChipText: {
    fontSize: 13,
    color: '#78716C',
    fontFamily: 'DMSans-Regular',
  },
  cravingChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  mealStructureContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  mealStructureOption: {
    backgroundColor: '#FAFAF9',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  mealStructureOptionSelected: {
    backgroundColor: TERRA,
    borderColor: TERRA,
  },
  mealStructureText: {
    fontSize: 14,
    color: '#78716C',
    fontFamily: 'DMSans-Regular',
  },
  mealStructureTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  continueButton: {
    backgroundColor: '#1C1917',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
});
