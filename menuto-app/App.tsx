import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text } from 'react-native';
import { ClerkProvider, useUser, useAuth } from '@clerk/clerk-expo';
import { loadFonts } from './utils/fonts';
import { theme } from './theme';

// Screens
import { ClerkAuthScreen } from './screens/ClerkAuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { MainTabScreen } from './screens/MainTabScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { DishDetailScreen } from './screens/DishDetailScreen';
import { RestaurantDetailScreen } from './screens/RestaurantDetailScreen';
import { RestaurantSearchScreen } from './screens/RestaurantSearchScreen';

// Store and Types
import { useStore } from './store/useStore';
import { ParsedDish, FavoriteRestaurant } from './types';

// Get Clerk publishable key
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

type AppScreen = 'signIn' | 'onboarding' | 'onboardingRestaurants' | 'mainTabs' | 'restaurantDetail' | 'recommendations' | 'dishDetail';

function AppContent() {
  const { user, setUser } = useStore();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Load fonts on app startup
  useEffect(() => {
    const loadFontsAsync = async () => {
      await loadFonts();
      setFontsLoaded(true);
    };
    loadFontsAsync();
  }, []);
  
  // Determine initial screen based on user state
  const getInitialScreen = (): AppScreen => {
    if (!clerkUser) return 'signIn';
    if (!user || !user.preferred_cuisines || user.preferred_cuisines.length === 0) {
      return 'onboarding';
    }
    return 'mainTabs';
  };
  
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(getInitialScreen());
  const [selectedDish, setSelectedDish] = useState<ParsedDish | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<FavoriteRestaurant | null>(null);


  const handleAuthComplete = () => {
    setCurrentScreen('onboarding');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Clear user data
      setUser({} as any, '');
      setCurrentScreen('signIn');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen('onboardingRestaurants');
  };

  const handleOnboardingRestaurantsComplete = () => {
    console.log('handleOnboardingRestaurantsComplete called');
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

  const handleBackToRecommendations = () => {
    setSelectedDish(null);
    setCurrentScreen('restaurantDetail');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'signIn':
        return <ClerkAuthScreen onAuthComplete={handleAuthComplete} />;
      
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} onAddRestaurants={handleOnboardingComplete} />;
      
      case 'onboardingRestaurants':
        return (
          <RestaurantSearchScreen 
            isOnboarding={true}
            onComplete={handleOnboardingRestaurantsComplete}
            minSelection={3}
          />
        );
      
      case 'mainTabs':
        return <MainTabScreen onSelectRestaurant={handleSelectRestaurant} onAddRestaurant={() => setCurrentScreen('onboardingRestaurants')} onSignOut={handleSignOut} />;
      
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
      
      case 'dishDetail':
        return selectedDish ? (
          <DishDetailScreen
            dish={selectedDish}
            onBack={handleBackToRecommendations}
          />
        ) : null;
      
      default:
        return <ClerkAuthScreen onAuthComplete={handleAuthComplete} />;
    }
  };

  if (!fontsLoaded || !isLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: theme.colors.text.secondary }}>
            {!fontsLoaded ? 'Loading fonts...' : 'Loading...'}
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
    <ClerkProvider publishableKey={publishableKey}>
      <AppContent />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
