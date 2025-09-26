import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { useStore } from '../store/useStore';

interface PostMealFeedbackProps {
  dish: {
    id: number;
    name: string;
    description: string;
    restaurant: string;
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
  const [isAddedToFavorites, setIsAddedToFavorites] = useState(false);

  const handleAddToFavorites = () => {
    if (!user || !userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    // Check if already in favorites
    const existingFavorites = user.favorite_dishes || [];
    const isAlreadyFavorite = existingFavorites.some(fav => 
      fav.dish_name === dish.name && 
      fav.restaurant_id === dish.restaurant
    );

    if (isAlreadyFavorite) {
      Alert.alert('Already in Favorites', 'This dish is already in your favorites!');
      return;
    }

    // Add to favorites
    const newFavorite = {
      dish_name: dish.name,
      restaurant_id: dish.restaurant,
      rating: rating || 5 // Use current rating or default to 5
    };

    const updatedFavorites = [...existingFavorites, newFavorite];
    const updatedUser = { ...user, favorite_dishes: updatedFavorites };
    
    setUser(updatedUser, userId);
    setIsAddedToFavorites(true);
    
    Alert.alert(
      'Added to Favorites!', 
      `${dish.name} has been added to your favorite dishes.`,
      [{ text: 'Great!' }]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Please rate the dish', 'Select a star rating before continuing.');
      return;
    }

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
      <UnifiedHeader title="How was it?" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishDescription}>{dish.description}</Text>
          <Text style={styles.restaurantName}>at {dish.restaurant}</Text>
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
        </View>

        {/* Add to Favorites Section */}
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>Save this dish</Text>
          <Text style={styles.sectionSubtitle}>
            Add this dish to your favorites to get better recommendations in the future.
          </Text>
          <TouchableOpacity 
            style={[
              styles.favoritesButton,
              isAddedToFavorites && styles.favoritesButtonAdded
            ]}
            onPress={handleAddToFavorites}
            disabled={isAddedToFavorites}
          >
            <Text style={[
              styles.favoritesButtonText,
              isAddedToFavorites && styles.favoritesButtonTextAdded
            ]}>
              {isAddedToFavorites ? '✓ Added to Favorites' : '+ Add to Favorites'}
            </Text>
          </TouchableOpacity>
        </View>
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
  favoritesSection: {
    marginBottom: theme.spacing.xl,
  },
  favoritesButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  favoritesButtonAdded: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  favoritesButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  favoritesButtonTextAdded: {
    color: '#FFFFFF',
  },
});

