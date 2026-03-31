import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const RED = '#E9323D';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  restaurantName?: string;
  cravings?: string[];
}

const PHASES = [
  'Scanning the menu',
  'Matching your cravings',
  'Ranking dishes',
  'Plating your choices',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  subMessage,
  restaurantName,
  cravings = [],
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  const [phaseIndex, setPhaseIndex] = useState(0);

  // Gentle float
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, []);

  // Dot pulse
  useEffect(() => {
    const pulse = (d: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(d, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      ]));
    const p1 = pulse(dot1, 0);
    const p2 = pulse(dot2, 200);
    const p3 = pulse(dot3, 400);
    p1.start(); p2.start(); p3.start();
    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, []);

  // Rotate messages
  useEffect(() => {
    if (message) return; // Skip rotation if custom message
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setPhaseIndex((prev) => (prev + 1) % PHASES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [message]);

  const displayCravings = cravings.slice(0, 3);
  const statusText = message || PHASES[phaseIndex];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.floatingBlock, { transform: [{ translateY: floatAnim }] }]}>
        {/* Restaurant name */}
        {restaurantName && (
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        )}

        {/* Craving tags */}
        {displayCravings.length > 0 && (
          <View style={styles.cravingsRow}>
            {displayCravings.map((c, i) => (
              <View key={i} style={styles.cravingTag}>
                <Text style={styles.cravingText}>{c.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dots */}
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
          ))}
        </View>

        {/* Status text */}
        <Animated.Text style={[styles.statusText, { opacity: textOpacity }]}>
          {statusText}
        </Animated.Text>

        {subMessage && !message && (
          <Text style={styles.subText}>{subMessage}</Text>
        )}
      </Animated.View>

      <Text style={styles.bottomText}>This may take a few moments</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
  },
  floatingBlock: {
    alignItems: 'center',
    gap: 16,
  },
  restaurantName: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 32,
    color: '#1A1A1A',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  cravingsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cravingTag: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cravingText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#9CA3AF',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RED,
  },
  statusText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#444444',
    textAlign: 'center',
  },
  subText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  bottomText: {
    position: 'absolute',
    bottom: 40,
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#D1D5DB',
  },
});
