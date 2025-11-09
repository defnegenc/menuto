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
import { CrashReporter } from './components/CrashReporter';
import { debugLog } from './utils/debug';
import { Buffer } from 'buffer';

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
import { ErrorBoundary } from './components/ErrorBoundary';

// Onboarding completion helpers
const hasTastePrefs = (u?: any) => {
  const hasPrefs = Array.isArray(u?.preferred_cuisines) && u.preferred_cuisines.length > 0;
  debugLog('🔍 hasTastePrefs:', { hasPrefs, prefs: u?.preferred_cuisines });
  return hasPrefs;
};

const hasRestaurants = (u?: any) => {
  const hasRest = Array.isArray(u?.favorite_restaurants) && u.favorite_restaurants.length > 0;
  debugLog('🔍 hasRestaurants:', { hasRest, restaurants: u?.favorite_restaurants?.length });
  return hasRest;
};

const hasCompletedOnboarding = (u?: any) => {
  const completed = hasTastePrefs(u) && hasRestaurants(u);
  debugLog('🔍 hasCompletedOnboarding:', { completed });
  return completed;
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Global error handler for unhandled promise rejections
const globalErrorUtils = (globalThis as any)?.ErrorUtils;
if (globalErrorUtils) {
  const originalHandler = globalErrorUtils.getGlobalHandler?.();
  
  globalErrorUtils.setGlobalHandler?.((error: any, isFatal: boolean) => {
    console.error('💥 Global error caught:', error, 'Fatal:', isFatal);
    
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Get Clerk publishable key
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
debugLog('🔑 Clerk publishable key:', publishableKey?.slice(0, 12) + '...');
debugLog('🌐 API URL:', process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8080');

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
    
    debugLog('🔍 Token getter effect running, getToken:', typeof getToken, !!getToken);
    if (!getToken) {
      debugLog('⏳ getToken not available yet');
      return;
    }
    debugLog('🔧 Setting up auth token getter...');
    setAuthTokenGetter(() => getToken({ template: 'backend', skipCache: false }));
    debugLog('✅ Auth token getter configured');
  }, [getToken, appIsReady]);

  useEffect(() => {
    const debugToken = async () => {
      if (!appIsReady || !isLoaded || !clerkUser || !getToken) {
        return;
      }
      
      try {
        console.log('🔍 DEBUG: Attempting to get token...');
        const token = await getToken({ template: 'backend', skipCache: true });
        
        if (!token) {
          console.error('❌ DEBUG: Token is null/undefined');
          return;
        }
        
        console.log('✅ DEBUG: Token obtained, length:', token.length);
        console.log('🔑 DEBUG: Token preview:', token.substring(0, 100) + '...');
        
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          console.log('📋 DEBUG: Token payload:', JSON.stringify(payload, null, 2));
          console.log('🎯 DEBUG: Audience:', payload.aud);
          console.log('🎯 DEBUG: Issuer:', payload.iss);
          console.log('🎯 DEBUG: Subject (User ID):', payload.sub);
          console.log('🎯 DEBUG: Expires:', new Date(payload.exp * 1000).toISOString());
          
          console.log('🧪 DEBUG: Testing API call...');
          const apiUrl = process.env.EXPO_PUBLIC_API_URL;
          const response = await fetch(`${apiUrl}/users/${payload.sub}/preferences`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('🧪 DEBUG: API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ DEBUG: API call successful:', data);
          } else {
            const errorText = await response.text();
            console.error('❌ DEBUG: API call failed:', response.status, errorText);
            console.log('🔧 DEBUG: Test manually with:');
            console.log(`curl -H "Authorization: Bearer ${token.substring(0, 50)}..." \\\n  ${apiUrl}/users/${payload.sub}/preferences`);
          }
        }
      } catch (error) {
        console.error('❌ DEBUG: Token debug error:', error);
      }
    };
    
    const timer = setTimeout(debugToken, 2000);
    return () => clearTimeout(timer);
  }, [appIsReady, isLoaded, clerkUser, getToken]);

  // Load user data when Clerk user is available (after first render)
  useEffect(() => {
    const loadUserData = async () => {
      // Only run after app is ready and Clerk is loaded
      if (!appIsReady || !isLoaded) {
        return;
      }
      
      debugLog('🔄 App.tsx: Clerk user state:', { 
        hasClerkUser: !!clerkUser, 
        clerkUserId: clerkUser?.id,
        hasLocalUser: !!user,
        localUserId: user?.id || 'none',
        isLoaded: isLoaded
      });
      
      if (clerkUser && !user) {
        try {
          debugLog('🔄 App.tsx: Loading user data for Clerk ID:', clerkUser.id);
          
          // Set up token getter immediately if not already set
          if (!isAuthGetterWired()) {
            debugLog('🔧 Setting up token getter immediately...');
            setAuthTokenGetter(() => getToken({ template: 'backend', skipCache: false }));
          }
          
          // Try to get token once - don't block startup
          debugLog('⏳ Getting authentication token...');
          try {
            const token = await getToken({ template: 'backend', skipCache: false });
            if (token) {
              debugLog('✅ Token obtained, making API call');
            }
          } catch (e) {
            debugLog('⚠️ Token attempt failed, continuing without token:', e);
          }
          
          const userData = await api.getUserPreferences(clerkUser.id).catch(err => {
            debugLog('⚠️ getUserPreferences failed, will create new profile:', err);
            return null;
          });
          
          if (userData) {
            debugLog('✅ App.tsx: User data loaded successfully');
            debugLog('📊 User data breakdown:', {
              hasPreferences: !!userData.preferred_cuisines?.length,
              hasRestaurants: !!userData.favorite_restaurants?.length,
              restaurantCount: userData.favorite_restaurants?.length || 0,
              preferences: userData.preferred_cuisines
            });
            setUser(userData, clerkUser.id);

            // Route based on what they already have
            if (hasCompletedOnboarding(userData)) {
              debugLog('🎯 App.tsx: User has completed onboarding, going to mainTabs');
              setCurrentScreen('mainTabs');
            } else if (hasTastePrefs(userData)) {
              debugLog('🎯 App.tsx: User has taste prefs but no restaurants, going to onboardingRestaurants');
              setCurrentScreen('onboardingRestaurants');
            } else {
              debugLog('🎯 App.tsx: New user, going to onboarding');
              setCurrentScreen('onboarding');
            }
          } else {
            debugLog('↩️ No profile yet. Creating one…');
            try {
              const email = clerkUser.primaryEmailAddress?.emailAddress ?? undefined;
              const created = await ensureUserProfile(clerkUser.id, email);
              setUser(created, clerkUser.id);
              setCurrentScreen('onboarding');
            } catch (createError) {
              debugLog('⚠️ Failed to create profile, continuing to onboarding anyway:', createError);
              // Create minimal local profile
              setUser({
                id: clerkUser.id,
                preferred_cuisines: [],
                spice_tolerance: 3,
                price_preference: 2,
                dietary_restrictions: [],
                favorite_restaurants: [],
                favorite_dishes: [],
              }, clerkUser.id);
              setCurrentScreen('onboarding');
            }
            return;
          }
        } catch (error) {
          debugLog('❌ App.tsx: Failed to load user data:', error);
          // Check if it's a 500 error (server issue) vs 404 (user doesn't exist) vs 401 (auth issue)
          if (error instanceof Error && error.message.includes('500')) {
            debugLog('⚠️ Server error (500) - backend may be down, staying on current screen');
            // Don't change screens on server errors, let user retry
            return;
          } else if (error instanceof Error && error.message.includes('401')) {
            debugLog('⚠️ Authentication error (401) - token invalid, signing out...');
            // Force sign out when token is invalid (user deleted from Clerk)
            try {
              if (isSignedIn) {
                await signOut();
              }
            } catch (signOutError) {
              console.error('❌ Failed to sign out:', signOutError);
              // Continue anyway - clear local state
            }
            setUser(null, 'SIGNED_OUT');
            setCurrentScreen('signIn');
            debugLog('✅ Signed out due to invalid token');
            return;
          }
          // If we can't load user data, assume it's a new user
          debugLog('↩️ Assuming new user due to error, going to onboarding');
          setCurrentScreen('onboarding');
        }
      } else if (!clerkUser) {
        debugLog('❌ App.tsx: No Clerk user available - user needs to sign in');
      } else if (user) {
        debugLog('✅ App.tsx: User already loaded, ID:', user.id || 'no-id');
      } else {
        debugLog('✅ App.tsx: No user loaded');
      }
    };
    
    loadUserData();
  }, [clerkUser, user, setUser, isLoaded, getToken, appIsReady]);

  // Set userId in store when Clerk user changes
  useEffect(() => {
    if (clerkUser?.id && !user) {
      debugLog('🔄 App.tsx: Setting userId in store:', clerkUser.id);
      // Don't call setUser here, just set the userId
      // The loadUserData effect above will handle loading the actual user data
    }
  }, [clerkUser?.id, user]);
  
  // Determine initial screen based on user state
  const getInitialScreen = (): AppScreen => {
    // If Clerk not ready, keep sign-in UI
    if (!clerkUser) return 'signIn';

    // Wait for user data to load before routing to onboarding
    if (!user) return 'signIn';

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

  // Update screen based on user state - only on initial load
  useEffect(() => {
    if (!appIsReady) return;
    
    // Only auto-navigate if we're on the sign-in screen or onboarding screens
    // Don't interfere with navigation when user is already in the main app
    const shouldAutoNavigate = 
      currentScreen === 'signIn' || 
      currentScreen === 'onboarding' || 
      currentScreen === 'onboardingRestaurants';
    
    if (shouldAutoNavigate) {
      const newScreen = getInitialScreen();
      setCurrentScreen(newScreen);
    }
  }, [appIsReady, clerkUser, user]);

  const handleAuthComplete = () => {
    debugLog('🔄 handleAuthComplete called, user state:', { 
      hasUser: !!user, 
      userId: user?.id,
      hasTastePrefs: hasTastePrefs(user),
      hasRestaurants: hasRestaurants(user),
      hasCompletedOnboarding: hasCompletedOnboarding(user)
    });
    
    
    // Wait for user data to be available before routing
    if (!user) {
      debugLog('⏳ handleAuthComplete: Waiting for user data to load...');
      // Add a small delay and try again
      setTimeout(() => {
        if (user) {
          handleAuthComplete();
        } else {
          debugLog('⚠️ handleAuthComplete: Still no user data after delay, routing to onboarding');
          setCurrentScreen('onboarding');
        }
      }, 200);
      return;
    }
    
    // If the user object already exists (e.g., returning user), route correctly
    if (hasCompletedOnboarding(user)) {
      debugLog('🎯 handleAuthComplete: User has completed onboarding, going to mainTabs');
      setCurrentScreen('mainTabs');
    } else if (hasTastePrefs(user)) {
      debugLog('🎯 handleAuthComplete: User has taste prefs but no restaurants, going to onboardingRestaurants');
      setCurrentScreen('onboardingRestaurants');
    } else {
      debugLog('🎯 handleAuthComplete: New user, going to onboarding');
      setCurrentScreen('onboarding');
    }
  };

  const handleSignOut = async () => {
    try {
      debugLog('🔄 Signing out...');
      await signOut(); // No parameters at all
      debugLog('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      // Clear local state either way
      setUser(null, 'SIGNED_OUT');
      setCurrentScreen('signIn');
    }
  };

  const handleBackToSignIn = useCallback(() => {
    debugLog('🔙 App: handleBackToSignIn called, current screen:', currentScreen);

    if (isSignedIn) {
      signOut().catch((err) => console.error('❌ Failed to sign out during back navigation:', err));
    }

    setSelectedDish(null);
    setSelectedRestaurant(null);
    setUserPreferences(null);
    setSelectedDishForFeedback(null);
    setUser(null, '');
    setCurrentScreen('signIn');

    debugLog('🔙 App: Screen set to signIn and user cleared');
  }, [currentScreen, isSignedIn, signOut, setUser]);

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
    debugLog('🔙 App: handleBackToMainTabs called');
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
    debugLog('Feedback submitted:', { rating, feedback });
    // Navigate back to dish recommendations (where they came from)
    setCurrentScreen('dishRecommendations');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'signIn':
        return <ClerkAuthScreen onAuthComplete={handleAuthComplete} />;
      
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <AppContent />
        </ClerkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});