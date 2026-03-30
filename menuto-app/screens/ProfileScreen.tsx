import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';
import { theme } from '../theme';
import { FavoriteRestaurant } from '../types';
import { api } from '../services/api';
import {
  POPULAR_CUISINES,
  ALL_CUISINES,
  HOME_BASE_CITIES,
} from '../constants';
import { ProfileHeader } from './profile/ProfileHeader';
import { TastePreferencesCard } from './profile/TastePreferencesCard';
import { SavedRestaurantsList } from './profile/SavedRestaurantsList';

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onSignOut?: () => void;
  onTestOnboarding?: () => void;
  onBackToTabs?: () => void;
}

export function ProfileScreen({ onSelectRestaurant, onSignOut, onTestOnboarding, onBackToTabs }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser, userId } = useStore();

  const top3Restaurants = user?.top_3_restaurants || [];

  // Edit profile modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedUsername, setEditedUsername] = useState(user?.username || '');
  const [editedProfilePhoto, setEditedProfilePhoto] = useState<string | null>(user?.profile_photo || null);
  const [editedSpiceTolerance, setEditedSpiceTolerance] = useState(user?.spice_tolerance || 3);

  // Preferences editing states
  const [isEditingCuisines, setIsEditingCuisines] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSearch, setCuisineSearch] = useState('');
  const [showAllCuisines, setShowAllCuisines] = useState(false);

  const [isEditingDietary, setIsEditingDietary] = useState(false);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

  const [isEditingHomeBase, setIsEditingHomeBase] = useState(false);
  const [selectedHomeBase, setSelectedHomeBase] = useState<string | null>(user?.home_base || null);
  const [homeBaseSearch, setHomeBaseSearch] = useState('');
  const [showHomeBasePicker, setShowHomeBasePicker] = useState(false);

  const [isEditingTop3, setIsEditingTop3] = useState(false);
  const [selectedTop3, setSelectedTop3] = useState<FavoriteRestaurant[]>(user?.top_3_restaurants || []);
  const [top3Search, setTop3Search] = useState('');

  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [editedPreferencesSpiceTolerance, setEditedPreferencesSpiceTolerance] = useState(user?.spice_tolerance || 3);

  // Tried dishes state
  const [triedDishes, setTriedDishes] = useState<any[]>([]);
  const [loadingTriedDishes, setLoadingTriedDishes] = useState(false);

  // Load tried dishes
  useEffect(() => {
    const loadTriedDishes = async () => {
      if (!userId) return;
      try {
        setLoadingTriedDishes(true);
        const dishes = await api.getTriedDishes(userId);
        setTriedDishes(dishes || []);
      } catch (error) {
        console.error('Failed to load tried dishes:', error);
        setTriedDishes([]);
      } finally {
        setLoadingTriedDishes(false);
      }
    };
    loadTriedDishes();
  }, [userId]);

  // Load user data
  useEffect(() => {
    if (user) {
      setEditedName(user.name || '');
      setEditedUsername(user.username || '');
      setEditedProfilePhoto(user.profile_photo || null);
      setEditedSpiceTolerance(user.spice_tolerance || 3);
      setSelectedHomeBase(user.home_base || null);
    }
  }, [user]);

  const getSpiceEmoji = (level: number) => '\uD83C\uDF36\uFE0F'.repeat(level);

  const getSpiceLabel = (level: number) => {
    const labels: Record<number, string> = { 1: 'Hand me the milk', 2: 'Gentle warmth', 3: 'Bring it on', 4: 'Spicy is my middle name', 5: 'Set me on fire' };
    return labels[level] || 'Gentle warmth';
  };

  // Helper to build a full user update payload with defaults
  const buildUserUpdate = (overrides: Record<string, any>) => ({
    ...user!,
    preferred_cuisines: user!.preferred_cuisines || [],
    spice_tolerance: user!.spice_tolerance || 3,
    price_preference: user!.price_preference || 2,
    dietary_restrictions: user!.dietary_restrictions || [],
    favorite_restaurants: user!.favorite_restaurants || [],
    favorite_dishes: user!.favorite_dishes || [],
    top_3_restaurants: user!.top_3_restaurants || [],
    home_base: user!.home_base || undefined,
    ...overrides,
  });

  const saveUserUpdate = async (overrides: Record<string, any>, successMsg?: string) => {
    if (!userId || !user) return;
    const updatedUser = buildUserUpdate(overrides);
    try {
      await api.updateUserPreferences(userId, updatedUser);
      setUser(updatedUser, userId);
      if (successMsg) Alert.alert('Success', successMsg);
      return true;
    } catch (error) {
      console.error('Failed to update:', error);
      Alert.alert('Error', 'Failed to update. Please try again.');
      return false;
    }
  };

  const resetProfileEdits = () => {
    setEditedName(user?.name || '');
    setEditedUsername(user?.username || '');
    setEditedProfilePhoto(user?.profile_photo || null);
    setEditedSpiceTolerance(user?.spice_tolerance || 3);
  };

  const handleEditProfile = () => { resetProfileEdits(); setIsEditingProfile(true); };

  const handleSaveProfile = async () => {
    const success = await saveUserUpdate({
      name: editedName.trim(),
      username: editedUsername.trim(),
      profile_photo: editedProfilePhoto || undefined,
      spice_tolerance: editedSpiceTolerance,
    }, 'Profile updated successfully!');
    if (success) setIsEditingProfile(false);
  };

  const handleCancelEditProfile = () => { resetProfileEdits(); setIsEditingProfile(false); };

  const handleProfilePhotoChange = async () => {
    Alert.alert(
      'Profile Photo',
      'Choose how you want to update your profile photo:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera permissions to take profile photos.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setEditedProfilePhoto(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Camera error:', error);
              Alert.alert('Error', 'Failed to open camera. Please try again.');
            }
          }
        },
        {
          text: 'Upload from Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need gallery permissions to upload profile photos.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setEditedProfilePhoto(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Gallery error:', error);
              Alert.alert('Error', 'Failed to open gallery. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Cuisine editing functions
  const startEditingCuisines = () => {
    const currentCuisines = user?.preferred_cuisines?.map((c: string) =>
      c.charAt(0).toUpperCase() + c.slice(1)
    ) || [];
    setSelectedCuisines(currentCuisines);
    setIsEditingCuisines(true);
  };

  const saveCuisines = async () => {
    const success = await saveUserUpdate({ preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()) });
    if (success) { setIsEditingCuisines(false); setCuisineSearch(''); setShowAllCuisines(false); }
  };

  const cancelEditingCuisines = () => {
    setIsEditingCuisines(false);
    setCuisineSearch('');
    setShowAllCuisines(false);
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const getFilteredCuisines = () => {
    const cuisinesToShow = cuisineSearch.trim()
      ? ALL_CUISINES.filter(cuisine =>
          cuisine.toLowerCase().includes(cuisineSearch.toLowerCase())
        )
      : showAllCuisines
        ? ALL_CUISINES
        : POPULAR_CUISINES;
    return cuisinesToShow;
  };

  // Dietary restrictions editing functions
  const startEditingDietary = () => {
    const currentDietary = user?.dietary_restrictions?.map((r: string) =>
      r.charAt(0).toUpperCase() + r.slice(1)
    ) || [];
    setSelectedDietary(currentDietary);
    setIsEditingDietary(true);
  };

  const saveDietary = async () => {
    const success = await saveUserUpdate({ dietary_restrictions: selectedDietary.map(r => r.toLowerCase()) });
    if (success) setIsEditingDietary(false);
  };

  const cancelEditingDietary = () => {
    setIsEditingDietary(false);
  };

  const toggleDietary = (restriction: string) => {
    setSelectedDietary(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  // Home base editing functions
  const startEditingHomeBase = () => {
    setSelectedHomeBase(user?.home_base || null);
    setIsEditingHomeBase(true);
  };

  const saveHomeBase = async () => {
    const success = await saveUserUpdate({ home_base: selectedHomeBase || undefined });
    if (success) { setIsEditingHomeBase(false); setShowHomeBasePicker(false); setHomeBaseSearch(''); }
  };

  const cancelEditingHomeBase = () => {
    setIsEditingHomeBase(false);
    setShowHomeBasePicker(false);
    setHomeBaseSearch('');
  };

  const selectHomeBaseCity = (cityName: string) => {
    setSelectedHomeBase(cityName);
    setShowHomeBasePicker(false);
    setHomeBaseSearch('');
  };

  const getFilteredHomeBaseCities = () => {
    if (!homeBaseSearch.trim()) return HOME_BASE_CITIES;
    return HOME_BASE_CITIES.filter(city =>
      city.name.toLowerCase().includes(homeBaseSearch.toLowerCase())
    );
  };

  // Top 3 Restaurants editing functions
  const startEditingTop3 = () => {
    setSelectedTop3(user?.top_3_restaurants || []);
    setIsEditingTop3(true);
  };

  const saveTop3 = async () => {
    const success = await saveUserUpdate({ top_3_restaurants: selectedTop3 });
    if (success) { setIsEditingTop3(false); setTop3Search(''); }
  };

  const cancelEditingTop3 = () => {
    setIsEditingTop3(false);
    setSelectedTop3([]);
    setTop3Search('');
  };

  const toggleTop3Restaurant = (restaurant: FavoriteRestaurant) => {
    const isSelected = selectedTop3.some(r => r.place_id === restaurant.place_id);
    if (isSelected) {
      setSelectedTop3(prev => prev.filter(r => r.place_id !== restaurant.place_id));
    } else if (selectedTop3.length < 3) {
      setSelectedTop3(prev => [...prev, restaurant]);
    }
  };

  const getFilteredTop3Restaurants = () => {
    const allRestaurants = user?.favorite_restaurants || [];
    if (!top3Search.trim()) return allRestaurants;
    return allRestaurants.filter((restaurant: FavoriteRestaurant) =>
      restaurant.name.toLowerCase().includes(top3Search.toLowerCase()) ||
      restaurant.vicinity.toLowerCase().includes(top3Search.toLowerCase())
    );
  };

  const getFavoriteDishesForRestaurant = (restaurant: FavoriteRestaurant) => {
    return (user?.favorite_dishes || []).filter((dish: any) =>
      dish.restaurant_id === restaurant.place_id || dish.restaurant_id === restaurant.name
    );
  };

  const handleStartEditingPreferences = () => {
    setSelectedCuisines(user?.preferred_cuisines?.map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)) || []);
    setSelectedDietary(user?.dietary_restrictions?.map((r: string) => r.charAt(0).toUpperCase() + r.slice(1)) || []);
    setSelectedHomeBase(user?.home_base || null);
    setEditedPreferencesSpiceTolerance(user?.spice_tolerance || 3);
    setIsEditingPreferences(true);
    setIsEditingCuisines(false);
    setIsEditingDietary(false);
    setIsEditingHomeBase(false);
  };

  const handleCancelEditingPreferences = () => {
    setIsEditingPreferences(false);
    setIsEditingCuisines(false);
    setIsEditingDietary(false);
    setIsEditingHomeBase(false);
  };

  const handleSavePreferences = async () => {
    const success = await saveUserUpdate({
      preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
      dietary_restrictions: selectedDietary.map(r => r.toLowerCase()),
      home_base: selectedHomeBase || undefined,
      spice_tolerance: editedPreferencesSpiceTolerance,
    });
    if (success) handleCancelEditingPreferences();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.screenHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          {onBackToTabs && (
            <TouchableOpacity style={styles.backButton} onPress={onBackToTabs}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.editTopButton} onPress={handleStartEditingPreferences}>
            <Text style={styles.editTopButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: insets.bottom + 8 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <ProfileHeader
          user={user}
          onEditProfile={handleEditProfile}
          isEditingProfile={isEditingProfile}
          editedName={editedName}
          editedUsername={editedUsername}
          editedProfilePhoto={editedProfilePhoto}
          editedSpiceTolerance={editedSpiceTolerance}
          onSetEditedName={setEditedName}
          onSetEditedUsername={setEditedUsername}
          onSetEditedSpiceTolerance={setEditedSpiceTolerance}
          onSaveProfile={handleSaveProfile}
          onCancelEditProfile={handleCancelEditProfile}
          onProfilePhotoChange={handleProfilePhotoChange}
          getSpiceEmoji={getSpiceEmoji}
          getSpiceLabel={getSpiceLabel}
        />

        <TastePreferencesCard
          user={user}
          isEditingPreferences={isEditingPreferences}
          editedPreferencesSpiceTolerance={editedPreferencesSpiceTolerance}
          onSetEditedPreferencesSpiceTolerance={setEditedPreferencesSpiceTolerance}
          onStartEditingPreferences={handleStartEditingPreferences}
          onCancelEditingPreferences={handleCancelEditingPreferences}
          onSavePreferences={handleSavePreferences}
          isEditingCuisines={isEditingCuisines}
          selectedCuisines={selectedCuisines}
          cuisineSearch={cuisineSearch}
          showAllCuisines={showAllCuisines}
          onSetCuisineSearch={setCuisineSearch}
          onSetShowAllCuisines={setShowAllCuisines}
          onToggleCuisine={toggleCuisine}
          onCancelEditingCuisines={cancelEditingCuisines}
          onSaveCuisines={saveCuisines}
          getFilteredCuisines={getFilteredCuisines}
          isEditingDietary={isEditingDietary}
          selectedDietary={selectedDietary}
          onToggleDietary={toggleDietary}
          onCancelEditingDietary={cancelEditingDietary}
          onSaveDietary={saveDietary}
          isEditingHomeBase={isEditingHomeBase}
          selectedHomeBase={selectedHomeBase}
          homeBaseSearch={homeBaseSearch}
          showHomeBasePicker={showHomeBasePicker}
          onSetShowHomeBasePicker={setShowHomeBasePicker}
          onSetHomeBaseSearch={setHomeBaseSearch}
          onSelectHomeBaseCity={selectHomeBaseCity}
          onCancelEditingHomeBase={cancelEditingHomeBase}
          onSaveHomeBase={saveHomeBase}
          getFilteredHomeBaseCities={getFilteredHomeBaseCities}
          getSpiceEmoji={getSpiceEmoji}
          getSpiceLabel={getSpiceLabel}
        />

        <SavedRestaurantsList
          user={user}
          top3Restaurants={top3Restaurants}
          onSelectRestaurant={onSelectRestaurant}
          isEditingTop3={isEditingTop3}
          selectedTop3={selectedTop3}
          top3Search={top3Search}
          onSetTop3Search={setTop3Search}
          onStartEditingTop3={startEditingTop3}
          onCancelEditingTop3={cancelEditingTop3}
          onSaveTop3={saveTop3}
          onToggleTop3Restaurant={toggleTop3Restaurant}
          getFilteredTop3Restaurants={getFilteredTop3Restaurants}
          getFavoriteDishesForRestaurant={getFavoriteDishesForRestaurant}
          triedDishes={triedDishes}
          loadingTriedDishes={loadingTriedDishes}
          onSignOut={onSignOut}
        />

        {/* Preview Onboarding — at the very bottom */}
        {onTestOnboarding && (
          <TouchableOpacity style={styles.previewButton} onPress={onTestOnboarding}>
            <Text style={styles.previewButtonText}>Preview Onboarding</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenHeader: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontFamily: 'DMSans-Regular',
    fontSize: 18,
    color: '#6B7280',
  },
  screenTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 28,
    letterSpacing: -1,
    color: '#111827',
  },
  titleAccent: {
    fontFamily: 'PlayfairDisplay-Italic',
    color: '#E9323D',
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  testButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  screenHeaderDivider: {
    height: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
});
