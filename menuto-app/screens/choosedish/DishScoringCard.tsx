import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ParsedDish } from '../../types';

const TERRA = '#CE3E25';

interface DishScoringCardProps {
  menuDishes: ParsedDish[];
  isLoadingMenu: boolean;
  menuFound: boolean;
  onAddPhoto: () => void;
  onAddMenuLink: () => void;
  onPasteMenuText: () => void;
  onReviewMenu?: () => void;
}

const LOADING_MESSAGES = [
  'Reading menu...',
  'Extracting dishes...',
  'Almost done...',
];

function AnimatedLoadingText() {
  const [messageIndex, setMessageIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) =>
          prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
        );
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [opacity]);

  return (
    <Animated.Text style={[styles.loadingMessage, { opacity }]}>
      {LOADING_MESSAGES[messageIndex]}
    </Animated.Text>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { opacity: dot }]}
        />
      ))}
    </View>
  );
}

export function DishScoringCard({
  menuDishes,
  isLoadingMenu,
  menuFound,
  onAddPhoto,
  onAddMenuLink,
  onPasteMenuText,
  onReviewMenu,
}: DishScoringCardProps) {
  // Loading state
  if (isLoadingMenu) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <LoadingDots />
          <AnimatedLoadingText />
        </View>
      </View>
    );
  }

  // Menu found state
  if (menuFound && menuDishes.length > 0) {
    return (
      <View style={styles.card}>
        <View style={styles.menuFoundRow}>
          <View style={styles.menuFoundLeft}>
            <Text style={styles.checkmark}>&#x2713;</Text>
            <Text style={styles.menuFoundText}>
              Menu found{' '}
              <Text style={styles.menuFoundCount}>
                &middot; {menuDishes.length} dishes
              </Text>
            </Text>
          </View>
          {onReviewMenu && (
            <TouchableOpacity onPress={onReviewMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.reviewLink}>Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // No menu state — two big buttons + text link
  return (
    <View style={styles.card}>
      <Text style={styles.noMenuTitle}>Add menu to get started</Text>
      <Text style={styles.noMenuSubtitle}>
        We need the menu to recommend dishes for you.
      </Text>

      <View style={styles.bigButtonsRow}>
        <TouchableOpacity style={styles.bigButton} onPress={onAddPhoto} activeOpacity={0.7}>
          <Text style={styles.bigButtonEmoji}>&#x1F4F7;</Text>
          <Text style={styles.bigButtonLabel}>Snap menu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bigButton} onPress={onAddMenuLink} activeOpacity={0.7}>
          <Text style={styles.bigButtonEmoji}>&#x1F517;</Text>
          <Text style={styles.bigButtonLabel}>Paste link</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onPasteMenuText} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.pasteTextLink}>Or paste menu text</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FAFAF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  // Loading state
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TERRA,
  },
  loadingMessage: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#44403C',
    letterSpacing: -0.3,
  },

  // Menu found state
  menuFoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuFoundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: '#22C55E',
    fontFamily: 'DMSans-Bold',
  },
  menuFoundText: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#1C1917',
  },
  menuFoundCount: {
    color: '#78716C',
    fontFamily: 'DMSans-Regular',
  },
  reviewLink: {
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    color: TERRA,
    textDecorationLine: 'underline',
  },

  // No menu state
  noMenuTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  noMenuSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#78716C',
    marginBottom: 20,
    lineHeight: 20,
  },
  bigButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bigButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  bigButtonEmoji: {
    fontSize: 24,
  },
  bigButtonLabel: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
  },
  pasteTextLink: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: '#A8A29E',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
