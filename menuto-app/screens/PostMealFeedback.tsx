import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { SearchBar } from '../components/SearchBar';
import { MenuItemCard } from '../components/MenuItemCard';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { ParsedDish } from '../types';

interface PostMealFeedbackProps {
  dish: {
    id: number;
    name: string;
    description: string;
    restaurant: string;
    restaurantPlaceId?: string;
  };
  onComplete: (rating: number, feedback: string) => void;
  onBack: () => void;
}

export const PostMealFeedback: React.FC<PostMealFeedbackProps> = ({
  dish,
  onComplete,
  onBack
}) => {
  const { user, setUser, userId } = useStore();
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search functionality states
  const [searchText, setSearchText] = useState<string>('');
  const [menuDishes, setMenuDishes] = useState<ParsedDish[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<ParsedDish[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [selectedDish, setSelectedDish] = useState(dish);

  // Load restaurant menu when component mounts
  useEffect(() => {
    if (dish.restaurantPlaceId) {
      loadRestaurantMenu();
    }
  }, [dish.restaurantPlaceId]);

  const loadRestaurantMenu = async () => {
    if (!dish.restaurantPlaceId) {
      console.log('❌ No restaurantPlaceId provided for menu loading');
      return;
    }
    
    console.log(`🔄 Loading menu for ${dish.restaurant} (${dish.restaurantPlaceId})`);
    setIsLoadingMenu(true);
    try {
      const response = await api.getRestaurantMenu(dish.restaurant, dish.restaurantPlaceId);
      console.log(`📋 Menu response:`, response);
      
      if (response.dishes && Array.isArray(response.dishes)) {
        console.log(`✅ Loaded ${response.dishes.length} dishes:`, response.dishes.map((d: any) => d.name));
        setMenuDishes(response.dishes);
      } else if (response.success === false) {
        console.log('❌ No menu found or API error:', response.message);
        setMenuDishes([]);
      } else {
        console.log('❌ Unexpected response format:', response);
        setMenuDishes([]);
      }
    } catch (error) {
      console.error(`❌ Error loading menu for ${dish.restaurant}:`, error);
      setMenuDishes([]);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleSearchMenu = (text: string) => {
    console.log(`🔍 Search text: "${text}", Menu dishes count: ${menuDishes.length}`);
    setSearchText(text);
    if (text.trim()) {
      setShowSearchResults(true);
      const filtered = menuDishes.filter(dish => 
        dish.name.toLowerCase().includes(text.toLowerCase()) ||
        (dish.description && dish.description.toLowerCase().includes(text.toLowerCase()))
      );
      console.log(`🔍 Filtered dishes:`, filtered.map(d => d.name));
      setFilteredDishes(filtered);
    } else {
      setShowSearchResults(false);
      setFilteredDishes([]);
    }
  };

  const handleDishSelect = (selectedDishItem: ParsedDish) => {
    setSelectedDish({
      id: typeof selectedDishItem.id === 'number' ? selectedDishItem.id : Math.random(),
      name: selectedDishItem.name,
      description: selectedDishItem.description || '',
      restaurant: dish.restaurant,
      restaurantPlaceId: dish.restaurantPlaceId
    });
    setSearchText('');
    setShowSearchResults(false);
    setRating(0); // Reset rating when selecting a new dish
    setFeedback(''); // Reset feedback when selecting a new dish
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Please rate the dish', 'Select a star rating before continuing.');
      return;
    }

    // Ask if user wants to add dish and restaurant to favorites
    Alert.alert(
      'Add to Favorites?',
      `Would you like to add "${selectedDish.name}" and "${selectedDish.restaurant}" to your favorites?`,
      [
        {
          text: 'No Thanks',
          style: 'cancel',
          onPress: () => {
            // Just complete the feedback without adding to favorites
            submitFeedback();
          }
        },
        {
          text: 'Yes, Add Both!',
          onPress: () => {
            // Add both dish and restaurant to favorites, then complete feedback
            addDishAndRestaurantToFavorites();
          }
        }
      ]
    );
  };

  const addDishAndRestaurantToFavorites = async () => {
    if (!user || !userId) {
      submitFeedback();
      return;
    }

    try {
      // Add dish to favorites
      const existingFavorites = user.favorite_dishes || [];
      const isAlreadyFavorite = existingFavorites.some(fav => 
        fav.dish_name === selectedDish.name && 
        fav.restaurant_id === selectedDish.restaurant
      );

      if (!isAlreadyFavorite) {
        const newFavorite = {
          dish_name: selectedDish.name,
          restaurant_id: selectedDish.restaurantPlaceId || selectedDish.restaurant,
          rating: rating
        };

        const updatedFavorites = [...existingFavorites, newFavorite];
        const updatedUser = { ...user, favorite_dishes: updatedFavorites };
        
        console.log('🍽️ Adding dish and restaurant to favorites:', {
          dishName: selectedDish.name,
          restaurant: selectedDish.restaurant,
          rating: rating
        });
        
        setUser(updatedUser, userId);
      }

      // Add restaurant to favorites (if not already there)
      const existingRestaurants = user.favorite_restaurants || [];
      const isRestaurantAlreadyFavorite = existingRestaurants.some(rest => 
        rest.name === selectedDish.restaurant
      );

      if (!isRestaurantAlreadyFavorite) {
        const newRestaurant = {
          place_id: selectedDish.restaurantPlaceId || `temp_${selectedDish.restaurant.replace(/\s+/g, '_').toLowerCase()}`,
          name: selectedDish.restaurant,
          vicinity: 'Location not available',
          cuisine_type: 'Restaurant'
        };

        const updatedRestaurants = [...existingRestaurants, newRestaurant];
        const finalUpdatedUser = { ...user, favorite_dishes: user.favorite_dishes || [], favorite_restaurants: updatedRestaurants };
        
        console.log('🍽️ Adding restaurant to favorites:', {
          restaurantName: selectedDish.restaurant,
          placeId: newRestaurant.place_id
        });
        
        setUser(finalUpdatedUser, userId);
      }

      // Complete the feedback
      submitFeedback();
      
    } catch (error) {
      console.error('Error adding to favorites:', error);
      // Still complete feedback even if favorites addition fails
      submitFeedback();
    }
  };

  const submitFeedback = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(rating, feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => setRating(star)}
          >
            <Text style={[
              styles.star,
              star <= rating ? styles.starFilled : styles.starEmpty
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Not good';
      case 2: return 'Below average';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return 'Rate this dish';
    }
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        title="Tell us how it was" 
        showBackButton={true}
        onBack={onBack}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{selectedDish.name}</Text>
          <Text style={styles.dishDescription}>{selectedDish.description}</Text>
          <Text style={styles.restaurantName}>at {selectedDish.restaurant}</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How would you rate this dish?</Text>
          {renderStars()}
          <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>Tell us more (optional)</Text>
          <Text style={styles.sectionSubtitle}>
            What did you like or dislike? This helps us improve your recommendations.
          </Text>
          <TextInput
            style={styles.feedbackInput}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="e.g., 'Too spicy for me' or 'Perfect texture and flavor'"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Did you end up ordering something else?</Text>
          <Text style={styles.helpText}>
            If you ordered a different dish, you can search for it and rate that instead.
          </Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchText}
              onChangeText={handleSearchMenu}
              placeholder="Search for a different dish..."
            />
          </View>
        </View>

        {/* Search Results */}
        {showSearchResults && (
          <View style={styles.searchResultsSection}>
            <Text style={styles.searchResultsTitle}>Search Results</Text>
            {isLoadingMenu ? (
              <Text style={styles.loadingText}>Loading menu...</Text>
            ) : filteredDishes.length > 0 ? (
              filteredDishes.map((dishItem, index) => (
                <View key={dishItem.id || `search-dish-${index}`} style={styles.searchResultItem}>
                  <MenuItemCard
                    dish={dishItem}
                    onPress={() => handleDishSelect(dishItem)}
                    isSelected={selectedDish.name === dishItem.name}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.noResultsText}>No dishes found matching "{searchText}"</Text>
            )}
          </View>
        )}

        {/* Add to Favorites Section */}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <TouchableOpacity 
          style={[
            styles.submitButton,
            rating === 0 && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || isSubmitting}
        >
          <Text style={[
            styles.submitButtonText,
            rating === 0 && styles.submitButtonTextDisabled
          ]}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
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
  dishInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  dishName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  dishDescription: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  ratingSection: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  starButton: {
    padding: theme.spacing.sm,
  },
  star: {
    fontSize: 32,
    color: theme.colors.border,
  },
  starFilled: {
    color: theme.colors.warning,
  },
  starEmpty: {
    color: theme.colors.border,
  },
  ratingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  feedbackSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  feedbackInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 100,
  },
  helpSection: {
    backgroundColor: theme.colors.info + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  helpTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  helpText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  searchContainer: {
    marginTop: theme.spacing.md,
  },
  searchResultsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  searchResultsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  searchResultItem: {
    marginBottom: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: theme.spacing.lg,
  },
  noResultsText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: theme.spacing.lg,
  },
  submitSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: theme.colors.text.secondary,
  },
});

