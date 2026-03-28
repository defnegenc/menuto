import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';
import { FavoriteRestaurant } from '../../types';
import { RestaurantCard } from '../../components/RestaurantCard';
import { SearchBar } from '../../components/SearchBar';

interface SavedRestaurantsListProps {
  user: any;
  top3Restaurants: FavoriteRestaurant[];
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  // Top 3 editing
  isEditingTop3: boolean;
  selectedTop3: FavoriteRestaurant[];
  top3Search: string;
  onSetTop3Search: (text: string) => void;
  onStartEditingTop3: () => void;
  onCancelEditingTop3: () => void;
  onSaveTop3: () => void;
  onToggleTop3Restaurant: (restaurant: FavoriteRestaurant) => void;
  getFilteredTop3Restaurants: () => FavoriteRestaurant[];
  getFavoriteDishesForRestaurant: (restaurant: FavoriteRestaurant) => any[];
  // Tried dishes
  triedDishes: any[];
  loadingTriedDishes: boolean;
  // Sign out
  onSignOut?: () => void;
}

export function SavedRestaurantsList({
  user,
  top3Restaurants,
  onSelectRestaurant,
  isEditingTop3,
  selectedTop3,
  top3Search,
  onSetTop3Search,
  onStartEditingTop3,
  onCancelEditingTop3,
  onSaveTop3,
  onToggleTop3Restaurant,
  getFilteredTop3Restaurants,
  getFavoriteDishesForRestaurant,
  triedDishes,
  loadingTriedDishes,
  onSignOut,
}: SavedRestaurantsListProps) {
  return (
    <>
      {/* Top 3 Restaurants */}
      <View style={styles.section}>
        <View style={styles.preferenceHeader}>
          <Text style={styles.sectionTitle}>Your Top Restaurants</Text>
          {!isEditingTop3 && (
            <TouchableOpacity onPress={onStartEditingTop3}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditingTop3 ? (
          <View>
            <SearchBar
              value={top3Search}
              onChangeText={onSetTop3Search}
              placeholder="Search your restaurants..."
            />

            {selectedTop3.length > 0 && (
              <View style={styles.selectedTop3Container}>
                <Text style={styles.selectedLabel}>Selected ({selectedTop3.length}/3):</Text>
                {selectedTop3.map((restaurant, index) => (
                  <View key={restaurant.place_id} style={styles.selectedTop3Item}>
                    <Text style={styles.selectedTop3Text}>#{index + 1} {restaurant.name}</Text>
                    <TouchableOpacity
                      style={styles.removeTop3Button}
                      onPress={() => onToggleTop3Restaurant(restaurant)}
                    >
                      <Text style={styles.removeTop3Text}>{'\u00D7'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.top3ChipsContainer}>
              {getFilteredTop3Restaurants()
                .filter(restaurant => !selectedTop3.some(r => r.place_id === restaurant.place_id))
                .map(restaurant => (
                  <TouchableOpacity
                    key={restaurant.place_id}
                    style={[
                      styles.top3Chip,
                      selectedTop3.length >= 3 && styles.top3ChipDisabled
                    ]}
                    onPress={() => onToggleTop3Restaurant(restaurant)}
                    disabled={selectedTop3.length >= 3}
                  >
                    <Text style={[styles.top3ChipText, selectedTop3.length >= 3 && styles.top3ChipTextDisabled]}>
                      {restaurant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {selectedTop3.length >= 3 && (
              <Text style={styles.emptyText}>Maximum number of restaurants selected</Text>
            )}

            <View style={styles.editButtonsContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancelEditingTop3}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={onSaveTop3}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {top3Restaurants.length > 0 ? (
              <View style={styles.top3RestaurantsContainer}>
                {top3Restaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={restaurant.place_id}
                    restaurant={restaurant}
                    dishes={getFavoriteDishesForRestaurant(restaurant)}
                    onSelectRestaurant={onSelectRestaurant}
                    onRemoveRestaurant={() => {}}
                    rank={index + 1}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No top restaurants selected</Text>
                <Text style={styles.emptyStateSubtext}>Tap "Edit" to choose your top 3</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Dishes You've Tried */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dishes You've Tried</Text>
        {loadingTriedDishes ? (
          <Text style={styles.emptyStateText}>Loading...</Text>
        ) : triedDishes.length > 0 ? (
          <View style={styles.chipsContainer}>
            {triedDishes.map((dish) => (
              <TouchableOpacity
                key={dish.id}
                onPress={() => {
                  if (dish.restaurant_place_id) {
                    console.log('Navigate to restaurant:', dish.restaurant_place_id);
                  }
                }}
              >
                <View style={styles.triedDishChip}>
                  <Text style={styles.triedDishChipText}>
                    {dish.name}
                    {dish.rating && ` \u2B50 ${dish.rating.toFixed(1)}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No dishes tried yet</Text>
            <Text style={styles.emptyStateSubtext}>Order and rate dishes to see them here</Text>
          </View>
        )}
      </View>

      {/* Sign Out Button */}
      {onSignOut && (
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
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
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  editButtonText: {
    color: TERRA,
    fontSize: 12,
    fontFamily: theme.typography.fontFamilies.bold,
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
  top3RestaurantsContainer: {
    gap: theme.spacing.sm,
  },
  selectedTop3Container: {
    marginBottom: theme.spacing.md,
    padding: 20,
    backgroundColor: '#FAFAF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  selectedTop3Item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  selectedTop3Text: {
    fontSize: theme.typography.sizes.md,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  removeTop3Button: {
    padding: theme.spacing.xs,
  },
  removeTop3Text: {
    fontSize: 20,
    color: TERRA,
    fontWeight: 'bold',
  },
  top3ChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  top3Chip: {
    backgroundColor: '#FDECED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 0,
  },
  top3ChipDisabled: {
    opacity: 0.5,
  },
  top3ChipText: {
    fontSize: 12,
    color: TERRA,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  top3ChipTextDisabled: {
    color: '#A8A29E',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#A8A29E',
    marginBottom: 4,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A8A29E',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  triedDishChip: {
    backgroundColor: '#FDECED',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triedDishChipText: {
    fontSize: 12,
    color: TERRA,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  signOutContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 20,
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  signOutButtonText: {
    color: '#1C1917',
    fontSize: 16,
    fontFamily: theme.typography.fontFamilies.medium,
  },
});
