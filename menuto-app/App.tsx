import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { ClerkProvider, useUser, useAuth } from '@clerk/clerk-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokenCache } from './clerkTokenCache';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { loadFonts } from './utils/fonts';
import { theme } from './theme';

// Screens
import { ClerkAuthScreen } from './screens/ClerkAuthScreen';
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
import { api, setAuthTokenGetter, ensureUserProfile, isAuthGetterWired } from './services/api';

// Onboarding completion helpers
const hasTastePrefs = (u?: any) => {
  const hasPrefs = Array.isArray(u?.preferred_cuisines) && u.preferred_cuisines.length > 0;
  console.log('🔍 hasTastePrefs:', { hasPrefs, prefs: u?.preferred_cuisines });
  return hasPrefs;
};

const hasRestaurants = (u?: any) => {
  const hasRest = Array.isArray(u?.favorite_restaurants) && u.favorite_restaurants.length > 0;
  console.log('🔍 hasRestaurants:', { hasRest, restaurants: u?.favorite_restaurants?.length });
  return hasRest;
};

const hasCompletedOnboarding = (u?: any) => {
  const completed = hasTastePrefs(u) && hasRestaurants(u);
  console.log('🔍 hasCompletedOnboarding:', { completed });
  return completed;
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Get Clerk publishable key
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
console.log('🔑 Clerk publishable key:', publishableKey?.slice(0, 12) + '...');
console.log('🌐 API URL:', process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8080');
// Show debug info on screen for production testing
if (!publishableKey || publishableKey.length < 10) {
  setTimeout(() => {
    Alert.alert('DEBUG', `Clerk Key Missing!\nKey: ${publishableKey}\nAPI: ${process.env.EXPO_PUBLIC_API_URL}`);
  }, 2000);
}

type AppScreen = 'signIn' | 'onboarding' | 'onboardingRestaurants' | 'mainTabs' | 'restaurantSearch' | 'restaurantDetail' | 'recommendations' | 'dishRecommendations' | 'dishDetail' | 'postMealFeedback';


function AppContent() {
  const { user, setUser } = useStore();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, getToken, isSignedIn } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Fast first render - load fonts, then show UI
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) Load all fonts using existing system
        await loadFonts();
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
      
      // 2) Always release splash screen and show UI
      if (mounted) {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Wire up Clerk token to API layer (after first render)
  useEffect(() => {
    if (!appIsReady) {
      return;
    }
    
    console.log('🔍 Token getter effect running, getToken:', typeof getToken, !!getToken);
    if (!getToken) {
      console.log('⏳ getToken not available yet');
      return;
    }
    console.log('🔧 Setting up auth token getter...');
    setAuthTokenGetter(() => getToken({ template: 'backend', skipCache: false }));
    console.log('✅ Auth token getter configured');
  }, [getToken, appIsReady]);

  // Load user data when Clerk user is available (after first render)
  useEffect(() => {
    const loadUserData = async () => {
      // Only run after app is ready and Clerk is loaded
      if (!appIsReady || !isLoaded) {
        return;
      }
      
      console.log('🔄 App.tsx: Clerk user state:', { 
        hasClerkUser: !!clerkUser, 
        clerkUserId: clerkUser?.id,
        hasLocalUser: !!user,
        localUserId: user?.id || 'none',
        isLoaded: isLoaded
      });
      
      if (clerkUser && !user) {
        try {
          console.log('🔄 App.tsx: Loading user data for Clerk ID:', clerkUser.id);
          
          // Set up token getter immediately if not already set
          if (!isAuthGetterWired()) {
            console.log('🔧 Setting up token getter immediately...');
            setAuthTokenGetter(() => getToken({ template: 'backend', skipCache: false }));
          }
          
          // Try to get token once - don't block startup
          console.log('⏳ Getting authentication token...');
          try {
            const token = await getToken({ template: 'backend', skipCache: false });
            if (token) {
              console.log('✅ Token obtained, making API call');
            }
          } catch (e) {
            console.log('⚠️ Token attempt failed, continuing without token:', e);
          }
          
          const userData = await api.getUserPreferences(clerkUser.id);
          if (userData) {
            console.log('✅ App.tsx: User data loaded successfully');
            console.log('📊 User data breakdown:', {
              hasPreferences: !!userData.preferred_cuisines?.length,
              hasRestaurants: !!userData.favorite_restaurants?.length,
              restaurantCount: userData.favorite_restaurants?.length || 0,
              preferences: userData.preferred_cuisines
            });
            setUser(userData, clerkUser.id);

            // Route based on what they already have
            if (hasCompletedOnboarding(userData)) {
              console.log('🎯 App.tsx: User has completed onboarding, going to mainTabs');
              setCurrentScreen('mainTabs');
            } else if (hasTastePrefs(userData)) {
              console.log('🎯 App.tsx: User has taste prefs but no restaurants, going to onboardingRestaurants');
              setCurrentScreen('onboardingRestaurants');
            } else {
              console.log('🎯 App.tsx: New user, going to onboarding');
              setCurrentScreen('onboarding');
            }
          } else {
            console.log('↩️ No profile yet. Creating one…');
            const email = clerkUser.primaryEmailAddress?.emailAddress ?? undefined;
            const created = await ensureUserProfile(clerkUser.id, email);
            setUser(created, clerkUser.id);
            setCurrentScreen('onboarding');
            return;
          }
        } catch (error) {
          console.log('❌ App.tsx: Failed to load user data:', error);
          // Check if it's a 500 error (server issue) vs 404 (user doesn't exist) vs 401 (auth issue)
          if (error instanceof Error && error.message.includes('500')) {
            console.log('⚠️ Server error (500) - backend may be down, staying on current screen');
            // Don't change screens on server errors, let user retry
            return;
          } else if (error instanceof Error && error.message.includes('401')) {
            console.log('⚠️ Authentication error (401) - token may be invalid, staying on current screen');
            // Don't change screens on auth errors, let user retry or re-authenticate
            return;
          }
          // If we can't load user data, assume it's a new user
          console.log('↩️ Assuming new user due to error, going to onboarding');
          setCurrentScreen('onboarding');
        }
      } else if (!clerkUser) {
        console.log('❌ App.tsx: No Clerk user available - user needs to sign in');
      } else if (user) {
        console.log('✅ App.tsx: User already loaded, ID:', user.id || 'no-id');
      } else {
        console.log('✅ App.tsx: No user loaded');
      }
    };
    
    loadUserData();
  }, [clerkUser, user, setUser, isLoaded, getToken, appIsReady]);

  // Set userId in store when Clerk user changes
  useEffect(() => {
    if (clerkUser?.id && !user) {
      console.log('🔄 App.tsx: Setting userId in store:', clerkUser.id);
      // Don't call setUser here, just set the userId
      // The loadUserData effect above will handle loading the actual user data
    }
  }, [clerkUser?.id, user]);
  
  // Determine initial screen based on user state
  const getInitialScreen = (): AppScreen => {
    // If Clerk not ready, keep sign-in UI
    if (!clerkUser) return 'signIn';

    // If we haven't loaded the user profile yet, show onboarding
    // (We'll create/fetch and redirect)
    if (!user) return 'onboarding';

    if (hasCompletedOnboarding(user)) return 'mainTabs';
    if (hasTastePrefs(user)) return 'onboardingRestaurants';
    return 'onboarding';
  };
  
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

  // Update screen based on user state
  useEffect(() => {
    if (!appIsReady) return;
    
    const newScreen = getInitialScreen();
    setCurrentScreen(newScreen);
  }, [appIsReady, clerkUser, user]);

  const handleAuthComplete = () => {
    console.log('🔄 handleAuthComplete called, user state:', { 
      hasUser: !!user, 
      userId: user?.id,
      hasTastePrefs: hasTastePrefs(user),
      hasRestaurants: hasRestaurants(user),
      hasCompletedOnboarding: hasCompletedOnboarding(user)
    });
    
    // Wait for user data to be available before routing
    if (!user) {
      console.log('⏳ handleAuthComplete: Waiting for user data to load...');
      // Add a small delay and try again
      setTimeout(() => {
        if (user) {
          handleAuthComplete();
        } else {
          console.log('⚠️ handleAuthComplete: Still no user data after delay, routing to onboarding');
          setCurrentScreen('onboarding');
        }
      }, 200);
      return;
    }
    
    // If the user object already exists (e.g., returning user), route correctly
    if (hasCompletedOnboarding(user)) {
      console.log('🎯 handleAuthComplete: User has completed onboarding, going to mainTabs');
      setCurrentScreen('mainTabs');
    } else if (hasTastePrefs(user)) {
      console.log('🎯 handleAuthComplete: User has taste prefs but no restaurants, going to onboardingRestaurants');
      setCurrentScreen('onboardingRestaurants');
    } else {
      console.log('🎯 handleAuthComplete: New user, going to onboarding');
      setCurrentScreen('onboarding');
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🔄 Signing out...');
      await signOut(); // No parameters at all
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      // Clear local state either way
      setUser(null, 'SIGNED_OUT');
      setCurrentScreen('signIn');
    }
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen('onboardingRestaurants');
  };

  const handleOnboardingRestaurantsComplete = () => {
    console.log('handleOnboardingRestaurantsComplete called');
    setCurrentScreen('mainTabs');
  };

  const handleRestaurantSearchComplete = () => {
    console.log('handleRestaurantSearchComplete called');
    setCurrentScreen('mainTabs');
  };

  const handleBackToMainTabs = () => {
    console.log('🔙 App: handleBackToMainTabs called');
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
    // Set the selected dish for feedback
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
    console.log('Feedback submitted:', { rating, feedback });
    // Navigate back to dish recommendations (where they came from)
    setCurrentScreen('dishRecommendations');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'signIn':
        return <ClerkAuthScreen onAuthComplete={handleAuthComplete} />;
      
      case 'onboarding':
        return <TastePreferencesScreen onComplete={handleOnboardingComplete} />;
      
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
            key={selectedRestaurant.place_id} // Stable key based on restaurant ID only
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
        return <ClerkAuthScreen onAuthComplete={handleAuthComplete} />;
    }
  };

  if (!appIsReady || !isLoaded) {
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
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <AppContent />
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});