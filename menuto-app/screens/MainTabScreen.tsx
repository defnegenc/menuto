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

      {/* Bottom tab bar — segmented toggle */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleTab, activeTab === 'spots' && styles.toggleTabActive]}
            onPress={() => setActiveTab('spots')}
            activeOpacity={0.9}
          >
            <Text style={[styles.toggleLabel, activeTab === 'spots' && styles.toggleLabelActive]}>
              MY LIST
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleTab, activeTab === 'choose' && styles.toggleTabActive]}
            onPress={() => setActiveTab('choose')}
            activeOpacity={0.9}
          >
            <Text style={[styles.toggleLabel, activeTab === 'choose' && styles.toggleLabelActive]}>
              CHOOSE DISH
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    padding: 3,
  },
  toggleTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 3,
  },
  toggleTabActive: {
    backgroundColor: '#1A1A1A',
  },
  toggleLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: '#9CA3AF',
  },
  toggleLabelActive: {
    color: '#FFFFFF',
  },
});
