import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { theme } from '../theme';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  dishCount?: number;
  restaurantName?: string;
  cravings?: string[];
}

const PHASES = [
  { status: 'Scanning the menu...', sub: 'Looking through every dish for what you want.' },
  { status: 'Filtering ingredients...', sub: 'Finding that perfect balance you asked for.' },
  { status: 'Matching your vibe...', sub: 'Cross-referencing with local favorites.' },
  { status: 'Plating your choices...', sub: 'Almost there — your picks are ready.' },
];

const CRAVING_COLORS: Record<string, string> = {
  spicy: '#22C55E',
  salty: '#F97316',
  crispy: '#EAB308',
  sweet: '#EC4899',
  savory: '#8B5CF6',
  umami: '#E9323D',
  light: '#06B6D4',
  acidic: '#14B8A6',
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  subMessage,
  dishCount,
  restaurantName,
  cravings = [],
}) => {
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const badge1Anim = useRef(new Animated.Value(0)).current;
  const badge2Anim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  // State
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Get display cravings (max 2)
  const displayCravings = cravings.slice(0, 2);

  // Initial fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Floating icon animation
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    float.start();
    return () => float.stop();
  }, []);

  // Orbit animation (rotating dot)
  useEffect(() => {
    const orbit = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    orbit.start();
    return () => orbit.stop();
  }, []);

  // Scanner line animation
  useEffect(() => {
    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    scan.start();
    return () => scan.stop();
  }, []);

  // Badge bounce animations
  useEffect(() => {
    const bounce1 = Animated.loop(
      Animated.sequence([
        Animated.timing(badge1Anim, {
          toValue: -6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badge1Anim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const bounce2 = Animated.loop(
      Animated.sequence([
        Animated.timing(badge2Anim, {
          toValue: 6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badge2Anim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bounce1.start();
    bounce2.start();
    return () => { bounce1.stop(); bounce2.stop(); };
  }, []);

  // Progress simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Phase transitions
  useEffect(() => {
    const newPhase = Math.min(Math.floor(progress / 25), PHASES.length - 1);
    if (newPhase !== phaseIndex) {
      // Fade out text, switch, fade in
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setPhaseIndex(newPhase);
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [progress]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const orbitRotation = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  const scanOpacity = scanAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const currentPhase = message
    ? { status: message, sub: subMessage || '' }
    : PHASES[phaseIndex];

  const countText = dishCount ? `${dishCount} dishes` : 'the menu';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Central animated icon */}
      <View style={styles.iconArea}>
        {/* Orbiting ring */}
        <Animated.View
          style={[
            styles.orbitRing,
            { transform: [{ rotate: orbitRotation }] },
          ]}
        >
          <View style={styles.orbitDot} />
        </Animated.View>

        {/* Floating icon box */}
        <Animated.View
          style={[
            styles.iconBox,
            { transform: [{ translateY: floatAnim }] },
          ]}
        >
          {/* Scanner line */}
          <Animated.View
            style={[
              styles.scannerLine,
              {
                transform: [{ translateY: scanTranslate }],
                opacity: scanOpacity,
              },
            ]}
          />
          <Text style={styles.iconEmoji}>🍽</Text>
        </Animated.View>

        {/* Floating craving badges */}
        {displayCravings.length > 0 && (
          <Animated.View
            style={[
              styles.badge,
              styles.badgeRight,
              { transform: [{ translateY: badge1Anim }] },
            ]}
          >
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: CRAVING_COLORS[displayCravings[0]] || '#E9323D' },
              ]}
            />
            <Text style={styles.badgeText}>
              {displayCravings[0].charAt(0).toUpperCase() + displayCravings[0].slice(1)}
            </Text>
          </Animated.View>
        )}
        {displayCravings.length > 1 && (
          <Animated.View
            style={[
              styles.badge,
              styles.badgeLeft,
              { transform: [{ translateY: badge2Anim }] },
            ]}
          >
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: CRAVING_COLORS[displayCravings[1]] || '#F97316' },
              ]}
            />
            <Text style={styles.badgeText}>
              {displayCravings[1].charAt(0).toUpperCase() + displayCravings[1].slice(1)}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Status text */}
      <View style={styles.textArea}>
        <Animated.Text style={[styles.statusText, { opacity: textFadeAnim }]}>
          {currentPhase.status}
        </Animated.Text>
        <Animated.Text style={[styles.subText, { opacity: textFadeAnim }]}>
          {restaurantName
            ? currentPhase.sub.replace('the menu', `${countText} at ${restaurantName}`)
            : currentPhase.sub}
        </Animated.Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressArea}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.percentText}>{progress}%</Text>
          <Text style={styles.brandText}>MENUTO</Text>
        </View>
      </View>

      {/* Bouncing dots */}
      <View style={styles.dotsRow}>
        <BouncingDot delay={100} />
        <BouncingDot delay={200} />
        <BouncingDot delay={300} />
      </View>
    </Animated.View>
  );
};

const BouncingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: -6,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: anim }] }]}
    />
  );
};

const TERRA = '#E9323D';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  // Icon area
  iconArea: {
    width: 192,
    height: 192,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  orbitRing: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 2,
    borderColor: '#F5F5F4',
  },
  orbitDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TERRA,
  },
  iconBox: {
    width: 128,
    height: 128,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  scannerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: TERRA,
    opacity: 0.4,
  },
  iconEmoji: {
    fontSize: 48,
  },
  // Badges
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  badgeRight: {
    right: -8,
    top: 20,
  },
  badgeLeft: {
    left: -16,
    bottom: 32,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#57534E',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Text
  textArea: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 48,
  },
  statusText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 26,
    color: '#1C1917',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#A8A29E',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  // Progress
  progressArea: {
    width: '100%',
    gap: 12,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#F5F5F4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: TERRA,
    borderRadius: 3,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: TERRA,
    fontVariant: ['tabular-nums'],
  },
  brandText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#A8A29E',
    letterSpacing: 3,
  },
  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 40,
    opacity: 0.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TERRA,
  },
});
