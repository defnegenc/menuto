import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MyRestaurants } from './MyRestaurants';
import { ChooseDishLanding } from './ChooseDishLanding';
import { ProfileScreen } from './ProfileScreen';
import { ProfileIcon } from '../components/ProfileIcon';
import { useStore } from '../store/useStore';
import { FavoriteRestaurant } from '../types';

const RED = '#E9323D';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onAddRestaurant?: () => void;
  onSignOut?: () => void;
  onTestOnboarding?: () => void;
  onNavigateToDishRecommendations?: (restaurant: FavoriteRestaurant, preferences: {
    hungerLevel: number;
    preferenceLevel: number;
    selectedCravings: string[];
  }) => void;
}

type Tab = 'spots' | 'choose' | 'profile';

export function MainTabScreen({
  onSelectRestaurant,
  onAddRestaurant,
  onSignOut,
  onTestOnboarding,
  onNavigateToDishRecommendations,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('spots');
  const { user } = useStore();
  const insets = useSafeAreaInsets();

  // If profile tab is active, render full screen (no bottom bar)
  if (activeTab === 'profile') {
    return (
      <ProfileScreen
        onSelectRestaurant={onSelectRestaurant}
        onSignOut={onSignOut}
        onTestOnboarding={onTestOnboarding}
        onBackToTabs={() => setActiveTab('spots')}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile icon — top right, floating */}
      <View style={[styles.profileIconContainer, { top: insets.top + 8 }]}>
        <ProfileIcon
          onPress={() => setActiveTab('profile')}
          profilePhoto={user?.profile_photo}
          name={user?.name}
          size={38}
        />
      </View>

      {/* Active screen */}
      <View style={styles.screenContainer}>
        {activeTab === 'spots' && (
          <MyRestaurants
            onSelectRestaurant={onSelectRestaurant}
            onAddRestaurant={onAddRestaurant}
          />
        )}
        {activeTab === 'choose' && (
          <ChooseDishLanding
            onSelectRestaurant={onSelectRestaurant}
            onNavigateToRecommendations={onNavigateToDishRecommendations}
          />
        )}
      </View>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('spots')}
          activeOpacity={0.7}
        >
          <View style={[styles.tabIndicator, activeTab === 'spots' && styles.tabIndicatorActive]} />
          <Text style={[styles.tabLabel, activeTab === 'spots' && styles.tabLabelActive]}>
            My List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('choose')}
          activeOpacity={0.7}
        >
          <View style={[styles.tabIndicator, activeTab === 'choose' && styles.tabIndicatorActive]} />
          <Text style={[styles.tabLabel, activeTab === 'choose' && styles.tabLabelActive]}>
            Choose Dish
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
  },
  // Profile icon
  profileIconContainer: {
    position: 'absolute',
    right: 24,
    zIndex: 100,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    paddingHorizontal: 48,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabIndicator: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: RED,
  },
  tabLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
    color: '#D1D5DB',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#111827',
  },
});
