import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

// ─── Design tokens ───────────────────────────────────────────────────
const TERRA = '#E9323D';
const RED = '#E9323D';
const BG = '#FFFFFF';
const DARK = '#1C1917';
const MUTED = '#5A4D48';
const LIGHT = '#8C7E77';
const STONE_50 = '#FAFAF9';
const STONE_100 = '#F5F5F4';
const STONE_200 = '#E7E5E4';
const FONT = 'DMSans-Regular';
const FONT_MEDIUM = 'DMSans-Medium';
const FONT_SEMIBOLD = 'DMSans-SemiBold';
const FONT_BOLD = 'DMSans-Bold';
const FONT_MONO = 'DMSans-Bold';
const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
};

// ─── Types ────────────────────────────────────────────────────────────
interface PostMealFeedbackProps {
  dish: {
    id: number;
    name: string;
    description: string;
    restaurant: string;
    restaurantPlaceId?: string;
    scoreBreakdown?: Record<string, number>;
  };
  onComplete: (rating: number, feedback: string) => void;
  onBack: () => void;
}

// ─── Quick tag sets ───────────────────────────────────────────────────
const POSITIVE_TAGS = [
  'Great flavor',
  'Perfect portion',
  'Would order again',
  'Best dish here',
  'Great value',
];

const NEGATIVE_TAGS = [
  'Too spicy',
  'Too bland',
  'Too salty',
  'Overcooked',
  'Small portion',
  'Not as described',
  'Too expensive',
];

// ─── Rating labels ────────────────────────────────────────────────────
const RATING_LABELS: Record<number, string> = {
  1: 'Not for me',
  2: 'Meh',
  3: 'Decent',
  4: 'Really good',
  5: 'Outstanding!',
};

