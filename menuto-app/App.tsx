import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { loadFonts } from './utils/fonts';
import { theme } from './theme';
import { debugLog } from './utils/debug';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';

// Screens
import { AuthScreen } from './screens/AuthScreen';
import { MainTabScreen } from './screens/MainTabScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { DishDetailScreen } from './screens/DishDetailScreen';
import { RestaurantDetailScreen } from './screens/RestaurantDetailScreen';
import { DishRecommendations } from './screens/DishRecommendations';
import { PostMealFeedback } from './screens/PostMealFeedback';
// Onboarding screens
import { TastePreferencesScreen, RestaurantSelectionScreen } from './screens/onboarding';

// Main app screens
import { RestaurantSearchScreen } from './screens/RestaurantSearchScreen';

// Store and Types
import { useStore } from './store/useStore';
import { ParsedDish, FavoriteRestaurant } from './types';
import { api } from './services/api';

// Onboarding completion helpers
const hasTastePrefs = (u?: any) => {
  const hasPrefs = Array.isArray(u?.preferred_cuisines) && u.preferred_cuisines.length > 0;
  debugLog('hasTastePrefs:', { hasPrefs, prefs: u?.preferred_cuisines });
  return hasPrefs;
};

const hasRestaurants = (u?: any) => {
  const hasRest = Array.isArray(u?.favorite_restaurants) && u.favorite_restaurants.length > 0;
  debugLog('hasRestaurants:', { hasRest, restaurants: u?.favorite_restaurants?.length });
  return hasRest;
};

