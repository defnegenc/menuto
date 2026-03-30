import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import {
  POPULAR_CUISINES,
  ALL_CUISINES,
  DIETARY_RESTRICTIONS,
  HOME_BASE_CITIES,
} from '../../constants';

interface TastePreferencesCardProps {
  user: any;
  // Preferences editing master state
  isEditingPreferences: boolean;
  editedPreferencesSpiceTolerance: number;
  onSetEditedPreferencesSpiceTolerance: (level: number) => void;
  onStartEditingPreferences: () => void;
  onCancelEditingPreferences: () => void;
  onSavePreferences: () => void;
  // Cuisine state
  isEditingCuisines: boolean;
  selectedCuisines: string[];
  cuisineSearch: string;
  showAllCuisines: boolean;
  onSetCuisineSearch: (text: string) => void;
  onSetShowAllCuisines: (show: boolean) => void;
  onToggleCuisine: (cuisine: string) => void;
  onCancelEditingCuisines: () => void;
  onSaveCuisines: () => void;
  getFilteredCuisines: () => string[];
  // Dietary state
  isEditingDietary: boolean;
  selectedDietary: string[];
  onToggleDietary: (restriction: string) => void;
  onCancelEditingDietary: () => void;
  onSaveDietary: () => void;
  // Home base state
  isEditingHomeBase: boolean;
  selectedHomeBase: string | null;
  homeBaseSearch: string;
  showHomeBasePicker: boolean;
  onSetShowHomeBasePicker: (show: boolean) => void;
  onSetHomeBaseSearch: (text: string) => void;
  onSelectHomeBaseCity: (cityName: string) => void;
  onCancelEditingHomeBase: () => void;
  onSaveHomeBase: () => void;
  getFilteredHomeBaseCities: () => typeof HOME_BASE_CITIES;
  // Helpers
  getSpiceEmoji: (level: number) => string;
  getSpiceLabel: (level: number) => string;
}