// ─── Component ────────────────────────────────────────────────────────
export const PostMealFeedback: React.FC<PostMealFeedbackProps> = ({
  dish,
  onComplete,
  onBack,
}) => {
  const { user, setUser, userId } = useStore();

  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wouldOrderAgain, setWouldOrderAgain] = useState<boolean | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scale animations for each star
  const scaleAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  // ── Star tap handler ──────────────────────────────────────────────
  const handleStarPress = useCallback(
    (star: number) => {
      setRating(star);
      // Reset tags when rating bucket changes (positive <-> negative)
      const wasPositive = rating >= 4;
      const isPositive = star >= 4;
      if (wasPositive !== isPositive) {
        setSelectedTags([]);
      }
      // Bounce animation
      Animated.sequence([
        Animated.timing(scaleAnims[star - 1], {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[star - 1], {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [rating, scaleAnims],
  );

  // ── Tag toggle ────────────────────────────────────────────────────
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  // ── Silent favorites for 4-5 star ratings ─────────────────────────
  const silentlyAddToFavorites = useCallback(() => {
    if (!user || !userId || rating < 4) return;

    // Build one merged update to avoid overwriting
    let updatedUser = { ...user };

    // Add dish to favorites
    const existingDishes = updatedUser.favorite_dishes || [];
    const alreadyFav = existingDishes.some(
      (f) => f.dish_name === dish.name && f.restaurant_id === dish.restaurant,
    );
    if (!alreadyFav) {
      updatedUser.favorite_dishes = [
        ...existingDishes,
        {
          dish_name: dish.name,
          restaurant_id: dish.restaurantPlaceId || dish.restaurant,
          rating,
        },
      ];
    }

    // Add restaurant to favorites
    const existingRests = updatedUser.favorite_restaurants || [];
    const restAlreadyFav = existingRests.some((r) => r.name === dish.restaurant);
    if (!restAlreadyFav) {
      updatedUser.favorite_restaurants = [
        ...existingRests,
        {
          place_id:
            dish.restaurantPlaceId ||
            `temp_${dish.restaurant.replace(/\s+/g, '_').toLowerCase()}`,
          name: dish.restaurant,
          vicinity: 'Location not available',
          cuisine_type: 'Restaurant',
        },
      ];
    }

    // Single setUser call with both updates
    setUser(updatedUser, userId);
  }, [user, userId, rating, dish, setUser]);

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (rating === 0 || isSubmitting) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      // Build combined feedback text
      const parts: string[] = [];
      if (selectedTags.length > 0) parts.push(selectedTags.join(', '));
      if (notes.trim()) parts.push(notes.trim());
      const feedbackText = parts.join(' | ');

      // 1. Track dish rating
      if (dish.restaurantPlaceId && dish.id) {
        await api
          .trackDishRating(
            String(dish.id),
            dish.restaurantPlaceId,
            rating,
            wouldOrderAgain ?? rating >= 4,
            feedbackText || undefined,
          )
          .catch((err) => console.warn('Failed to track rating:', err));
      }

      // 2. Send Thompson Sampling feedback if we have component scores
      if (dish.scoreBreakdown && dish.restaurantPlaceId) {
        try {
          const token = await (async () => {
            // reuse the same getAuthToken pattern from api.ts
            const { supabase } = require('../services/supabase');
            const {
              data: { session },
            } = await supabase.auth.getSession();
            return session?.access_token ?? null;
          })();

          const API_BASE =
            process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8080';

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          await fetch(`${API_BASE}/smart-recommendations/feedback`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              dish_id: String(dish.id),
              restaurant_place_id: dish.restaurantPlaceId,
              rating,
              score_breakdown: dish.scoreBreakdown,
            }),
          });
        } catch (err) {
          console.warn('Failed to send Thompson Sampling feedback:', err);
        }
      }

      // 3. Silently add to favorites for high ratings
      silentlyAddToFavorites();

      // 4. Complete
      await onComplete(rating, feedbackText);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    rating,
    isSubmitting,
    selectedTags,
    notes,
    dish,
    wouldOrderAgain,
    silentlyAddToFavorites,
    onComplete,
  ]);

  // ── Derived state ─────────────────────────────────────────────────
  const tags = rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;
  const showTags = rating > 0;
  const canSubmit = rating > 0 && !isSubmitting;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>How was it?</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Dish Card ────────────────────────────────────────── */}
          <View style={styles.dishCard}>
            <Text style={styles.restaurantName}>{dish.restaurant}</Text>
            <Text style={styles.dishName}>{dish.name}</Text>
            {dish.description ? (
              <Text style={styles.dishDescription}>{dish.description}</Text>
            ) : null}
          </View>

          {/* ── Star Rating ──────────────────────────────────────── */}
          <View style={styles.ratingSection}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= rating;
                return (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => handleStarPress(star)}
                    style={styles.starTouchable}
                  >
                    <Animated.View
                      style={[
                        styles.starCircle,
                        filled ? styles.starCircleFilled : styles.starCircleEmpty,
                        { transform: [{ scale: scaleAnims[star - 1] }] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.starIcon,
                          filled
                            ? styles.starIconFilled
                            : styles.starIconEmpty,
                        ]}
                      >
                        {'\u2605'}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}
          </View>

          {/* ── Quick Tags ───────────────────────────────────────── */}
          {showTags && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsWrap}>
                {tags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                      style={[
                        styles.tag,
                        active ? styles.tagActive : styles.tagInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          active ? styles.tagTextActive : styles.tagTextInactive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Would Order Again ────────────────────────────────── */}
          {rating > 0 && (
            <View style={styles.orderAgainSection}>
              <Text style={styles.orderAgainLabel}>
                Would you order this again?
              </Text>
              <View style={styles.orderAgainRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWouldOrderAgain(true)}
                  style={[
                    styles.orderAgainBtn,
                    wouldOrderAgain === true
                      ? styles.orderAgainBtnActive
                      : styles.orderAgainBtnInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.orderAgainBtnText,
                      wouldOrderAgain === true
                        ? styles.orderAgainBtnTextActive
                        : styles.orderAgainBtnTextInactive,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWouldOrderAgain(false)}
                  style={[
                    styles.orderAgainBtn,
                    wouldOrderAgain === false
                      ? styles.orderAgainBtnActive
                      : styles.orderAgainBtnInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.orderAgainBtnText,
                      wouldOrderAgain === false
                        ? styles.orderAgainBtnTextActive
                        : styles.orderAgainBtnTextInactive,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Notes (expandable) ───────────────────────────────── */}
          {rating > 0 && (
            <View style={styles.notesSection}>
              {!notesExpanded ? (
                <TouchableOpacity
                  onPress={() => setNotesExpanded(true)}
                  activeOpacity={0.7}
                  style={styles.addNoteBtn}
                >
                  <Text style={styles.addNoteBtnText}>+ Add a note</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notesCard}>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any other thoughts? This helps us learn your taste..."
                    placeholderTextColor={LIGHT}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>
              )}
            </View>
          )}

          {/* Bottom spacer for fixed button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Submit Button (fixed) ──────────────────────────────── */}
        <View style={styles.submitWrapper}>
          <TouchableOpacity
            activeOpacity={canSubmit ? 0.8 : 1}
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Saving...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: STONE_50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: DARK,
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 28,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: DARK,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Dish card
  dishCard: {
    backgroundColor: STONE_50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: STONE_100,
    padding: 20,
    marginBottom: 28,
    ...SHADOW,
  },
  restaurantName: {
    fontSize: 12,
    fontFamily: FONT,
    fontStyle: 'italic',
    color: LIGHT,
    marginBottom: 6,
  },
  dishName: {
    fontSize: 18,
    fontFamily: FONT_MONO,
    color: DARK,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dishDescription: {
    fontSize: 14,
    fontFamily: FONT,
    color: MUTED,
    lineHeight: 20,
  },

  // Star rating
  ratingSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  starTouchable: {
    padding: 2,
  },
  starCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starCircleEmpty: {
    backgroundColor: STONE_50,
    borderWidth: 1.5,
    borderColor: STONE_200,
  },
  starCircleFilled: {
    backgroundColor: TERRA,
    borderWidth: 0,
  },
  starIcon: {
    fontSize: 24,
    marginTop: Platform.OS === 'ios' ? 1 : 0,
  },
  starIconEmpty: {
    color: STONE_200,
  },
  starIconFilled: {
    color: '#FFFFFF',
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
    color: TERRA,
  },

  // Quick tags
  tagsSection: {
    marginBottom: 28,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  tagActive: {
    backgroundColor: TERRA,
  },
  tagInactive: {
    backgroundColor: STONE_50,
    borderWidth: 1,
    borderColor: STONE_200,
  },
  tagText: {
    fontSize: 14,
    fontFamily: FONT_MEDIUM,
    fontWeight: '500',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
  tagTextInactive: {
    color: MUTED,
  },

  // Would order again
  orderAgainSection: {
    marginBottom: 28,
  },
  orderAgainLabel: {
    fontSize: 16,
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
    color: DARK,
    marginBottom: 12,
    textAlign: 'center',
  },
  orderAgainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  orderAgainBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 100,
    minWidth: 100,
    alignItems: 'center',
  },
  orderAgainBtnActive: {
    backgroundColor: TERRA,
  },
  orderAgainBtnInactive: {
    backgroundColor: STONE_50,
    borderWidth: 1,
    borderColor: STONE_200,
  },
  orderAgainBtnText: {
    fontSize: 14,
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
  },
  orderAgainBtnTextActive: {
    color: '#FFFFFF',
  },
  orderAgainBtnTextInactive: {
    color: MUTED,
  },

  // Notes
  notesSection: {
    marginBottom: 28,
  },
  addNoteBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  addNoteBtnText: {
    fontSize: 14,
    fontFamily: FONT_MEDIUM,
    fontWeight: '500',
    color: MUTED,
  },
  notesCard: {
    backgroundColor: STONE_50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STONE_100,
    padding: 16,
  },
  notesInput: {
    fontSize: 14,
    fontFamily: FONT,
    color: DARK,
    minHeight: 80,
    lineHeight: 22,
  },

  // Submit button
  submitWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    paddingTop: 12,
    backgroundColor: BG,
  },
  submitBtn: {
    backgroundColor: DARK,
    borderRadius: 100,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 18,
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
