import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingScreen } from '../components/LoadingScreen';
import { SearchBar } from '../components/SearchBar';
import { api } from '../services/api';
import { useStore } from '../store/useStore';

// Utility function to capitalize first letter
const capitalizeText = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

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
    diningOccasion?: string; // 'solo', 'date', 'friends', 'family', 'business'
    freeTextMood?: string; // "I'm feeling adventurous", "celebrating tonight", etc.
  };
  onContinue: (dishes: Recommendation[]) => void;
  onBack: () => void;
}

interface Recommendation {
  id: string | number;
  name: string;
  description: string;
  price?: string | number | null;
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
    hunger?: number;
    friend_boost: number;
  };
  recommendation_reason: string;
  friend_recommendation?: string;
  explanations?: string[]; // Raw explanations array from backend
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
  const [showRationaleModal, setShowRationaleModal] = useState(false);
  const [selectedRationale, setSelectedRationale] = useState<string>('');

  // Helper functions defined first
  const hasUserHadDish = (dishName: string) => {
    if (!user?.favorite_dishes) return false;
    
    return user.favorite_dishes.some(favorite => 
      favorite.dish_name.toLowerCase() === dishName.toLowerCase()
    );
  };

  const getTopRecommendation = (recommendations: Recommendation[]) => {
    if (!recommendations || recommendations.length === 0) return null;
    // Find first recommendation that user hasn't already had
    for (const recommendation of recommendations) {
      if (!hasUserHadDish(recommendation.name)) {
        return recommendation;
      }
    }
    // If all dishes have been had, return the first one
    return recommendations[0];
  };

  const filterRecommendationsByMealStructure = (recs: Recommendation[], mealStructure: string): Recommendation[] => {
    if (!recs || recs.length === 0) return recs;
    
    const courseMap: { [key: string]: Recommendation[] } = {};
    
    // Group recommendations by course
    recs.forEach(rec => {
      const course = (rec.category || 'main').toLowerCase();
      if (!courseMap[course]) {
        courseMap[course] = [];
      }
      courseMap[course].push(rec);
    });
    
    // Sort each course by recommendation score
    Object.keys(courseMap).forEach(course => {
      courseMap[course].sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
    });
    
    const result: Recommendation[] = [];
    
    // Select recommendations based on meal structure
    switch (mealStructure) {
      case 'main':
        // Just one main course
        if (courseMap['main'] && courseMap['main'].length > 0) {
          result.push(courseMap['main'][0]);
        } else if (courseMap['main course'] && courseMap['main course'].length > 0) {
          result.push(courseMap['main course'][0]);
        }
        break;
        
      case 'main+starter':
        // One starter and one main
        if (courseMap['starter'] && courseMap['starter'].length > 0) {
          result.push(courseMap['starter'][0]);
        } else if (courseMap['appetizer'] && courseMap['appetizer'].length > 0) {
          result.push(courseMap['appetizer'][0]);
        }
        if (courseMap['main'] && courseMap['main'].length > 0) {
          result.push(courseMap['main'][0]);
        } else if (courseMap['main course'] && courseMap['main course'].length > 0) {
          result.push(courseMap['main course'][0]);
        }
        break;
        
      case 'share':
        // One shareable dish
        const shareableRecs = recs.filter(rec => {
          const desc = (rec.description || '').toLowerCase();
          const name = (rec.name || '').toLowerCase();
          return desc.includes('share') || desc.includes('platter') || desc.includes('for two') || 
                 name.includes('share') || name.includes('platter');
        });
        if (shareableRecs.length > 0) {
          shareableRecs.sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
          result.push(shareableRecs[0]);
        } else {
          // Fallback to main if no shareable dishes
          if (courseMap['main'] && courseMap['main'].length > 0) {
            result.push(courseMap['main'][0]);
          }
        }
        break;
        
      default:
        // Default to just main
        if (courseMap['main'] && courseMap['main'].length > 0) {
          result.push(courseMap['main'][0]);
        }
    }
    
    // If no results found, return top recommendation overall
    if (result.length === 0 && recs.length > 0) {
      const sorted = [...recs].sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
      result.push(sorted[0]);
    }
    
    return result;
  };

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
          spiceTolerance: user?.spice_tolerance || 3,
          diningOccasion: userPreferences.diningOccasion,
          freeTextMood: userPreferences.freeTextMood,
        },
        [] // friendSelections - empty for now
      );

      console.log('✅ Smart recommendations received:', response);
      console.log('📊 Response structure:', {
        hasRecommendations: !!response.recommendations,
        recommendationsLength: response.recommendations?.length || 0,
        dietaryConstraints: userDietaryConstraints,
        favoriteDishesCount: userFavoriteDishes.length,
        fullResponse: JSON.stringify(response, null, 2)
      });
      
      // Check for different possible response structures
      const rawRecs = response.recommendations || response.dishes || response.data || [];
      
      console.log('🔍 Raw recommendations:', rawRecs);
      console.log('🔍 Raw recommendations length:', rawRecs.length);

      // Normalize backend payload into the UI shape (backend may return different keys)
      const newRecommendations: Recommendation[] = (rawRecs || []).map((r: any, idx: number) => {
        const explanations = Array.isArray(r?.explanations) ? r.explanations : [];
        const reasonFromExplanations =
          explanations.length > 0 ? explanations.slice(0, 3).join(' | ') : '';

        // Map components to score_breakdown
        const components = r?.score_breakdown ?? r?.components ?? {};
        const scoreBreakdown = {
          customer_praise: components.sentiment ?? components.customer_praise ?? 0,
          taste_compatibility: components.personal_taste ?? components.taste_compatibility ?? 0,
          craving_match: components.craving ?? components.craving_match ?? 0,
          hunger: components.hunger ?? 0,
          friend_boost: components.friend ?? components.friend_boost ?? 0,
        };

        return {
          id: r?.id ?? `${restaurant.place_id}-${idx}`,
          name: r?.name ?? 'Unknown dish',
          description: r?.description ?? '',
          price: r?.price ?? null,
          category: r?.category ?? 'main',
          dietary_tags: r?.dietary_tags ?? [],
          ingredients: r?.ingredients ?? [],
          avg_rating: r?.avg_rating,
          source: r?.source ?? 'smart',
          recommendation_score: r?.score ?? r?.recommendation_score ?? 0,
          score_breakdown: scoreBreakdown,
          recommendation_reason:
            r?.recommendation_reason ??
            r?.reason ??
            reasonFromExplanations ??
            'Matches your preferences | Popular pick | Good fit for tonight',
          friend_recommendation: r?.friend_recommendation,
          explanations: explanations, // Store raw explanations array for formatRecommendationReason
        };
      });
      console.log('📦 Normalized recommendations:', newRecommendations);
      console.log('📦 Normalized recommendations length:', newRecommendations.length);
      
      // Store all recommendations for "Other recommendations" section
      setRecommendations(newRecommendations);
      
      // Agent already handles meal composition — show all recommendations
      setFilteredRecommendations(newRecommendations);

      // Auto-select the top recommendation (skip dishes user has already had)
      if (newRecommendations.length > 0) {
        const topRecommendation = getTopRecommendation(newRecommendations);
        if (topRecommendation) {
          setSelectedDish(topRecommendation);
          console.log('🎯 Selected top recommendation:', topRecommendation.name, 'User had before:', hasUserHadDish(topRecommendation.name));
        } else {
          console.log('⚠️ getTopRecommendation returned null even though we have recommendations');
        }
      } else {
        console.log('⚠️ No recommendations received after normalization');
        console.log('⚠️ Raw response:', JSON.stringify(response, null, 2));
        console.log('⚠️ Raw recs length:', rawRecs.length);
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

  const formatRecommendationReason = (recommendation: Recommendation) => {
    // Use explanations array from backend if available (most descriptive)
    if (recommendation.explanations && Array.isArray(recommendation.explanations) && recommendation.explanations.length > 0) {
      return recommendation.explanations.slice(0, 3);
    }
    
    // Fallback: try to parse from recommendation_reason string
    const reason = recommendation.recommendation_reason || '';
    if (!reason) {
      return ["Matches your preferences", "Popular choice", "Good fit for tonight"];
    }
    
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
        if (cleaned.startsWith("because it's ")) {
          cleaned = "because " + cleaned.substring(13);
        }
        if (cleaned.startsWith("it's ")) {
          cleaned = cleaned.substring(5);
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


  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
          </View>
        </SafeAreaView>
        <LoadingScreen
          restaurantName={restaurant.name}
          cravings={userPreferences.selectedCravings}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
        </View>
      </SafeAreaView>
      
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search dishes..."
        />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {recommendations.length === 0 ? (
          <View style={styles.noResultsSection}>
            <Text style={styles.noResultsText}>
              No recommendations available. Please try again or adjust your preferences.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.picksTitle}>Your picks</Text>
            <Text style={styles.picksSubtitle}>Tap to select what you're ordering</Text>

            {filteredRecommendations.map((dish) => {
              const isSelected = selectedDishes.some(d => d.id === dish.id);
              const reasons = formatRecommendationReason(dish);
              const reasonText = reasons.length > 0 ? `"${reasons[0]}"` : '';
              const courseRole = (dish as any).course_role || dish.category || 'main';
              const isDiscovery = (dish as any).is_discovery === true;

              return (
                <TouchableOpacity
                  key={dish.id}
                  activeOpacity={0.7}
                  onPress={() => handleDishSelect(dish)}
                  style={[
                    styles.dishCard,
                    isSelected && styles.dishCardSelected,
                  ]}
                >
                  {/* Selection circle */}
                  <View style={[
                    styles.selectCircle,
                    isSelected && styles.selectCircleFilled,
                  ]}>
                    {isSelected && <Text style={styles.selectCheck}>{'✓'}</Text>}
                  </View>

                  {/* Dish content */}
                  <View style={styles.dishContent}>
                    <View style={styles.dishMeta}>
                      <Text style={styles.dishCategory}>
                        {capitalizeText(courseRole)}
                      </Text>
                      {isDiscovery && (
                        <Text style={styles.discoveryBadge}>NEW FOR YOU</Text>
                      )}
                    </View>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    {dish.description ? (
                      <Text style={styles.dishDescription} numberOfLines={2}>
                        {dish.description}
                      </Text>
                    ) : null}
                    {reasonText ? (
                      <Text style={styles.dishReason} numberOfLines={2}>
                        {reasonText}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
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

      {/* Rationale Modal */}
      <Modal
        visible={showRationaleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRationaleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRationaleModal(false)}>
              <Text style={styles.modalCancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Score Breakdown</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.rationaleText}>{selectedRationale}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAFAF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#1C1917',
  },
  headerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#1C1917',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 12,
    flexShrink: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  picksTitle: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 22,
    color: '#1A1A1A',
    marginBottom: 4,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  picksSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  dishCard: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 14,
    alignItems: 'flex-start',
  },
  dishCardSelected: {
    borderLeftWidth: 3,
    borderLeftColor: '#E9323D',
    backgroundColor: '#FEFAFA',
  },
  selectCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  selectCircleFilled: {
    backgroundColor: '#E9323D',
    borderColor: '#E9323D',
  },
  selectCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  dishContent: {
    flex: 1,
  },
  dishMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dishCategory: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1B2541',
    textTransform: 'uppercase',
  },
  discoveryBadge: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#E9323D',
    textTransform: 'uppercase',
  },
  dishName: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 20,
    color: '#1A1A1A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  dishDescription: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
    marginBottom: 8,
  },
  dishReason: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#E9323D',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  continueSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
  },
  continueButton: {
    backgroundColor: '#1C1917',
    borderRadius: 0,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  continueButtonText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  continueButtonDisabled: {
    backgroundColor: '#E7E5E4',
    opacity: 0.6,
  },
  continueButtonTextDisabled: {
    color: '#5A4D48',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  noResultsSection: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#5A4D48',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
  },
  modalCancelButton: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    color: '#E9323D',
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#1C1917',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  rationaleText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#1C1917',
    lineHeight: 24,
  },
});