export function TastePreferencesCard({
  user,
  isEditingPreferences,
  editedPreferencesSpiceTolerance,
  onSetEditedPreferencesSpiceTolerance,
  onStartEditingPreferences,
  onCancelEditingPreferences,
  onSavePreferences,
  isEditingCuisines,
  selectedCuisines,
  cuisineSearch,
  showAllCuisines,
  onSetCuisineSearch,
  onSetShowAllCuisines,
  onToggleCuisine,
  onCancelEditingCuisines,
  onSaveCuisines,
  getFilteredCuisines,
  isEditingDietary,
  selectedDietary,
  onToggleDietary,
  onCancelEditingDietary,
  onSaveDietary,
  isEditingHomeBase,
  selectedHomeBase,
  homeBaseSearch,
  showHomeBasePicker,
  onSetShowHomeBasePicker,
  onSetHomeBaseSearch,
  onSelectHomeBaseCity,
  onCancelEditingHomeBase,
  onSaveHomeBase,
  getFilteredHomeBaseCities,
  getSpiceEmoji,
  getSpiceLabel,
}: TastePreferencesCardProps) {
  return (
    <View style={styles.section}>
      <View style={styles.preferenceHeader}>
        <Text style={styles.sectionTitle}>Your Preferences</Text>
        {!isEditingPreferences && (
          <TouchableOpacity onPress={onStartEditingPreferences}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {isEditingPreferences ? (
        <>
          {/* Spice Tolerance in Preferences Edit */}
          <View style={styles.preferenceGroup}>
            <Text style={styles.preferenceLabel}>Spice Tolerance</Text>
            <View style={styles.spiceSliderContainer}>
              <View style={styles.currentSelectionDisplay}>
                <Text style={styles.currentPeppers}>
                  {getSpiceEmoji(editedPreferencesSpiceTolerance)}
                </Text>
              </View>
              <View style={styles.customSlider}>
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${((editedPreferencesSpiceTolerance - 1) / 4) * 100}%` }
                    ]}
                  />
                  <View style={styles.sliderStops}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.sliderStop,
                          editedPreferencesSpiceTolerance >= level && styles.sliderStopActive,
                        ]}
                        onPress={() => onSetEditedPreferencesSpiceTolerance(level)}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.spiceDescription}>
                {getSpiceLabel(editedPreferencesSpiceTolerance)}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {/* Favorite Cuisines */}
      <View style={styles.preferenceGroup}>
        <View style={styles.preferenceHeader}>
          <Text style={styles.preferenceLabel}>Favorite Cuisines</Text>
        </View>

        {(isEditingCuisines || isEditingPreferences) ? (
          <View>
            <SearchBar
              value={cuisineSearch}
              onChangeText={onSetCuisineSearch}
              placeholder="Search cuisines..."
            />

            {showAllCuisines && !cuisineSearch.trim() && (
              <TouchableOpacity
                style={styles.collapseButton}
                onPress={() => onSetShowAllCuisines(false)}
              >
                <Text style={styles.collapseButtonText}>- Collapse Cuisines</Text>
              </TouchableOpacity>
            )}

            <View style={styles.chipsContainer}>
              {getFilteredCuisines()
                .filter(cuisine => !selectedCuisines.includes(cuisine))
                .map(cuisine => (
                  <TouchableOpacity
                    key={cuisine}
                    onPress={() => onToggleCuisine(cuisine)}
                  >
                    <View style={styles.cuisineChip}>
                      <Text style={styles.cuisineChipText}>{cuisine}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              }
            </View>

            {selectedCuisines.length > 0 && (
              <View style={styles.selectedCuisinesContainer}>
                <Text style={styles.selectedLabel}>Selected:</Text>
                <View style={styles.chipsContainer}>
                  {selectedCuisines.map(cuisine => (
                    <TouchableOpacity
                      key={cuisine}
                      onPress={() => onToggleCuisine(cuisine)}
                    >
                      <View style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                        <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>{cuisine}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {!cuisineSearch.trim() && !showAllCuisines && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => onSetShowAllCuisines(true)}
              >
                <Text style={styles.expandButtonText}>
                  + Show More Cuisines ({ALL_CUISINES.length - POPULAR_CUISINES.length} more)
                </Text>
              </TouchableOpacity>
            )}

            {isEditingCuisines && !isEditingPreferences && (
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancelEditingCuisines}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={onSaveCuisines}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          user?.preferred_cuisines && user.preferred_cuisines.length > 0 ? (
            <View style={styles.chipsContainer}>
              {user.preferred_cuisines.map((cuisine: string) => (
                <View key={cuisine} style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                  <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>
                    {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No cuisines selected</Text>
          )
        )}
      </View>

      {/* Dietary Restrictions */}
      <View style={styles.preferenceGroup}>
        <View style={styles.preferenceHeader}>
          <Text style={styles.preferenceLabel}>Dietary Restrictions</Text>
        </View>

        {(isEditingDietary || isEditingPreferences) ? (
          <View>
            <View style={styles.chipsContainer}>
              {DIETARY_RESTRICTIONS
                .filter(restriction => !selectedDietary.includes(restriction))
                .map(restriction => (
                  <TouchableOpacity
                    key={restriction}
                    onPress={() => onToggleDietary(restriction)}
                  >
                    <View style={styles.cuisineChip}>
                      <Text style={styles.cuisineChipText}>{restriction}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              }
            </View>

            {selectedDietary.length > 0 && (
              <View style={styles.selectedCuisinesContainer}>
                <Text style={styles.selectedLabel}>Selected:</Text>
                <View style={styles.chipsContainer}>
                  {selectedDietary.map(restriction => (
                    <TouchableOpacity
                      key={restriction}
                      onPress={() => onToggleDietary(restriction)}
                    >
                      <View style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                        <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>{restriction}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {isEditingDietary && !isEditingPreferences && (
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancelEditingDietary}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={onSaveDietary}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          user?.dietary_restrictions && user.dietary_restrictions.length > 0 ? (
            <View style={styles.chipsContainer}>
              {user.dietary_restrictions.map((restriction: string) => (
                <View key={restriction} style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                  <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>
                    {restriction.charAt(0).toUpperCase() + restriction.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No dietary restrictions selected</Text>
          )
        )}
      </View>

      {/* Home Base */}
      <View style={styles.preferenceGroup}>
        <View style={styles.preferenceHeader}>
          <Text style={styles.preferenceLabel}>Home Base</Text>
        </View>

        {(isEditingHomeBase || isEditingPreferences) ? (
          <View>
            <TouchableOpacity
              style={styles.homeBaseSelector}
              onPress={() => onSetShowHomeBasePicker(!showHomeBasePicker)}
            >
              <View style={styles.homeBaseSelectorContent}>
                <Text style={styles.homeBaseSelectorText}>
                  {selectedHomeBase ? HOME_BASE_CITIES.find(c => c.name === selectedHomeBase)?.emoji + ' ' + selectedHomeBase : 'Select your home base city'}
                </Text>
                <Text style={styles.homeBaseSelectorIcon}>
                  {showHomeBasePicker ? '\u25B2' : '\u25BC'}
                </Text>
              </View>
            </TouchableOpacity>

            {showHomeBasePicker && (
              <View style={styles.homeBasePickerContainer}>
                <SearchBar
                  value={homeBaseSearch}
                  onChangeText={onSetHomeBaseSearch}
                  placeholder="Search cities..."
                />

                <ScrollView style={styles.homeBaseCityList} showsVerticalScrollIndicator={false}>
                  {getFilteredHomeBaseCities().map((city) => (
                    <TouchableOpacity
                      key={city.name}
                      style={[
                        styles.homeBaseCityItem,
                        selectedHomeBase === city.name && styles.homeBaseCityItemSelected
                      ]}
                      onPress={() => onSelectHomeBaseCity(city.name)}
                    >
                      <Text style={styles.homeBaseCityName}>{city.emoji} {city.name}</Text>
                      {selectedHomeBase === city.name && (
                        <Text style={styles.homeBaseSelectedIcon}>{'\u2713'}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {isEditingHomeBase && !isEditingPreferences && (
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancelEditingHomeBase}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={onSaveHomeBase}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.homeBaseDisplayText}>
            {user?.home_base ? HOME_BASE_CITIES.find(c => c.name === user.home_base)?.emoji + ' ' + user.home_base : 'No home base set'}
          </Text>
        )}
      </View>

      {isEditingPreferences && (
        <View style={styles.editButtonsContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancelEditingPreferences}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={onSavePreferences}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const RED = '#E9323D';
const RED_LIGHT = '#FFF5F5';
const DARK = '#111111';

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 22,
    color: '#111827',
    marginBottom: theme.spacing.sm,
    fontFamily: 'DMSans-SemiBold',
  },
  preferenceGroup: {
    marginBottom: theme.spacing.xl,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'IBMPlexMono-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editButtonText: {
    color: RED,
    fontSize: 13,
    fontFamily: 'DMSans-SemiBold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  cuisineChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cuisineChipSelected: {
    backgroundColor: RED_LIGHT,
    borderWidth: 2,
    borderColor: RED,
  },
  cuisineChipText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'DMSans-Medium',
  },
  cuisineChipTextSelected: {
    color: RED,
    fontFamily: 'DMSans-SemiBold',
  },
  selectedCuisinesContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectedLabel: {
    fontSize: theme.typography.sizes.sm,
    color: '#9CA3AF',
    marginBottom: theme.spacing.sm,
    fontFamily: 'DMSans-Medium',
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontFamily: 'DMSans-Medium',
  },
  expandButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  expandButtonText: {
    fontSize: theme.typography.sizes.md,
    color: RED,
    fontFamily: 'DMSans-Medium',
  },
  collapseButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  collapseButtonText: {
    fontSize: theme.typography.sizes.md,
    color: RED,
    fontFamily: 'DMSans-Medium',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 17,
    color: DARK,
    fontFamily: 'DMSans-SemiBold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: DARK,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: 'DMSans-SemiBold',
  },
  homeBaseDisplayText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'DMSans-Medium',
  },
  homeBaseSelector: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing.md,
  },
  homeBaseSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeBaseSelectorText: {
    fontSize: theme.typography.sizes.md,
    color: '#111827',
    fontFamily: 'DMSans-Medium',
  },
  homeBaseSelectorIcon: {
    fontSize: theme.typography.sizes.sm,
    color: '#9CA3AF',
  },
  homeBasePickerContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  homeBaseCityList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  homeBaseCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  homeBaseCityItemSelected: {
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED,
  },
  homeBaseCityName: {
    fontSize: theme.typography.sizes.md,
    color: '#111827',
    fontFamily: 'DMSans-Medium',
  },
  homeBaseSelectedIcon: {
    fontSize: 18,
    color: RED,
    fontWeight: 'bold',
  },
  spiceSliderContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  currentSelectionDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  currentPeppers: {
    fontSize: 28,
    lineHeight: 32,
  },
  customSlider: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: RED,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    ...theme.shadows.sm,
  },
  sliderStopActive: {
    backgroundColor: RED,
    borderColor: RED,
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: theme.typography.sizes.md,
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'DMSans-Medium',
  },
});
