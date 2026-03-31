import React, { useState } from 'react';
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

const foodCravings = [
  'light',
  'fresh',
  'carb-heavy',
  'protein-heavy',
  'spicy',
  'creamy',
  'crispy',
  'comforting',
];

const drinkCravings = [
  'light',
  'fresh',
  'fruity',
  'dry',
  'sweet',
  'sparkling',
  'savory',
  'boozy',
  'refreshing',
  'bitter',
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
  const fillPercent = ((value - 1) / 4) * 100;
  return (
    <View>
      <View style={styles.sliderContainer}>
        {/* Track with red fill */}
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${fillPercent}%` }]} />
        </View>
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
                  level === value && styles.sliderDotCurrent,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderLabel, value <= 2 && styles.sliderLabelActive]}>{leftLabel}</Text>
        <Text style={[styles.sliderLabel, value >= 4 && styles.sliderLabelActive]}>{rightLabel}</Text>
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
  const [menuType, setMenuType] = useState('food');

  const handleContinue = () => {
    // Prepend menu type preference to freeTextMood so the algorithm knows
    const prefix = menuType === 'food' ? 'Food only, no drinks.'
      : menuType === 'drinks' ? 'Drinks only, no food.'
      : 'Both food and drinks.';
    if (!freeTextMood.includes(prefix)) {
      onSetFreeTextMood(prefix + (freeTextMood ? ' ' + freeTextMood : ''));
    }
    onContinue();
  };

  return (
    <View style={styles.wrapper}>
      {/* What are you looking for? */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What are you looking for?</Text>
        <View style={styles.chipsContainer}>
          {[
            { key: 'food', label: 'Food' },
            { key: 'drinks', label: 'Drinks' },
            { key: 'both', label: 'Both' },
          ].map(({ key, label }) => {
            const isSelected = menuType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setMenuType(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Hunger Level — only for food */}
      {menuType !== 'drinks' && (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>How hungry are you?</Text>
        <SliderControl
          value={hungerLevel}
          onChange={onSetHungerLevel}
          leftLabel="Barely hungry"
          rightLabel="Ravenous"
        />
      </View>

      )}

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
        <Text style={styles.sectionTitle}>
          {menuType === 'drinks' ? 'What kind of drink?' : 'What are you craving?'}
        </Text>
        <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        <View style={styles.chipsContainer}>
          {(menuType === 'drinks' ? drinkCravings : menuType === 'both' ? [...foodCravings, ...drinkCravings.filter(d => !foodCravings.includes(d))] : foodCravings).map((craving) => {
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

      {/* How are you dining? */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>How are you dining?</Text>
        <View style={styles.chipsContainer}>
          {[
            { key: 'solo', label: 'Just me, own dish' },
            { key: 'duo', label: 'Two of us, splitting' },
            { key: 'group-own', label: 'Group, own dishes' },
            { key: 'group-share', label: 'Group, sharing family style' },
            { key: 'tasting', label: 'Tasting — many small plates' },
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

      {/* Anything else — rectangle input */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Anything else?</Text>
        <TextInput
          style={styles.moodInput}
          value={freeTextMood}
          onChangeText={onSetFreeTextMood}
          placeholder="Celebrating, want comfort food, feeling adventurous..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
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
    paddingTop: 4,
    gap: 16,
  },

  // Sections — tight, no dividers
  sectionCard: {
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Italic',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
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
    height: 3,
    backgroundColor: '#E5E5E5',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 3,
    backgroundColor: RED,
    borderRadius: 1.5,
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
    backgroundColor: '#E5E5E5',
  },
  sliderDotActive: {
    backgroundColor: RED,
  },
  sliderDotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RED,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderThumb: {
    display: 'none', // replaced by sliderDotCurrent
    width: 0,
    height: 0,
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
    color: '#9CA3AF',
    fontFamily: 'DMSans-Medium',
  },
  sliderLabelActive: {
    color: RED,
    fontFamily: 'DMSans-SemiBold',
  },

  // Chips (shared for cravings + meal structure)
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'transparent',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipSelected: {
    backgroundColor: RED,
    borderColor: RED,
  },
  chipText: {
    fontSize: 14,
    color: '#444444',
    fontFamily: 'DMSans-Medium',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-SemiBold',
  },

  // Free-text mood
  moodInput: {
    backgroundColor: 'transparent',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'DMSans-Regular',
    minHeight: 56,
    lineHeight: 20,
  },

  // Continue button
  continueButton: {
    backgroundColor: '#1C1917',
    borderRadius: 0,
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
