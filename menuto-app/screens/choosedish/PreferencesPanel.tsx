import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const TERRA = '#CE3E25';

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

function SliderControl({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <View>
      <View style={styles.sliderContainer}>
        {/* Track */}
        <View style={styles.sliderTrack} />
        {/* Dots on track */}
        <View style={styles.sliderDotsRow}>
          {[1, 2, 3, 4, 5].map((level) => (
            <TouchableOpacity
              key={level}
              style={styles.sliderDotTouchable}
              onPress={() => onChange(level)}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <View
                style={[
                  styles.sliderDot,
                  level <= value && styles.sliderDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        {/* Active thumb */}
        <View
          style={[
            styles.sliderThumb,
            { left: `${((value - 1) / 4) * 100}%` },
          ]}
        />
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{leftLabel}</Text>
        <Text style={styles.sliderLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

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
    <View style={styles.wrapper}>
      {/* Hunger Level */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>How hungry are you?</Text>
        <SliderControl
          value={hungerLevel}
          onChange={onSetHungerLevel}
          leftLabel="Barely hungry"
          rightLabel="Ravenous"
        />
      </View>

      {/* Preference Level */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Go for what's popular, or match your taste?
        </Text>
        <SliderControl
          value={preferenceLevel}
          onChange={onSetPreferenceLevel}
          leftLabel="All me"
          rightLabel="Fan favorites"
        />
      </View>

      {/* Craving Selection */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What are you craving?</Text>
        <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        <View style={styles.chipsContainer}>
          {cravingOptions.map((craving) => {
            const isSelected = selectedCravings.includes(craving);
            return (
              <TouchableOpacity
                key={craving}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => onToggleCraving(craving)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
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
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What do you want to order?</Text>
        <View style={styles.chipsContainer}>
          {[
            { key: 'main', label: 'Just a main' },
            { key: 'main+starter', label: 'Main + starter' },
            { key: 'share', label: 'Something to share' },
          ].map(({ key, label }) => {
            const isSelected = mealStructure === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => onSetMealStructure(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={onContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 24,
  },

  // Section cards
  sectionCard: {
    backgroundColor: '#FAFAF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#78716C',
    marginBottom: 12,
    fontFamily: 'DMSans-Regular',
  },

  // Slider
  sliderContainer: {
    width: '100%',
    height: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#F5F5F4',
    borderRadius: 999,
  },
  sliderDotsRow: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderDotTouchable: {
    width: 24,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E7E5E4',
  },
  sliderDotActive: {
    backgroundColor: TERRA,
    opacity: 0.4,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    marginLeft: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TERRA,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#A8A29E',
    fontFamily: 'DMSans-Regular',
  },

  // Chips (shared for cravings + meal structure)
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FAFAF9',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  chipSelected: {
    backgroundColor: TERRA,
    borderColor: TERRA,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  chipText: {
    fontSize: 14,
    color: '#78716C',
    fontFamily: 'DMSans-Regular',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },

  // Continue button
  continueButton: {
    backgroundColor: '#1C1917',
    borderRadius: 999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
});
