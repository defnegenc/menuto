import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { ProfileScreen } from './ProfileScreen';
import { RestaurantSearchScreen } from './RestaurantSearchScreen';

import { FavoriteRestaurant } from '../types';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
}

export function MainTabScreen({ onSelectRestaurant }: Props) {
  // Create wrapper components to pass props
  const MyRestaurantsScreen = () => (
    <ProfileScreen onSelectRestaurant={onSelectRestaurant} />
  );

  const AddRestaurantScreen = () => (
    <RestaurantSearchScreen />
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
          name="Add Restaurant" 
          component={AddRestaurantScreen}
          options={{
            tabBarLabel: 'Add Restaurant',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 16 }}>➕</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}