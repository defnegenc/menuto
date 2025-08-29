import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { theme } from '../theme';
import { FavoriteRestaurant } from '../types';

interface Props {
  onComplete: () => void;
}

export function Top3SelectionScreen({ onComplete }: Props) {
  const { user, userId, updateTop3Restaurants } = useStore();
  const [selectedRestaurants, setSelectedRestaurants] = useState<FavoriteRestaurant[]>([]);
  
  const favoriteRestaurants = user?.favorite_restaurants || [];

  useEffect(() => {
    // Initialize with current top 3 if they exist
    if (user?.top_3_restaurants) {
      setSelectedRestaurants(user.top_3_restaurants);
    }
  }, [user?.top_3_restaurants]);

  const toggleRestaurant = (restaurant: FavoriteRestaurant) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedRestaurants(selectedRestaurants.filter(r => r.place_id !== restaurant.place_id));
    } else {
      // Add to selection (max 3)
      if (selectedRestaurants.length < 3) {
        setSelectedRestaurants([...selectedRestaurants, restaurant]);
      } else {
        Alert.alert('Maximum 3 restaurants', 'You can only select up to 3 restaurants for your top list.');
      }
    }
  };

  const handleComplete = async () => {
    if (selectedRestaurants.length === 0) {
      Alert.alert('Select Restaurants', 'Please select at least one restaurant for your top list.');
      return;
    }

    try {
      if (userId) {
        await updateTop3Restaurants(selectedRestaurants, userId);
      }
      onComplete();
    } catch (error) {
      console.error('Failed to save top 3 restaurants:', error);
      Alert.alert('Error', 'Failed to save your top restaurants. Please try again.');
    }
  };

  const renderRestaurantCard = (restaurant: FavoriteRestaurant) => {
    const isSelected = selectedRestaurants.some(r => r.place_id === restaurant.place_id);
    const rank = selectedRestaurants.findIndex(r => r.place_id === restaurant.place_id) + 1;
    
    return (
      <TouchableOpacity
        key={restaurant.place_id}
        style={[
          styles.restaurantCard,
          isSelected && styles.restaurantCardSelected
        ]}
        onPress={() => toggleRestaurant(restaurant)}
      >
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantLocation}>{restaurant.vicinity}</Text>
          {restaurant.cuisine_type && (
            <Text style={styles.restaurantCuisine}>{restaurant.cuisine_type}</Text>
          )}
        </View>
        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
          ) : (
            <View style={styles.radioButton}>
              <Text style={styles.radioText}>○</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pick Your Top 3</Text>
        <Text style={styles.subtitle}>
          Select up to 3 restaurants that are your absolute favorites
        </Text>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Selected: {selectedRestaurants.length}/3
        </Text>
      </View>

      <ScrollView style={styles.restaurantsList}>
        {favoriteRestaurants.length > 0 ? (
          favoriteRestaurants.map(renderRestaurantCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No restaurants yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add some restaurants to your favorites first
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.completeButton,
            selectedRestaurants.length === 0 && styles.completeButtonDisabled
          ]}
          onPress={handleComplete}
          disabled={selectedRestaurants.length === 0}
        >
          <Text style={styles.completeButtonText}>
            {selectedRestaurants.length > 0 
              ? `Save Top ${selectedRestaurants.length} Restaurant${selectedRestaurants.length > 1 ? 's' : ''}`
              : 'Select Restaurants'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  statusBar: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  restaurantsList: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadows.sm,
  },
  restaurantCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  restaurantLocation: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  restaurantCuisine: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.tertiary,
    fontWeight: theme.typography.weights.medium,
    textTransform: 'capitalize',
  },
  selectionIndicator: {
    marginLeft: theme.spacing.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: theme.spacing.huge,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: theme.colors.text.muted,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
});
