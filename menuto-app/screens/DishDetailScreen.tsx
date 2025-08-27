import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParsedDish } from '../types';
import { theme } from '../theme';
import { useStore } from '../store/useStore';

interface Props {
  dish: ParsedDish;
  onBack: () => void;
}

export function DishDetailScreen({ dish, onBack }: Props) {
  const { user, setUser, userId } = useStore();
  const [rating, setRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);

  const handleRating = (starRating: number) => {
    setRating(starRating);
  };

  const submitRating = () => {
    if (rating === 0) {
      Alert.alert('Please rate the dish first');
      return;
    }
    setHasRated(true);
    Alert.alert(
      'Thanks for your rating!',
      `You rated this dish ${rating} out of 5 stars.`,
      [
        {
          text: 'Add to Favorites',
          onPress: () => addToFavorites(),
        },
        {
          text: 'Done',
          onPress: () => {},
        }
      ]
    );
  };

  const addToFavorites = () => {
    if (!user || !userId) return;

    const existingFavorites = user.favorite_dishes || [];
    const newFavorite = {
      dish_name: dish.name,
      restaurant_id: dish.restaurant_id || 'Unknown',
      rating: rating,
    };

    const updatedFavorites = [...existingFavorites, newFavorite];
    
    const updatedUser = {
      ...user,
      favorite_dishes: updatedFavorites
    };

    setUser(updatedUser, userId);

    Alert.alert(
      'Added to Favorites!',
      `${dish.name} has been added to your favorite dishes.`,
      [{ text: 'Great!' }]
    );
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => handleRating(star)}
          style={styles.starButton}
        >
          <Text style={[
            styles.star,
            star <= rating && styles.starFilled
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dishInfo}>
          <View style={styles.dishHeader}>
            <Text style={styles.dishName}>{dish.name}</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{dish.avg_rating?.toFixed(1) || '4.0'}</Text>
              <Text style={styles.scoreLabel}>★</Text>
            </View>
          </View>
          
          <Text style={styles.dishPrice}>${dish.price}</Text>
          
          {dish.description && (
            <Text style={styles.dishDescription}>{dish.description}</Text>
          )}
          

          {dish.ingredients && dish.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredients}>
                {dish.ingredients.map((ingredient, index) => (
                  <View key={`${ingredient}-${index}`} style={styles.ingredient}>
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {dish.dietary_tags && dish.dietary_tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Dietary Info</Text>
              <View style={styles.tags}>
                {dish.dietary_tags.map((tag, index) => (
                  <View key={`${tag}-${index}`} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {!hasRated && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>How was this dish?</Text>
            <Text style={styles.ratingSubtitle}>Rate your experience (1-5 stars)</Text>
            
            {renderStars()}
            
            {rating > 0 && (
              <TouchableOpacity style={styles.submitButton} onPress={submitRating}>
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasRated && (
          <View style={styles.thankYouSection}>
            <Text style={styles.thankYouText}>Thanks for rating!</Text>
            <Text style={styles.ratedText}>You gave this dish {rating} stars ⭐</Text>
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  dishInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dishName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
    marginRight: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  dishPrice: {
    fontSize: 20,
    color: '#2ECC71',
    fontWeight: '600',
    marginBottom: 12,
  },
  dishDescription: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 12,
    lineHeight: 22,
  },
  explanation: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  ingredientsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  ingredients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredient: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ingredientText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tagsSection: {
    marginBottom: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#E8F6F3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2ECC71',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 28,
    color: '#E1E8ED',
  },
  starFilled: {
    color: '#FFD700',
  },
  submitButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  thankYouSection: {
    backgroundColor: '#E8F6F3',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginBottom: 8,
  },
  ratedText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
});