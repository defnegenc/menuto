import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
        {/* Edit removed — global edit at top */}
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
                <TouchableOpacity onPress={onCancelEditingCuisines}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSaveCuisines}>
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

      <View style={styles.divider} />

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
                <TouchableOpacity onPress={onCancelEditingDietary}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSaveDietary}>
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

      <View style={styles.divider} />

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
                <TouchableOpacity onPress={onCancelEditingHomeBase}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSaveHomeBase}>
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
          <TouchableOpacity onPress={onCancelEditingPreferences}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSavePreferences}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 28,
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  preferenceGroup: {
    marginBottom: 20,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceLabel: {
    fontSize: 10,
    color: '#1A1A1A',
    fontFamily: 'DMSans-Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  editButtonText: {
    color: '#E9323D',
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  cuisineChip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cuisineChipSelected: {
    backgroundColor: '#E9323D',
    borderWidth: 1,
    borderColor: '#E9323D',
  },
  cuisineChipText: {
    fontSize: 13,
    color: '#666666',
    fontFamily: 'DMSans-Medium',
  },
  cuisineChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-SemiBold',
  },
  selectedCuisinesContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontFamily: 'DMSans-Medium',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    fontFamily: 'DMSans-Regular',
  },
  expandButton: {
    marginTop: 0,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#E9323D',
    fontFamily: 'DMSans-Medium',
  },
  collapseButton: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
  },
  collapseButtonText: {
    fontSize: 14,
    color: '#E9323D',
    fontFamily: 'DMSans-Medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 20,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'DMSans-Regular',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#E9323D',
    fontFamily: 'DMSans-SemiBold',
  },
  homeBaseDisplayText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'PlayfairDisplay-Italic',
  },
  homeBaseSelector: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  homeBaseSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeBaseSelectorText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'DMSans-Medium',
  },
  homeBaseSelectorIcon: {
    fontSize: 12,
    color: '#666666',
  },
  homeBasePickerContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  homeBaseCityList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  homeBaseCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  homeBaseCityItemSelected: {
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E9323D',
  },
  homeBaseCityName: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'DMSans-Medium',
  },
  homeBaseSelectedIcon: {
    fontSize: 18,
    color: '#E9323D',
    fontWeight: 'bold',
  },
  spiceSliderContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  currentSelectionDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPeppers: {
    fontSize: 28,
    lineHeight: 32,
  },
  customSlider: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#E9323D',
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
    borderColor: '#E5E5E5',
  },
  sliderStopActive: {
    backgroundColor: '#E9323D',
    borderColor: '#E9323D',
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: 14,
    color: '#444444',
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
});
