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

const TERRA = '#E9323D';

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 24,
    color: '#1C1917',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
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
    fontSize: 22,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  editButtonText: {
    color: TERRA,
    fontSize: 12,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  cuisineChip: {
    backgroundColor: '#FDECED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 0,
  },
  cuisineChipSelected: {
    backgroundColor: TERRA,
  },
  cuisineChipText: {
    fontSize: 12,
    color: TERRA,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  cuisineChipTextSelected: {
    color: '#FFFFFF',
  },
  selectedCuisinesContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectedLabel: {
    fontSize: theme.typography.sizes.sm,
    color: '#A8A29E',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: '#A8A29E',
    fontStyle: 'italic',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  expandButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  expandButtonText: {
    fontSize: theme.typography.sizes.md,
    color: TERRA,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  collapseButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  collapseButtonText: {
    fontSize: theme.typography.sizes.md,
    color: TERRA,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  saveButton: {
    flex: 1,
    backgroundColor: TERRA,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  homeBaseDisplayText: {
    fontSize: 14,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  homeBaseSelector: {
    borderWidth: 1,
    borderColor: '#E7E5E4',
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
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  homeBaseSelectorIcon: {
    fontSize: theme.typography.sizes.sm,
    color: '#A8A29E',
  },
  homeBasePickerContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  homeBaseCityList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  homeBaseCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  homeBaseCityItemSelected: {
    backgroundColor: '#FDECED',
  },
  homeBaseCityName: {
    fontSize: theme.typography.sizes.md,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  homeBaseSelectedIcon: {
    fontSize: 18,
    color: TERRA,
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
    backgroundColor: '#E7E5E4',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: TERRA,
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
    borderColor: '#E7E5E4',
    ...theme.shadows.sm,
  },
  sliderStopActive: {
    backgroundColor: TERRA,
    borderColor: TERRA,
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: theme.typography.sizes.md,
    color: '#1C1917',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilies.medium,
  },
});
