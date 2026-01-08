import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { MyRestaurants } from './MyRestaurants';
import { ChooseDishLanding } from './ChooseDishLanding';
import { ProfileScreen } from './ProfileScreen';
import { Image, View } from 'react-native';

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
            backgroundColor: '#FFFEF4',
            borderTopColor: '#E1E8ED',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#000000',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            fontFamily: theme.typography.fontFamilies.medium,
          },
        }}
      >
        <Tab.Screen 
          name="My Restaurants" 
          component={MyRestaurantsScreen}
          options={{
            tabBarLabel: 'My Restaurants',
            tabBarIcon: ({ focused, color }) => (
              <View style={{ width: 24, height: 24 }}>
                <Image 
                  source={focused ? require('../assets/myrestaurants.png') : require('../assets/myrestaurants-d.png')} 
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
            ),
          }}
        />
        <Tab.Screen 
          name="Choose Dish" 
          component={ChooseDishScreen}
          options={{
            tabBarLabel: 'Choose Dish',
            tabBarIcon: ({ focused, color }) => (
              <View style={{ width: 24, height: 24 }}>
                <Image 
                  source={focused ? require('../assets/choosedish.png') : require('../assets/choosedish-d.png')} 
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreenWrapper}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused, color }) => (
              <View style={{ width: 24, height: 24 }}>
                <Image 
                  source={focused ? require('../assets/profile.png') : require('../assets/profile-d.png')} 
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}