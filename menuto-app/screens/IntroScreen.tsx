import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
// No external gradient dep — using solid terra cotta

const TERRA = '#E9323D';
const CREAM_BG = '#FFFFFF';

interface IntroScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onGetStarted, onLogin }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pingAnim = useRef(new Animated.Value(0.4)).current;
  const pingScale = useRef(new Animated.Value(0.8)).current;
  const icon1Bounce = useRef(new Animated.Value(0)).current;
  const icon2Bounce = useRef(new Animated.Value(0)).current;
  const icon3Bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in card from bottom
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Ping animation on central icon
    const ping = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pingAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pingScale, {
            toValue: 1.6,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pingAnim, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pingScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    ping.start();

    // Floating icon bounces
    const makeBounce = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -8,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const b1 = makeBounce(icon1Bounce, 1200, 0);
    const b2 = makeBounce(icon2Bounce, 1000, 400);
    const b3 = makeBounce(icon3Bounce, 1400, 200);
    b1.start();
    b2.start();
    b3.start();

    return () => {
      ping.stop();
      b1.stop();
      b2.stop();
      b3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Map-like background with floating icons */}
      <View style={styles.mapArea}>
        {/* Dense grid lines for map feel */}
        <View style={[styles.gridLine, { top: '12%', left: 0, right: 0, height: 1, opacity: 0.25 }]} />
        <View style={[styles.gridLine, { top: '24%', left: 0, right: 0, height: 1, opacity: 0.35 }]} />
        <View style={[styles.gridLine, { top: '36%', left: 0, right: 0, height: 1.5, opacity: 0.4 }]} />
        <View style={[styles.gridLine, { top: '48%', left: 0, right: 0, height: 1, opacity: 0.3 }]} />
        <View style={[styles.gridLine, { top: '60%', left: 0, right: 0, height: 1, opacity: 0.2 }]} />
        <View style={[styles.gridLine, { left: '15%', top: 0, bottom: 0, width: 1, opacity: 0.2 }]} />
        <View style={[styles.gridLine, { left: '38%', top: 0, bottom: 0, width: 1.5, opacity: 0.35 }]} />
        <View style={[styles.gridLine, { left: '62%', top: 0, bottom: 0, width: 1, opacity: 0.25 }]} />
        <View style={[styles.gridLine, { left: '85%', top: 0, bottom: 0, width: 1, opacity: 0.15 }]} />

        {/* Map block shapes */}
        <View style={styles.mapBlock1} />
        <View style={styles.mapBlock2} />
        <View style={styles.mapBlock3} />

        {/* Floating icon badges — lower */}
        <Animated.View
          style={[
            styles.floatingIcon,
            { top: '28%', left: '12%' },
            { transform: [{ translateY: icon1Bounce }] },
          ]}
        >
          <Text style={styles.floatingEmoji}>🍴</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingIcon,
            { top: '52%', right: '10%' },
            { transform: [{ translateY: icon2Bounce }] },
          ]}
        >
          <Text style={styles.floatingEmoji}>❤️</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingIconSmall,
            { top: '35%', right: '22%' },
            { transform: [{ translateY: icon3Bounce }] },
          ]}
        >
          <Text style={[styles.floatingEmoji, { fontSize: 16 }]}>⭐</Text>
        </Animated.View>

        {/* Central pin with ping — centered vertically in map area */}
        <View style={styles.centralPin}>
          <Animated.View
            style={[
              styles.pingCircle,
              {
                opacity: pingAnim,
                transform: [{ scale: pingScale }],
              },
            ]}
          />
          <View style={styles.pinCircle}>
            <Text style={styles.pinIcon}>📍</Text>
          </View>
        </View>
      </View>

      {/* Bottom card */}
      <Animated.View
        style={[
          styles.bottomCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.cardContent}>
          <Text style={styles.headline}>
            Eat what you{'\n'}actually crave.
          </Text>
          <Text style={styles.subline}>
            Personalized dish recommendations for every mood and every meal.
          </Text>
        </View>

        <View style={styles.buttonArea}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onGetStarted}
            activeOpacity={0.9}
          >
            <View style={styles.gradientButton}>
              <Text style={styles.primaryButtonText}>Start Your Journey</Text>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={onLogin} style={styles.loginButton}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM_BG,
  },
  // Map area
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F7F5EE',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#D4D0C0',
  },
  mapBlock1: {
    position: 'absolute',
    top: '18%',
    left: '16%',
    width: 80,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F0EDE3',
    opacity: 0.6,
  },
  mapBlock2: {
    position: 'absolute',
    top: '42%',
    right: '12%',
    width: 100,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F0EDE3',
    opacity: 0.5,
  },
  mapBlock3: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 60,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0EDE3',
    opacity: 0.4,
  },
  floatingIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(233,50,61,0.1)',
  },
  floatingIconSmall: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    opacity: 0.5,
  },
  floatingEmoji: {
    fontSize: 20,
  },
  // Central pin
  centralPin: {
    position: 'absolute',
    top: '36%',
    left: '50%',
    marginLeft: -48,
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
  },
  pingCircle: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(233,50,61,0.1)',
  },
  pinCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  pinIcon: {
    fontSize: 40,
  },
  // Bottom card
  bottomCard: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  cardContent: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 40,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 10,
    gap: 32,
  },
  headline: {
    fontFamily: 'DMSans-Bold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.5,
    color: '#1C1917',
    textAlign: 'center',
  },
  subline: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#78716C',
    textAlign: 'center',
    maxWidth: 260,
    alignSelf: 'center',
  },
  // Buttons
  buttonArea: {
    gap: 16,
    marginTop: -1, // overlap slightly with card
    paddingTop: 24,
  },
  primaryButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    backgroundColor: TERRA,
    borderRadius: 24,
  },
  primaryButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  arrowText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#A8A29E',
  },
  loginLink: {
    color: 'rgba(206,62,37,0.8)',
    textDecorationLine: 'underline',
  },
});
