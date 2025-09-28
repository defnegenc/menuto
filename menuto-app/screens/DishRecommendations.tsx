import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { LoadingScreen } from '../components/LoadingScreen';
import { MenuItemCard } from '../components/MenuItemCard';
import { SelectionDishCard } from '../components/SelectionDishCard';
import { SearchBar } from '../components/SearchBar';
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
  onContinue: (dishes: Recommendation[]) => void;
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
  const [chosenDish, setChosenDish] = useState<Recommendation | null>(null);
  const [selectedDishes, setSelectedDishes] = useState<Recommendation[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  // Filter recommendations based on search text
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredRecommendations(recommendations);
    } else {
      const filtered = recommendations.filter(dish =>
        dish.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (dish.description && dish.description.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredRecommendations(filtered);
    }
  }, [searchText, recommendations]);

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
      const newRecommendations = response.recommendations || [];
      setRecommendations(newRecommendations);
      setFilteredRecommendations(newRecommendations);
      
      // Auto-select the top recommendation (skip dishes user has already had)
      if (newRecommendations.length > 0) {
        const topRecommendation = getTopRecommendation(newRecommendations);
        setSelectedDish(topRecommendation);
        console.log('🎯 Selected top recommendation:', topRecommendation.name, 'User had before:', hasUserHadDish(topRecommendation.name));
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

  const handleGetNewRecommendation = () => {
    console.log('🔄 Getting next recommendation from existing list...');
    
    // Find the next untried dish from the current recommendations
    const currentIndex = recommendations.findIndex(rec => rec.id === selectedDish?.id);
    const remainingRecommendations = recommendations.slice(currentIndex + 1);
    
    const nextUntriedDish = getTopRecommendation(remainingRecommendations);
    
    if (nextUntriedDish) {
      setSelectedDish(nextUntriedDish);
      setChosenDish(null); // Reset chosen dish
      console.log('🎯 Selected next recommendation:', nextUntriedDish.name, 'User had before:', hasUserHadDish(nextUntriedDish.name));
    } else {
      // If no more untried dishes, show alert
      Alert.alert(
        'All Done!',
        'You\'ve tried all the recommended dishes! Try adjusting your preferences or check back later for new menu items.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDishSelect = (dish: Recommendation) => {
    setSelectedDishes(prev => {
      const isSelected = prev.some(d => d.id === dish.id);
      if (isSelected) {
        return prev.filter(d => d.id !== dish.id);
      } else {
        return [...prev, dish];
      }
    });
  };

  const handleSelectDish = () => {
    if (selectedDish) {
      handleDishSelect(selectedDish);
    }
  };

  const formatRecommendationReason = (reason: string) => {
    // Split by "|" separator (backend now sends 3 bullets separated by |)
    const reasons = reason
      .split('|')
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .slice(0, 3) // Ensure exactly 3 reasons
      .map(r => {
        // Clean up the text
        let cleaned = r.trim();
        
        // Remove "Recommended because it's" prefix if present
        if (cleaned.startsWith("Recommended because it's ")) {
          cleaned = cleaned.substring(25);
        }
        
        // Capitalize first letter
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      });
    
    // Ensure we always have 3 bullets
    while (reasons.length < 3) {
      reasons.push("Matches your preferences");
    }
    
    return reasons;
  };

  const hasUserHadDish = (dishName: string) => {
    if (!user?.favorite_dishes) return false;
    
    return user.favorite_dishes.some(favorite => 
      favorite.dish_name.toLowerCase() === dishName.toLowerCase()
    );
  };

  const getTopRecommendation = (recommendations: Recommendation[]) => {
    // Find first recommendation that user hasn't already had
    for (const recommendation of recommendations) {
      if (!hasUserHadDish(recommendation.name)) {
        return recommendation;
      }
    }
    // If all dishes have been had, return the first one
    return recommendations[0];
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <UnifiedHeader 
          title="Choose Dish" 
          showBackButton={true}
          onBack={onBack}
        />
        <LoadingScreen 
          message="Loading recommendations"
          subMessage="Cooking up something good..."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        title="Choose Dish" 
        showBackButton={true}
        onBack={onBack}
      />
      
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search dishes..."
        />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectedDish && (
          <View style={styles.recommendationSection}>
            <Text style={styles.recommendationTitle}>
              Recommendation: <Text style={styles.dishName}>{selectedDish.name}</Text>
            </Text>
            
            {/* Featured Recommendation Card */}
            <View style={styles.featuredCard}>
              <SelectionDishCard
                dish={{
                  name: selectedDish.name,
                  description: selectedDish.description,
                  score: selectedDish.recommendation_score || 0
                }}
                isSelected={selectedDishes.some(d => d.id === selectedDish?.id)}
                onPress={handleSelectDish}
                showScore={!hasUserHadDish(selectedDish.name)}
              />
            </View>

            {/* Why was this recommended */}
            <View style={styles.reasoningSection}>
              <Text style={styles.reasoningTitle}>Why was this recommended?</Text>
              {formatRecommendationReason(selectedDish.recommendation_reason).map((reason, index) => (
                <Text key={index} style={styles.reasoningText}>
                  {index + 1}. {reason}
                </Text>
              ))}
            </View>


            {/* Get new recommendation button */}
            <TouchableOpacity 
              style={styles.newRecommendationButton}
              onPress={handleGetNewRecommendation}
            >
              <Text style={styles.newRecommendationText}>Get new recommendation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Other recommendations list */}
        <View style={styles.allRecommendationsSection}>
          <Text style={styles.sectionTitle}>
            {searchText ? `Search Results (${filteredRecommendations.length})` : 'Other recommendations'}
          </Text>
          {filteredRecommendations.length > 0 ? (
            filteredRecommendations
              .filter((dish) => dish.id !== selectedDish?.id) // Remove the main recommendation from this list
              .map((dish) => (
                <SelectionDishCard
                  key={dish.id}
                  dish={{
                    name: dish.name,
                    description: dish.description,
                    score: dish.recommendation_score || 0
                  }}
                  isSelected={selectedDishes.some(d => d.id === dish.id)}
                  onPress={() => handleDishSelect(dish)}
                  showScore={!hasUserHadDish(dish.name)}
                />
              ))
          ) : searchText ? (
            <View style={styles.noResultsSection}>
              <Text style={styles.noResultsText}>
                No dishes found matching "{searchText}"
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueSection}>
        <TouchableOpacity 
          style={[
            styles.continueButton,
            selectedDishes.length === 0 && styles.continueButtonDisabled
          ]}
          onPress={selectedDishes.length > 0 ? () => onContinue(selectedDishes) : undefined}
          disabled={selectedDishes.length === 0}
        >
          <Text style={[
            styles.continueButtonText,
            selectedDishes.length === 0 && styles.continueButtonTextDisabled
          ]}>
            {selectedDishes.length === 0 
              ? 'Select Dishes to Continue' 
              : `Continue with ${selectedDishes.length} dish${selectedDishes.length > 1 ? 'es' : ''}`
            }
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
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  featuredCard: {
    marginBottom: theme.spacing.lg,
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
    alignSelf: 'center',
    marginTop: theme.spacing.md,
  },
  newRecommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.secondary,
    textDecorationLine: 'underline',
    fontWeight: '500',
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
  searchSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  noResultsSection: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});
