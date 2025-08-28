import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text } from 'react-native';
import { ClerkProvider, useUser } from '@clerk/clerk-expo';
import { loadFonts } from './utils/fonts';
import { theme } from './theme';

// Screens
import { SignInScreen } from './screens/SignInScreen';
import { ClerkSignInScreen } from './screens/ClerkSignInScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { MainTabScreen } from './screens/MainTabScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { DishDetailScreen } from './screens/DishDetailScreen';
import { RestaurantDetailScreen } from './screens/RestaurantDetailScreen';

// Store and Types
import { useStore } from './store/useStore';
import { ParsedDish, FavoriteRestaurant } from './types';

// Get Clerk publishable key
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

type AppScreen = 'signIn' | 'onboarding' | 'mainTabs' | 'restaurantDetail' | 'recommendations' | 'dishDetail';

function AppContent() {
  const { user: clerkUser } = useUser();
  const { user } = useStore();
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
    if (!user || !user.dietary_restrictions || user.dietary_restrictions.length === 0) {
      return 'onboarding';
    }
    return 'mainTabs';
  };
  
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(getInitialScreen());
  const [selectedDish, setSelectedDish] = useState<ParsedDish | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<FavoriteRestaurant | null>(null);


  const handleSignInComplete = () => {
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = () => {
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
        return <ClerkSignInScreen onSignInComplete={handleSignInComplete} />;
      
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      
      case 'mainTabs':
        return <MainTabScreen onSelectRestaurant={handleSelectRestaurant} />;
      
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
        return <SignInScreen onSignInComplete={handleSignInComplete} />;
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: theme.colors.text.secondary }}>
            Loading fonts...
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
