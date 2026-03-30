import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
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
          {/* Edit removed — global edit at top */}
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
              <TouchableOpacity onPress={onCancelEditingTop3}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSaveTop3}>
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
                <Text style={styles.emptyStateText}>Pick your top 3 restaurants</Text>
                <TouchableOpacity style={styles.addTop3Button} onPress={onStartEditingTop3}>
                  <Text style={styles.addTop3ButtonText}>+ Choose favorites</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.sectionDivider} />

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
          <TouchableOpacity onPress={onSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButtonText: {
    color: '#E9323D',
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontFamily: 'DMSans-Regular',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    fontFamily: 'DMSans-Regular',
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
  top3RestaurantsContainer: {
    gap: 8,
  },
  selectedTop3Container: {
    marginBottom: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedTop3Item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  selectedTop3Text: {
    fontSize: 17,
    color: '#1A1A1A',
    fontFamily: 'PlayfairDisplay-Italic',
  },
  removeTop3Button: {
    padding: 4,
  },
  removeTop3Text: {
    fontSize: 20,
    color: '#E9323D',
    fontWeight: 'bold',
  },
  top3ChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  top3Chip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  top3ChipDisabled: {
    opacity: 0.5,
  },
  top3ChipText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'DMSans-Medium',
  },
  top3ChipTextDisabled: {
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontFamily: 'DMSans-Regular',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'DMSans-Regular',
  },
  addTop3Button: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#E9323D',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addTop3ButtonText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    color: '#E9323D',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  triedDishChip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triedDishChipText: {
    fontSize: 12,
    color: '#444444',
    fontFamily: 'DMSans-Medium',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  signOutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#E9323D',
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
  },
});
