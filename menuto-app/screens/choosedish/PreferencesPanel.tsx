import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';

const RED = '#E9323D';

interface PreferencesPanelProps {
  hungerLevel: number;
  preferenceLevel: number;
  selectedCravings: string[];
  diningOccasion: string;
  freeTextMood: string;
  onSetHungerLevel: (level: number) => void;
  onSetPreferenceLevel: (level: number) => void;
  onToggleCraving: (craving: string) => void;
  onSetDiningOccasion: (occasion: string) => void;
  onSetFreeTextMood: (text: string) => void;
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
  diningOccasion,
  freeTextMood,
  onSetHungerLevel,
  onSetPreferenceLevel,
  onToggleCraving,
  onSetDiningOccasion,
  onSetFreeTextMood,
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

      {/* Dining Context */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What's the vibe?</Text>
        <View style={styles.chipsContainer}>
          {[
            { key: 'solo', label: '🙋 Just me' },
            { key: 'date', label: '❤️ Date night' },
            { key: 'friends', label: '👯 With friends' },
            { key: 'family', label: '👨‍👩‍👧 Family' },
            { key: 'business', label: '💼 Business' },
          ].map(({ key, label }) => {
            const isSelected = diningOccasion === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => onSetDiningOccasion(key)}
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

      {/* Free-text mood — goes straight to the agent */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Anything else?</Text>
        <TextInput
          style={styles.moodInput}
          value={freeTextMood}
          onChangeText={onSetFreeTextMood}
          placeholder="I'm feeling adventurous... celebrating tonight... want something cozy..."
          placeholderTextColor="#A8A29E"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={onContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>Find my dishes</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-SemiBold',
    color: '#1C1917',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8C7E77',
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E7E5E4',
  },
  sliderDotActive: {
    backgroundColor: RED,
    opacity: 1,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    marginLeft: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: RED,
    shadowColor: RED,
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
    color: '#8C7E77',
    fontFamily: 'DMSans-Medium',
  },

  // Chips (shared for cravings + meal structure)
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  chipSelected: {
    backgroundColor: '#FFF5F5',
    borderColor: RED,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'DMSans-Medium',
  },
  chipTextSelected: {
    color: RED,
    fontFamily: 'DMSans-SemiBold',
  },

  // Free-text mood
  moodInput: {
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 16,
    fontSize: 14,
    color: '#1C1917',
    fontFamily: 'DMSans-Regular',
    minHeight: 56,
    lineHeight: 22,
  },

  // Continue button
  continueButton: {
    backgroundColor: '#1C1917',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans-SemiBold',
  },
});
