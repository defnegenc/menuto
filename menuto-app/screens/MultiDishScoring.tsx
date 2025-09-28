import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { SelectionDishCard } from '../components/SelectionDishCard';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

interface MultiDishScoringProps {
  restaurant: {
    place_id: string;
    name: string;
    cuisine_type?: string;
  };
  selectedDishes: Recommendation[];
  onComplete: (dishes: Recommendation[], addToFavorites: boolean[]) => void;
  onBack: () => void;
}

interface Recommendation {
  id: number;
  name: string;
  description: string;
  price?: string;
  category: string;
  dietary_tags: string[];
  ingredients: string[];
  avg_rating?: number;
  source: string;
  recommendation_score: number;
  score_breakdown: {
    customer_praise: number;
    taste_compatibility: number;
    craving_match: number;
    friend_boost: number;
  };
  recommendation_reason: string;
  friend_recommendation?: string;
}

export const MultiDishScoring: React.FC<MultiDishScoringProps> = ({
  restaurant,
  selectedDishes,
  onComplete,
  onBack
}) => {
  const { user, userId } = useStore();
  const [ratings, setRatings] = useState<{[key: number]: number}>({});
  const [addToFavorites, setAddToFavorites] = useState<{[key: number]: boolean}>({});
  const [feedback, setFeedback] = useState<{[key: number]: string}>({});

  const handleRatingChange = (dishId: number, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [dishId]: rating
    }));
  };

  const handleFavoriteToggle = (dishId: number) => {
    setAddToFavorites(prev => ({
      ...prev,
      [dishId]: !prev[dishId]
    }));
  };

  const handleFeedbackChange = (dishId: number, text: string) => {
    setFeedback(prev => ({
      ...prev,
      [dishId]: text
    }));
  };

  const handleComplete = async () => {
    // Check if all dishes have been rated
    const unratedDishes = selectedDishes.filter(dish => !ratings[dish.id]);
    if (unratedDishes.length > 0) {
      Alert.alert(
        'Rate All Dishes',
        `Please rate ${unratedDishes.length} more dish${unratedDishes.length > 1 ? 'es' : ''} before continuing.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Add restaurant and selected favorite dishes to user's favorites
      const favoriteDishes = selectedDishes
        .filter(dish => addToFavorites[dish.id])
        .map(dish => ({
          dish_name: dish.name,
          restaurant_id: restaurant.place_id
        }));

      if (favoriteDishes.length > 0) {
        // Add restaurant to favorites if it's not already there
        const isRestaurantAlreadyFavorited = user?.favorite_restaurants?.some(
          r => r.place_id === restaurant.place_id
        );

        if (!isRestaurantAlreadyFavorited) {
          // Add restaurant to favorites by updating user preferences
          const currentRestaurants = user?.favorite_restaurants || [];
          const newRestaurant = {
            name: restaurant.name,
            place_id: restaurant.place_id,
            cuisine_type: restaurant.cuisine_type || 'Restaurant',
            vicinity: '', // We don't have this info in this context
            rating: 4 // Default rating
          };
          
          await api.saveUserPreferences(userId!, {
            ...user,
            favorite_restaurants: [...currentRestaurants, newRestaurant]
          });
        }

        // Add favorite dishes one by one
        for (const dish of favoriteDishes) {
          await api.addFavoriteDish(userId!, dish);
        }
        
        // Update local user state with new favorite dishes
        const currentFavoriteDishes = user?.favorite_dishes || [];
        const updatedFavoriteDishes = [...currentFavoriteDishes, ...favoriteDishes];
        
        const updatedUser = {
          ...user,
          favorite_dishes: updatedFavoriteDishes
        };
        
        // Update the user state in the store
        const { setUser } = useStore.getState();
        setUser(updatedUser, userId!);
        
        console.log('✅ Updated user state with new favorite dishes:', {
          newDishes: favoriteDishes.map(d => d.dish_name),
          totalDishes: updatedFavoriteDishes.length
        });
      }

      onComplete(selectedDishes, selectedDishes.map(dish => addToFavorites[dish.id] || false));
    } catch (error) {
      console.error('Error saving favorites:', error);
      Alert.alert(
        'Error',
        'Failed to save your favorites. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const allRated = selectedDishes.every(dish => ratings[dish.id]);

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        title="Rate Dishes" 
        showBackButton={true}
        onBack={onBack}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Rate your dishes</Text>
          <Text style={styles.headerSubtitle}>
            Rate each dish, add favorites, and share your thoughts
          </Text>
        </View>

        {selectedDishes.map((dish) => (
          <View key={dish.id} style={styles.dishSection}>
            <SelectionDishCard
              dish={{
                name: dish.name,
                description: dish.description,
                score: dish.recommendation_score || 0
              }}
              isSelected={false}
              onPress={() => {}}
              showScore={false}
            />
            
            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate this dish:</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => handleRatingChange(dish.id, star)}
                  >
                    <Text style={[
                      styles.star,
                      star <= (ratings[dish.id] || 0) && styles.starFilled
                    ]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Add to Favorites Checkbox */}
            <TouchableOpacity 
              style={styles.favoriteSection}
              onPress={() => handleFavoriteToggle(dish.id)}
            >
              <View style={styles.checkbox}>
                {addToFavorites[dish.id] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.favoriteLabel}>Add to favorites</Text>
            </TouchableOpacity>

            {/* Optional Feedback */}
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Tell us more (optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="What did you like or dislike?"
                value={feedback[dish.id] || ''}
                onChangeText={(text) => handleFeedbackChange(dish.id, text)}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.completeSection}>
        <TouchableOpacity 
          style={[
            styles.completeButton,
            !allRated && styles.completeButtonDisabled
          ]}
          onPress={handleComplete}
          disabled={!allRated}
        >
          <Text style={[
            styles.completeButtonText,
            !allRated && styles.completeButtonTextDisabled
          ]}>
            Complete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  headerSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dishSection: {
    marginBottom: theme.spacing.xl,
  },
  ratingSection: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: theme.spacing.sm,
  },
  star: {
    fontSize: 32,
    color: theme.colors.border,
  },
  starFilled: {
    color: theme.colors.primary,
  },
  favoriteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  feedbackSection: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  feedbackLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background,
    minHeight: 60,
  },
  completeSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  completeButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
  },
  completeButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  completeButtonTextDisabled: {
    color: theme.colors.text.secondary,
  },
});
