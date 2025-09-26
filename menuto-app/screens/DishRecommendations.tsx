import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { LoadingScreen } from '../components/LoadingScreen';
import { MenuItemCard } from '../components/MenuItemCard';
import { api } from '../services/api';
import { useStore } from '../store/useStore';

interface DishRecommendationsProps {
  restaurant: {
    place_id: string;
    name: string;
    cuisine_type?: string;
  };
  userPreferences: {
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  };
  onContinue: (dish: Recommendation) => void;
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

export const DishRecommendations: React.FC<DishRecommendationsProps> = ({
  restaurant,
  userPreferences,
  onContinue,
  onBack
}) => {
  const { user } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedDish, setSelectedDish] = useState<Recommendation | null>(null);
  const [isDishSelected, setIsDishSelected] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      console.log('🤖 Requesting smart recommendations for:', restaurant.name);
      
      // Get user's dietary preferences and spice tolerance
      const userDietaryConstraints = user?.dietary_restrictions || [];
      const userFavoriteDishes = user?.favorite_dishes || [];
      
      const response = await api.getSmartRecommendationsNew(
        restaurant.place_id,
        restaurant.name,
        userFavoriteDishes,
        userDietaryConstraints,
        {
          hungerLevel: userPreferences.hungerLevel,
          preferenceLevel: userPreferences.preferenceLevel,
          selectedCravings: userPreferences.selectedCravings,
          spiceTolerance: user?.spice_tolerance || 3
        },
        [] // friendSelections - empty for now
      );

      console.log('✅ Smart recommendations received:', response);
      setRecommendations(response.recommendations || []);
      
      // Auto-select the top recommendation
      if (response.recommendations && response.recommendations.length > 0) {
        setSelectedDish(response.recommendations[0]);
      }
    } catch (error) {
      console.error('❌ Failed to get recommendations:', error);
      Alert.alert(
        'Error',
        'Failed to generate recommendations. Please try again.',
        [{ text: 'OK', onPress: onBack }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetNewRecommendation = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Getting new recommendations...');
      
      // Get user's dietary preferences and spice tolerance
      const userDietaryConstraints = user?.dietary_restrictions || [];
      const userFavoriteDishes = user?.favorite_dishes || [];
      
      const response = await api.getSmartRecommendationsNew(
        restaurant.place_id,
        restaurant.name,
        userFavoriteDishes, // Use actual user favorites
        userDietaryConstraints, // Use actual dietary constraints
        {
          hungerLevel: userPreferences.hungerLevel,
          preferenceLevel: userPreferences.preferenceLevel,
          selectedCravings: userPreferences.selectedCravings,
          spiceTolerance: user?.spice_tolerance || 3
        },
        [] // friendSelections - empty for now
      );

      console.log('✅ New recommendations received:', response);
      setRecommendations(response.recommendations || []);
      
      // Auto-select the top recommendation
      if (response.recommendations && response.recommendations.length > 0) {
        setSelectedDish(response.recommendations[0]);
      }
    } catch (error) {
      console.error('❌ Failed to get new recommendations:', error);
      Alert.alert(
        'Error',
        'Failed to get new recommendations. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDishSelect = (dish: Recommendation) => {
    setSelectedDish(dish);
    setIsDishSelected(false); // Reset selection state when choosing a different dish
  };

  const handleSelectDish = () => {
    if (selectedDish) {
      setIsDishSelected(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <UnifiedHeader title="Choose Dish" />
        <LoadingScreen 
          message="Loading recommendations"
          subMessage="Cooking up something good..."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UnifiedHeader title="Choose Dish" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectedDish && (
          <View style={styles.recommendationSection}>
            <Text style={styles.recommendationTitle}>
              Recommendation: <Text style={styles.dishName}>{selectedDish.name}</Text>
            </Text>
            
            {/* Featured Recommendation Card */}
            <View style={styles.featuredCard}>
              <MenuItemCard
                dish={selectedDish}
                isSelected={true}
                onPress={() => {}} // No action needed for featured card
                showScore={true}
                isFeatured={true}
              />
            </View>

            {/* Why was this recommended */}
            <View style={styles.reasoningSection}>
              <Text style={styles.reasoningTitle}>Why was this recommended?</Text>
              <Text style={styles.reasoningText}>{selectedDish.recommendation_reason}</Text>
            </View>

            {/* Select button */}
            {!isDishSelected && (
              <TouchableOpacity 
                style={styles.selectButton}
                onPress={handleSelectDish}
              >
                <Text style={styles.selectButtonText}>Select This Dish</Text>
              </TouchableOpacity>
            )}

            {/* Selected state */}
            {isDishSelected && (
              <View style={styles.selectedState}>
                <Text style={styles.selectedText}>✓ Selected: {selectedDish.name}</Text>
              </View>
            )}

            {/* Get new recommendation button */}
            <TouchableOpacity 
              style={styles.newRecommendationButton}
              onPress={handleGetNewRecommendation}
            >
              <Text style={styles.newRecommendationText}>Get new recommendation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All recommendations list */}
        <View style={styles.allRecommendationsSection}>
          <Text style={styles.sectionTitle}>All Recommendations</Text>
          {recommendations.map((dish) => (
            <MenuItemCard
              key={dish.id}
              dish={dish}
              isSelected={selectedDish?.id === dish.id}
              onPress={() => handleDishSelect(dish)}
              showScore={true}
            />
          ))}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueSection}>
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !isDishSelected && styles.continueButtonDisabled
          ]}
          onPress={isDishSelected && selectedDish ? () => onContinue(selectedDish) : undefined}
          disabled={!isDishSelected}
        >
          <Text style={[
            styles.continueButtonText,
            !isDishSelected && styles.continueButtonTextDisabled
          ]}>
            {isDishSelected ? 'Continue' : 'Select a dish to continue'}
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
  recommendationSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  recommendationTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  dishName: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  featuredCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  reasoningSection: {
    marginBottom: theme.spacing.lg,
  },
  reasoningTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  reasoningText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  newRecommendationButton: {
    alignSelf: 'flex-start',
  },
  newRecommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  selectButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  selectedState: {
    backgroundColor: theme.colors.success + '20',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  selectedText: {
    color: theme.colors.success,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  allRecommendationsSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  continueSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  continueButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  continueButtonTextDisabled: {
    color: theme.colors.text.secondary,
  },
});
