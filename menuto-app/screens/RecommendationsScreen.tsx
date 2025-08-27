import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { ParsedDish, FavoriteRestaurant } from '../types';
import { generateMockRecommendations } from '../services/mockRecommendations';
import { theme } from '../theme';

interface Props {
  restaurant: FavoriteRestaurant;
  onDishSelect: (dish: ParsedDish) => void;
  onBack: () => void;
}

// Helper function to generate personalized recommendation reasons
const generatePersonalizedReason = (menuItem: any, userFavorites: any[]) => {
  const itemName = menuItem.name.toLowerCase();
  const itemDesc = (menuItem.description || '').toLowerCase();
  
  // Check for direct matches with user's favorites
  for (const fav of userFavorites) {
    const favName = (fav.dish_name || '').toLowerCase();
    
    // Direct name similarity
    if (favName.includes(itemName) || itemName.includes(favName)) {
      return `Similar to your favorite ${fav.dish_name}!`;
    }
    
    // Cuisine/style similarity
    if (favName.includes('curry') && (itemName.includes('curry') || itemDesc.includes('curry'))) {
      return `Another delicious curry like your favorite ${fav.dish_name}.`;
    }
    
    if (favName.includes('chicken') && itemName.includes('chicken')) {
      return `Perfect match - you love chicken dishes like ${fav.dish_name}!`;
    }
  }
  
  // Check customer sentiment for default reasons
  if (menuItem.customer_sentiment === 'positive') {
    return 'Highly praised by customers - sounds delicious!';
  }
  
  return 'Popular choice at this restaurant based on customer reviews.';
};

export function RecommendationsScreen({ restaurant, onDishSelect, onBack }: Props) {
  const { user } = useStore();
  const [recommendations, setRecommendations] = useState<ParsedDish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [explanations, setExplanations] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadRecommendations();
  }, [restaurant, user]);

  const loadRecommendations = async () => {
    setIsLoading(true);

    try {
      console.log('🤖 Loading smart recommendations for:', restaurant.name);
      
      // Convert user's favorite dishes to the expected format
      const userFavoriteDishes = (user?.favorite_dishes || []).map(dish => ({
        dish_name: dish.dish_name,
        restaurant_name: dish.restaurant_id,
        dessert_name: dish.dessert_name
      }));

      // Get user's dietary constraints from preferences
      const userDietaryConstraints = user?.dietary_restrictions || [];
      
      // Use the new smart recommendations algorithm
      const smartResult = await api.getSmartRecommendationsNew(
        restaurant.place_id,
        restaurant.name,
        userFavoriteDishes,
        userDietaryConstraints
      );

      const smartRecommendations = smartResult.recommendations || [];
      
      // Convert to expected format for the UI
      const formattedRecommendations = smartRecommendations.map((item: any) => ({
        ...item,
        avg_rating: item.recommendation_score ? (item.recommendation_score / 20) : 4.2, // Convert 0-100 score to 0-5 rating
        recommendation_reason: item.recommendation_reason || item.reason || "Recommended based on smart analysis"
      }));

      setRecommendations(formattedRecommendations);
    } catch (error) {
      console.error('Smart recommendations error:', error);
      Alert.alert(
        'Error', 
        'Failed to generate recommendations. Please try again.',
        [
          { text: 'Retry', onPress: loadRecommendations },
          { text: 'Back', onPress: onBack }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateContext = () => {
    loadRecommendations();
  };

  const handleExplainRecommendation = async (dish: ParsedDish) => {
    try {
      console.log('💭 Getting explanation for:', dish.name);
      
      const explanationResult = await api.explainRecommendation(dish);
      const explanation = explanationResult.explanation;
      
      setExplanations(prev => ({
        ...prev,
        [dish.id]: explanation
      }));
      
      // Show explanation in alert for now
      Alert.alert(
        `Why we recommended "${explanation.dish_name}"`,
        `Score: ${explanation.total_score}/100\n\n` +
        explanation.factors.map((factor: any) => 
          `${factor.factor}: ${factor.description}`
        ).join('\n\n'),
        [{ text: 'Got it!' }]
      );
    } catch (error) {
      console.error('Explanation error:', error);
      Alert.alert(
        'Explanation unavailable',
        'We could not get the explanation for this recommendation right now.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderDishCard = (dish: ParsedDish, index: number) => (
    <TouchableOpacity
      key={dish.id}
      style={styles.dishCard}
      onPress={() => onDishSelect(dish)}
    >
      <View style={styles.dishHeader}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishPrice}>${dish.price}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{dish.avg_rating?.toFixed(1) || '4.0'}</Text>
          <Text style={styles.scoreLabel}>★</Text>
        </View>
      </View>
      
      {dish.description && (
        <Text style={styles.dishDescription} numberOfLines={2}>
          {dish.description}
        </Text>
      )}
      
      
      <View style={styles.tags}>
        {dish.dietary_tags?.map(tag => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.rankText}>#{index + 1} for you</Text>
      </View>
    </TouchableOpacity>
  );


  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Getting your recommendations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (recommendations.length === 0 && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No recommendations available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onBack}>
            <Text style={styles.retryButtonText}>Back to Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.subtitle}>Real menu items just for you</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.recommendationsHeader}>
          <Text style={styles.recommendationsTitle}>
            Actual Menu Items
          </Text>
          <Text style={styles.recommendationsSubtitle}>
            From customer reviews & our database, personalized for your taste
          </Text>
        </View>
        
        <View style={styles.dishList}>
          {recommendations.map((dish, index) => 
            renderDishCard(dish, index)
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cuisineType: {
    fontSize: 14,
    color: '#7F8C8D',
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
  },
  recommendationsHeader: {
    padding: 20,
    paddingBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  recommendationsSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  dishList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dishCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  dishPrice: {
    fontSize: 16,
    color: '#2ECC71',
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  dishDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    lineHeight: 20,
  },
  explanation: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#E8F6F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: '#2ECC71',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whyButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  whyButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 12,
    color: '#BDC3C7',
  },
  rankText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
});