const hasCompletedOnboarding = (u?: any) => {
  const completed = hasTastePrefs(u) && hasRestaurants(u);
  debugLog('hasCompletedOnboarding:', { completed });
  return completed;
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Global error handler for unhandled promise rejections
const globalErrorUtils = (globalThis as any)?.ErrorUtils;
if (globalErrorUtils) {
  const originalHandler = globalErrorUtils.getGlobalHandler?.();

  globalErrorUtils.setGlobalHandler?.((error: any, isFatal: boolean) => {
    console.error('Global error caught:', error, 'Fatal:', isFatal);

    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

debugLog('API URL:', process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8080');

type AppScreen = 'signIn' | 'onboarding' | 'onboardingRestaurants' | 'mainTabs' | 'restaurantSearch' | 'restaurantDetail' | 'recommendations' | 'dishRecommendations' | 'dishDetail' | 'postMealFeedback';


function AppContent() {
  const { user, setUser } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<AppScreen>('signIn');
  const [selectedDish, setSelectedDish] = useState<ParsedDish | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<FavoriteRestaurant | null>(null);
  const [userPreferences, setUserPreferences] = useState<{
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  } | null>(null);
  const [selectedDishForFeedback, setSelectedDishForFeedback] = useState<{
    id: number;
    name: string;
    description: string;
    restaurant: string;
    restaurantPlaceId?: string;
  } | null>(null);

  // Fast first render - load fonts, then show UI
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadFonts();
      } catch (error) {
        console.error('Error loading fonts:', error);
      }

      if (mounted) {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Supabase auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user data when session changes
  useEffect(() => {
    if (!appIsReady || !authLoaded) return;

    if (!session?.user) {
      debugLog('App.tsx: No session - user needs to sign in');
      setCurrentScreen('signIn');
      return;
    }

    // If user is already loaded for this session user, skip
    if (user && user.id === session.user.id) {
      return;
    }

    const supabaseUser = session.user;

    const loadUserData = async () => {
      try {
        debugLog('App.tsx: Loading user data for Supabase ID:', supabaseUser.id);

        let userData: any = null;
        try {
          userData = await api.getUserPreferences(supabaseUser.id);
        } catch (err: any) {
          const errorMessage = err?.message || String(err);
          debugLog('getUserPreferences error:', errorMessage);

          if (errorMessage.includes('timeout') ||
              errorMessage.includes('unreachable') ||
              errorMessage.includes('Failed to fetch') ||
              errorMessage.includes('Network request failed')) {
            debugLog('Backend unreachable/timeout');
            Alert.alert(
              'Connection Error',
              'Unable to connect to the server. Please check your internet connection and try again.',
              [{ text: 'OK' }]
            );
            return;
          }

          if (errorMessage.includes('401')) {
            debugLog('Authentication error (401) - signing out');
            await supabase.auth.signOut();
            setUser(null, 'SIGNED_OUT');
            setCurrentScreen('signIn');
            return;
          }

          if (errorMessage.includes('500')) {
            debugLog('Server error (500) - backend may be down');
            Alert.alert(
              'Server Error',
              'The server is experiencing issues. Please try again later.',
              [{ text: 'OK' }]
            );
            return;
          }

          if (!errorMessage.includes('404')) {
            debugLog('Unexpected error - not treating as user not found');
            throw err;
          }

          userData = null;
        }

        if (userData) {
          debugLog('App.tsx: User data loaded successfully');
          setUser(userData, supabaseUser.id);

          if (hasCompletedOnboarding(userData)) {
            debugLog('App.tsx: User has completed onboarding, going to mainTabs');
            setCurrentScreen('mainTabs');
          } else if (hasTastePrefs(userData)) {
            debugLog('App.tsx: User has taste prefs but no restaurants, going to onboardingRestaurants');
            setCurrentScreen('onboardingRestaurants');
          } else {
            debugLog('App.tsx: Existing user without prefs, going to onboarding');
            setCurrentScreen('onboarding');
          }
        } else {
          // No backend profile - new user or profile was deleted
          debugLog('App.tsx: No profile found, going to onboarding');
          setCurrentScreen('onboarding');
        }
      } catch (error) {
        debugLog('App.tsx: Failed to load user data:', error);
        if (error instanceof Error && error.message.includes('500')) {
          debugLog('Server error (500) - staying on current screen');
          return;
        }
        if (session?.user) {
          debugLog('Assuming new user due to error, going to onboarding');
          setCurrentScreen('onboarding');
        } else {
          setCurrentScreen('signIn');
        }
      }
    };

    loadUserData();
  }, [session, appIsReady, authLoaded]);

  const handleAuthComplete = () => {
    debugLog('handleAuthComplete called, user state:', {
      hasUser: !!user,
      userId: user?.id,
    });

    if (!user) {
      debugLog('handleAuthComplete: Waiting for user data to load...');
      setTimeout(() => {
        if (user) {
          handleAuthComplete();
        } else {
          debugLog('handleAuthComplete: Still no user data after delay, routing to onboarding');
          setCurrentScreen('onboarding');
        }
      }, 200);
      return;
    }

    if (hasCompletedOnboarding(user)) {
      debugLog('handleAuthComplete: User has completed onboarding, going to mainTabs');
      setCurrentScreen('mainTabs');
    } else if (hasTastePrefs(user)) {
      debugLog('handleAuthComplete: User has taste prefs but no restaurants, going to onboardingRestaurants');
      setCurrentScreen('onboardingRestaurants');
    } else {
      debugLog('handleAuthComplete: New user, going to onboarding');
      setCurrentScreen('onboarding');
    }
  };

  const handleSignOut = async () => {
    try {
      debugLog('Signing out...');
      await supabase.auth.signOut();
      debugLog('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null, 'SIGNED_OUT');
      setCurrentScreen('signIn');
    }
  };

  const handleBackToSignIn = useCallback(() => {
    debugLog('App: handleBackToSignIn called, current screen:', currentScreen);

    supabase.auth.signOut().catch((err) => console.error('Failed to sign out during back navigation:', err));

    setSelectedDish(null);
    setSelectedRestaurant(null);
    setUserPreferences(null);
    setSelectedDishForFeedback(null);
    setUser(null, '');
    setCurrentScreen('signIn');

    debugLog('App: Screen set to signIn and user cleared');
  }, [currentScreen, setUser]);

  const handleOnboardingComplete = () => {
    setCurrentScreen('onboardingRestaurants');
  };

  const handleOnboardingRestaurantsComplete = () => {
    debugLog('handleOnboardingRestaurantsComplete called');
    setCurrentScreen('mainTabs');
  };

  const handleRestaurantSearchComplete = () => {
    debugLog('handleRestaurantSearchComplete called');
    setCurrentScreen('mainTabs');
  };

  const handleBackToMainTabs = () => {
    debugLog('App: handleBackToMainTabs called');
    setCurrentScreen('mainTabs');
  };

  const handleSelectRestaurant = (restaurant: FavoriteRestaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentScreen('restaurantDetail');
  };

  const handleDishSelect = (dish: ParsedDish) => {
    setSelectedDish(dish);
    setCurrentScreen('dishDetail');
  };

  const handleBackToMain = () => {
    setSelectedDish(null);
    setSelectedRestaurant(null);
    setCurrentScreen('mainTabs');
  };

  const handleBackToRestaurantDetail = () => {
    setSelectedDish(null);
    setCurrentScreen('restaurantDetail');
  };

  const handleGetRecommendations = () => {
    setCurrentScreen('recommendations');
  };

  const handleNavigateToDishRecommendations = (restaurant: FavoriteRestaurant, preferences: {
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  }) => {
    setSelectedRestaurant(restaurant);
    setUserPreferences(preferences);
    setCurrentScreen('dishRecommendations');
  };

  const handleBackToRecommendations = () => {
    setSelectedDish(null);
    setCurrentScreen('restaurantDetail');
  };

  const handleDishRecommendationContinue = (dish: any) => {
    setSelectedDishForFeedback({
      id: dish.id || Math.random(),
      name: dish.name,
      description: dish.description || '',
      restaurant: selectedRestaurant?.name || 'Unknown Restaurant',
      restaurantPlaceId: selectedRestaurant?.place_id
    });
    setCurrentScreen('postMealFeedback');
  };

  const handleFeedbackComplete = (rating: number, feedback: string) => {
    debugLog('Feedback submitted:', { rating, feedback });
    setCurrentScreen('dishRecommendations');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'signIn':
        return <AuthScreen onAuthComplete={handleAuthComplete} />;

      case 'onboarding':
        return <TastePreferencesScreen onComplete={handleOnboardingComplete} onBack={handleBackToSignIn} />;

      case 'onboardingRestaurants':
        return <RestaurantSelectionScreen onComplete={handleOnboardingRestaurantsComplete} />;

      case 'mainTabs':
        return <MainTabScreen
          onSelectRestaurant={handleSelectRestaurant}
          onAddRestaurant={() => setCurrentScreen('restaurantSearch')}
          onSignOut={handleSignOut}
          onNavigateToDishRecommendations={handleNavigateToDishRecommendations}
        />;

      case 'restaurantSearch':
        return <RestaurantSearchScreen onComplete={handleRestaurantSearchComplete} onBack={handleBackToMainTabs} />;

      case 'restaurantDetail':
        return selectedRestaurant ? (
          <RestaurantDetailScreen
            key={selectedRestaurant.place_id}
            restaurant={selectedRestaurant}
            onBack={handleBackToMain}
            onGetRecommendations={handleGetRecommendations}
          />
        ) : null;

      case 'recommendations':
        return selectedRestaurant ? (
          <RecommendationsScreen
            restaurant={selectedRestaurant}
            onDishSelect={handleDishSelect}
            onBack={handleBackToRestaurantDetail}
          />
        ) : null;

       case 'dishRecommendations':
         return selectedRestaurant && userPreferences ? (
           <DishRecommendations
             restaurant={selectedRestaurant}
             userPreferences={userPreferences}
             onContinue={handleDishRecommendationContinue}
             onBack={handleBackToRestaurantDetail}
           />
         ) : null;

      case 'dishDetail':
        return selectedDish ? (
          <DishDetailScreen
            dish={selectedDish}
            onBack={handleBackToRecommendations}
          />
        ) : null;

      case 'postMealFeedback':
        return selectedDishForFeedback ? (
          <PostMealFeedback
            dish={selectedDishForFeedback}
            onComplete={handleFeedbackComplete}
            onBack={() => setCurrentScreen('dishRecommendations')}
          />
        ) : null;

      default:
        return <AuthScreen onAuthComplete={handleAuthComplete} />;
    }
  };

  if (!appIsReady || !authLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: theme.colors.text.secondary }}>
            {!appIsReady ? 'Loading fonts...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {renderCurrentScreen()}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
