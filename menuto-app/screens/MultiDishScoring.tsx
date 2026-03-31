import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

const RED = '#E9323D';

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
  score_breakdown: Record<string, number>;
  recommendation_reason: string;
  friend_recommendation?: string;
}

interface Props {
  restaurant: { place_id: string; name: string; cuisine_type?: string };
  selectedDishes: Recommendation[];
  onComplete: (dishes: Recommendation[], addToFavorites: boolean[]) => void;
  onBack: () => void;
}

export const MultiDishScoring: React.FC<Props> = ({
  restaurant, selectedDishes, onComplete, onBack,
}) => {
  const { user, userId } = useStore();
  const insets = useSafeAreaInsets();
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const allRated = selectedDishes.every(d => ratings[d.id]);

  const handleComplete = async () => {
    if (!allRated) {
      Alert.alert('Rate all dishes', 'Please rate every dish before continuing.');
      return;
    }
    try {
      for (const dish of selectedDishes) {
        if (ratings[dish.id]) {
          await api.trackDishRating(
            String(dish.id), restaurant.place_id, ratings[dish.id],
            favorites[dish.id] || false, feedback[dish.id] || undefined,
          ).catch(() => {});
        }
      }

      // Add restaurant + favorite dishes
      let updatedUser = { ...user };
      const existingRests = updatedUser?.favorite_restaurants || [];
      if (!existingRests.some(r => r.place_id === restaurant.place_id)) {
        updatedUser.favorite_restaurants = [...existingRests, {
          place_id: restaurant.place_id, name: restaurant.name,
          vicinity: '', cuisine_type: restaurant.cuisine_type || 'Restaurant',
        }];
      }
      const existingDishes = updatedUser?.favorite_dishes || [];
      for (const dish of selectedDishes) {
        if (favorites[dish.id] && !existingDishes.some(f => f.dish_name === dish.name)) {
          existingDishes.push({ dish_name: dish.name, restaurant_id: restaurant.place_id });
        }
      }
      updatedUser.favorite_dishes = existingDishes;
      const { setUser } = useStore.getState();
      setUser(updatedUser, userId!);

      onComplete(selectedDishes, selectedDishes.map(d => favorites[d.id] || false));
    } catch (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate your dishes</Text>
        <Text style={styles.headerSubtitle}>{restaurant.name}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {selectedDishes.map((dish, index) => {
          const r = ratings[dish.id] || 0;
          const isFav = favorites[dish.id] || false;
          const showNotes = expandedNotes[dish.id] || false;

          return (
            <View key={dish.id} style={styles.dishSection}>
              {/* Dish info */}
              <View style={styles.dishHeader}>
                <Text style={styles.dishNum}>{index + 1}</Text>
                <View style={styles.dishInfo}>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  {dish.description ? (
                    <Text style={styles.dishDesc} numberOfLines={1}>{dish.description}</Text>
                  ) : null}
                </View>
              </View>

              {/* Stars — inline, small */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatings(prev => ({ ...prev, [dish.id]: star }))}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={[styles.star, star <= r && styles.starFilled]}>★</Text>
                  </TouchableOpacity>
                ))}
                {r > 0 && (
                  <Text style={styles.ratingLabel}>
                    {r <= 2 ? 'Meh' : r === 3 ? 'Decent' : r === 4 ? 'Good' : 'Great'}
                  </Text>
                )}
              </View>

              {/* Favorite + Notes — compact row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={() => setFavorites(prev => ({ ...prev, [dish.id]: !prev[dish.id] }))}
                  style={[styles.favBtn, isFav && styles.favBtnActive]}
                >
                  <Text style={[styles.favBtnText, isFav && styles.favBtnTextActive]}>
                    {isFav ? '♥ Saved' : '♡ Save'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setExpandedNotes(prev => ({ ...prev, [dish.id]: !prev[dish.id] }))}
                >
                  <Text style={styles.noteLink}>
                    {showNotes ? '− Hide note' : '+ Add note'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Expandable notes */}
              {showNotes && (
                <TextInput
                  style={styles.noteInput}
                  value={feedback[dish.id] || ''}
                  onChangeText={text => setFeedback(prev => ({ ...prev, [dish.id]: text }))}
                  placeholder="What did you think?"
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Submit */}
      <View style={[styles.submitWrapper, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, !allRated && styles.submitBtnDisabled]}
          onPress={handleComplete}
          disabled={!allRated}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {allRated ? 'DONE' : `RATE ${selectedDishes.length - Object.keys(ratings).length} MORE`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { marginBottom: 16 },
  backText: { fontFamily: 'DMSans-Bold', fontSize: 10, letterSpacing: 3, color: '#666666', textTransform: 'uppercase' },
  headerTitle: { fontFamily: 'PlayfairDisplay-Italic', fontSize: 28, color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#666666' },

  scrollView: { flex: 1 },

  // Each dish
  dishSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dishHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dishNum: { fontFamily: 'DMSans-Bold', fontSize: 18, color: '#CCCCCC', width: 24, marginTop: 2 },
  dishInfo: { flex: 1 },
  dishName: { fontFamily: 'PlayfairDisplay-Italic', fontSize: 20, color: '#1A1A1A', letterSpacing: -0.3 },
  dishDesc: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#666666', marginTop: 2 },

  // Stars
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 36 },
  star: { fontSize: 24, color: '#E5E5E5' },
  starFilled: { color: RED },
  ratingLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: RED, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },

  // Actions
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 36 },
  favBtn: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 0, paddingHorizontal: 14, paddingVertical: 6 },
  favBtnActive: { borderColor: RED, backgroundColor: '#FEFAFA' },
  favBtnText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#666666' },
  favBtnTextActive: { color: RED },
  noteLink: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#999999' },

  // Notes
  noteInput: {
    marginTop: 12, marginLeft: 36,
    backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 0, padding: 12,
    fontFamily: 'DMSans-Regular', fontSize: 14, color: '#1A1A1A',
    minHeight: 56,
  },

  // Submit
  submitWrapper: {
    paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E5E5',
  },
  submitBtn: { backgroundColor: '#1A1A1A', borderRadius: 0, height: 56, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: 'DMSans-Bold', fontSize: 14, letterSpacing: 2, color: '#FFFFFF', textTransform: 'uppercase' },
});
