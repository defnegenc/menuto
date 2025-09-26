import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { MyRestaurants } from './MyRestaurants';
import { ChooseDishLanding } from './ChooseDishLanding';
import { ProfileScreen } from './ProfileScreen';

import { FavoriteRestaurant } from '../types';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onAddRestaurant?: () => void;
  onSignOut?: () => void;
  onNavigateToDishRecommendations?: (restaurant: FavoriteRestaurant, preferences: {
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  }) => void;
}

export function MainTabScreen({ onSelectRestaurant, onAddRestaurant, onSignOut, onNavigateToDishRecommendations }: Props) {
  // Create wrapper components to pass props
  const MyRestaurantsScreen = () => (
    <MyRestaurants onSelectRestaurant={onSelectRestaurant} onAddRestaurant={onAddRestaurant} />
  );

  const ChooseDishScreen = () => (
    <ChooseDishLanding 
      onSelectRestaurant={onSelectRestaurant} 
      onNavigateToRecommendations={onNavigateToDishRecommendations}
    />
  );

  const ProfileScreenWrapper = () => (
    <ProfileScreen onSelectRestaurant={onSelectRestaurant} onSignOut={onSignOut} />
  );
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E1E8ED',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: theme.colors.secondary,
          tabBarInactiveTintColor: '#7F8C8D',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen 
          name="My Restaurants" 
          component={MyRestaurantsScreen}
          options={{
            tabBarLabel: 'My Restaurants',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 16 }}>🍽️</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Choose Dish" 
          component={ChooseDishScreen}
          options={{
            tabBarLabel: 'Choose Dish',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 16 }}>🍴</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreenWrapper}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 16 }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}