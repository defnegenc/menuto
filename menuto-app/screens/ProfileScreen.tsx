import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';
import { theme } from '../theme';
import { FavoriteRestaurant } from '../types';
import { UnifiedHeader } from '../components/UnifiedHeader';
import { RestaurantCard } from '../components/RestaurantCard';
import { SearchBar } from '../components/SearchBar';
import { api } from '../services/api';

const POPULAR_CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 
  'Thai', 'French', 'American', 'Korean', 'Vietnamese',
  'Mediterranean', 'Greek', 'Spanish', 'Turkish'
];

const ALL_CUISINES = [
  ...POPULAR_CUISINES,
  'Persian', 'Georgian', 'Nepalese', 'Pakistani',
  'Bangladeshi', 'Sri Lankan', 'Afghan', 'Indonesian',
  'Malaysian', 'Filipino', 'Burmese', 'Laotian', 'Cambodian',
  'Lebanese', 'Moroccan', 'Tunisian', 'Algerian', 'Egyptian', 'Israeli',
  'Syrian', 'Jordanian', 'Iraqi', 'Yemeni', 'Ethiopian',
  'Eritrean', 'Sudanese',
  'Russian', 'Ukrainian', 'Polish', 'Hungarian', 'Czech',
  'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Albanian',
  'Portuguese', 'Dutch', 'German', 'Austrian', 'Swiss',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Estonian',
  'Latvian', 'Lithuanian',
  'Peruvian', 'Colombian', 'Venezuelan', 'Ecuadorian', 'Brazilian',
  'Argentinian', 'Chilean', 'Bolivian', 'Paraguayan', 'Uruguayan',
  'Cuban', 'Dominican', 'Puerto Rican', 'Jamaican', 'Haitian',
  'Trinidadian', 'Barbadian',
  'Nigerian', 'Ghanaian', 'Senegalese', 'Ivorian', 'Malian',
  'South African', 'Kenyan', 'Tanzanian', 'Ugandan',
  'Fusion', 'Experimental', 'Vegan', 'Vegetarian', 'Raw', 'Molecular Gastronomy',
  'Farm-to-Table', 'Comfort Food', 'Soul Food', 'Cajun', 'Creole'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Nut-Free', 'Keto', 'Pescatarian', 'Halal', 'Kosher'
];

const HOME_BASE_CITIES = [
  { name: 'New York', emoji: '🗽', coordinates: '40.7128,-74.0060' },
  { name: 'Los Angeles', emoji: '🌴', coordinates: '34.0522,-118.2437' },
  { name: 'San Francisco', emoji: '🌉', coordinates: '37.7749,-122.4194' },
  { name: 'London', emoji: '☕', coordinates: '51.5074,-0.1278' },
  { name: 'Istanbul', emoji: '🕌', coordinates: '41.0082,28.9784' },
];

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onSignOut?: () => void;
}

export function ProfileScreen({ onSelectRestaurant, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser, userId } = useStore();
  
  // Use top_3_restaurants from user data
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

  const getSpiceEmoji = (level: number) => {
    return '🌶️'.repeat(level);
  };

  const getSpiceLabel = (level: number) => {
    switch(level) {
      case 1: return 'Hand me the milk';
      case 2: return 'Gentle warmth';
      case 3: return 'Bring it on';
      case 4: return 'Spicy is my middle name';
      case 5: return 'Set me on fire';
      default: return 'Gentle warmth';
    }
  };

  const handleEditProfile = () => {
    setEditedName(user?.name || '');
    setEditedUsername(user?.username || '');
    setEditedProfilePhoto(user?.profile_photo || null);
    setEditedSpiceTolerance(user?.spice_tolerance || 3);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!userId || !user) return;

    const updatedUser = {
      ...user,
      name: editedName.trim(),
      username: editedUsername.trim(),
      profile_photo: editedProfilePhoto || undefined,
      spice_tolerance: editedSpiceTolerance,
      preferred_cuisines: user.preferred_cuisines || [],
      price_preference: user.price_preference || 2,
      dietary_restrictions: user.dietary_restrictions || [],
      favorite_restaurants: user.favorite_restaurants || [],
      favorite_dishes: user.favorite_dishes || [],
      top_3_restaurants: user.top_3_restaurants || [],
      home_base: user.home_base || undefined,
    };

    try {
      await api.updateUserPreferences(userId, updatedUser);
      setUser(updatedUser, userId);
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancelEditProfile = () => {
    setEditedName(user?.name || '');
    setEditedUsername(user?.username || '');
    setEditedProfilePhoto(user?.profile_photo || null);
    setEditedSpiceTolerance(user?.spice_tolerance || 3);
    setIsEditingProfile(false);
  };

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
    const currentCuisines = user?.preferred_cuisines?.map(c => 
      c.charAt(0).toUpperCase() + c.slice(1)
    ) || [];
    setSelectedCuisines(currentCuisines);
    setIsEditingCuisines(true);
  };

  const saveCuisines = async () => {
    if (!userId || !user) return;
    
    const updatedUser = {
      ...user,
      preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
      spice_tolerance: user.spice_tolerance || 3,
      price_preference: user.price_preference || 2,
      dietary_restrictions: user.dietary_restrictions || [],
      favorite_restaurants: user.favorite_restaurants || [],
      favorite_dishes: user.favorite_dishes || [],
      top_3_restaurants: user.top_3_restaurants || [],
      home_base: user.home_base || undefined,
    };

    try {
      await api.updateUserPreferences(userId, updatedUser);
      setUser(updatedUser, userId);
      setIsEditingCuisines(false);
      setCuisineSearch('');
      setShowAllCuisines(false);
    } catch (error) {
      console.error('Failed to update cuisines:', error);
      Alert.alert('Error', 'Failed to update cuisines. Please try again.');
    }
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
    const currentDietary = user?.dietary_restrictions?.map(r => 
      r.charAt(0).toUpperCase() + r.slice(1)
    ) || [];
    setSelectedDietary(currentDietary);
    setIsEditingDietary(true);
  };

  const saveDietary = async () => {
    if (!userId || !user) return;
    
    const updatedUser = {
      ...user,
      dietary_restrictions: selectedDietary.map(r => r.toLowerCase()),
      preferred_cuisines: user.preferred_cuisines || [],
      spice_tolerance: user.spice_tolerance || 3,
      price_preference: user.price_preference || 2,
      favorite_restaurants: user.favorite_restaurants || [],
      favorite_dishes: user.favorite_dishes || [],
      top_3_restaurants: user.top_3_restaurants || [],
      home_base: user.home_base || undefined,
    };

    try {
      await api.updateUserPreferences(userId, updatedUser);
      setUser(updatedUser, userId);
      setIsEditingDietary(false);
    } catch (error) {
      console.error('Failed to update dietary restrictions:', error);
      Alert.alert('Error', 'Failed to update dietary restrictions. Please try again.');
    }
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
    if (!userId || !user) return;
    
    const updatedUser = {
      ...user,
      home_base: selectedHomeBase || undefined,
      preferred_cuisines: user.preferred_cuisines || [],
      spice_tolerance: user.spice_tolerance || 3,
      price_preference: user.price_preference || 2,
      dietary_restrictions: user.dietary_restrictions || [],
      favorite_restaurants: user.favorite_restaurants || [],
      favorite_dishes: user.favorite_dishes || [],
      top_3_restaurants: user.top_3_restaurants || [],
    };

    try {
      await api.updateUserPreferences(userId, updatedUser);
      setUser(updatedUser, userId);
      setIsEditingHomeBase(false);
      setShowHomeBasePicker(false);
      setHomeBaseSearch('');
    } catch (error) {
      console.error('Failed to update home base:', error);
      Alert.alert('Error', 'Failed to update home base. Please try again.');
    }
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
    if (!user || !userId) return;
    
    const updatedUser = {
      ...user,
      top_3_restaurants: selectedTop3,
      preferred_cuisines: user.preferred_cuisines || [],
      spice_tolerance: user.spice_tolerance || 3,
      price_preference: user.price_preference || 2,
      dietary_restrictions: user.dietary_restrictions || [],
      favorite_restaurants: user.favorite_restaurants || [],
      favorite_dishes: user.favorite_dishes || [],
      home_base: user.home_base || undefined,
    };

    try {
      await api.updateUserPreferences(userId, updatedUser);
      setUser(updatedUser, userId);
      setIsEditingTop3(false);
      setTop3Search('');
    } catch (error) {
      console.error('Failed to update top restaurants:', error);
      Alert.alert('Error', 'Failed to update top restaurants. Please try again.');
    }
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
    
    return allRestaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(top3Search.toLowerCase()) ||
      restaurant.vicinity.toLowerCase().includes(top3Search.toLowerCase())
    );
  };

  const getFavoriteDishesForRestaurant = (restaurant: FavoriteRestaurant) => {
    return (user?.favorite_dishes || []).filter(dish => 
      dish.restaurant_id === restaurant.place_id || dish.restaurant_id === restaurant.name
    );
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        title="My profile"
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: insets.bottom + 8 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSectionHeader}>
          <TouchableOpacity onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.profileSection}>
          <View style={styles.profilePicContainer}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Text style={styles.profilePicText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userHandle}>@{user?.username || 'unknown'}</Text>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Your Preferences Section */}
        <View style={styles.section}>
          <View style={styles.preferenceHeader}>
            <Text style={styles.sectionTitle}>Your Preferences</Text>
            {!isEditingPreferences && (
              <TouchableOpacity onPress={() => {
                setSelectedCuisines(user?.preferred_cuisines?.map(c => c.charAt(0).toUpperCase() + c.slice(1)) || []);
                setSelectedDietary(user?.dietary_restrictions?.map(r => r.charAt(0).toUpperCase() + r.slice(1)) || []);
                setSelectedHomeBase(user?.home_base || null);
                setEditedPreferencesSpiceTolerance(user?.spice_tolerance || 3);
                setIsEditingPreferences(true);
                setIsEditingCuisines(false);
                setIsEditingDietary(false);
                setIsEditingHomeBase(false);
              }}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isEditingPreferences ? (
            <>
              {/* Spice Tolerance in Preferences Edit */}
              <View style={styles.preferenceGroup}>
                <Text style={styles.preferenceLabel}>Spice Tolerance</Text>
                <View style={styles.spiceSliderContainer}>
                  <View style={styles.currentSelectionDisplay}>
                    <Text style={styles.currentPeppers}>
                      {getSpiceEmoji(editedPreferencesSpiceTolerance)}
                    </Text>
                  </View>
                  <View style={styles.customSlider}>
                    <View style={styles.sliderTrack}>
                      <View
                        style={[
                          styles.sliderFill,
                          { width: `${((editedPreferencesSpiceTolerance - 1) / 4) * 100}%` }
                        ]}
                      />
                      <View style={styles.sliderStops}>
                        {[1, 2, 3, 4, 5].map((level) => (
                          <TouchableOpacity
                            key={level}
                            style={[
                              styles.sliderStop,
                              editedPreferencesSpiceTolerance >= level && styles.sliderStopActive,
                            ]}
                            onPress={() => setEditedPreferencesSpiceTolerance(level)}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.spiceDescription}>
                    {getSpiceLabel(editedPreferencesSpiceTolerance)}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
          
          {/* Favorite Cuisines */}
          <View style={styles.preferenceGroup}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceLabel}>Favorite Cuisines</Text>
            </View>
            
            {(isEditingCuisines || isEditingPreferences) ? (
              <View>
                <SearchBar
                  value={cuisineSearch}
                  onChangeText={setCuisineSearch}
                  placeholder="Search cuisines..."
                />
                
                {showAllCuisines && !cuisineSearch.trim() && (
                  <TouchableOpacity 
                    style={styles.collapseButton}
                    onPress={() => setShowAllCuisines(false)}
                  >
                    <Text style={styles.collapseButtonText}>− Collapse Cuisines</Text>
                  </TouchableOpacity>
                )}
                
                <View style={styles.chipsContainer}>
                  {getFilteredCuisines()
                    .filter(cuisine => !selectedCuisines.includes(cuisine))
                    .map(cuisine => (
                      <TouchableOpacity
                        key={cuisine}
                        onPress={() => toggleCuisine(cuisine)}
                      >
                        <View style={styles.cuisineChip}>
                          <Text style={styles.cuisineChipText}>{cuisine}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  }
                </View>
                
                {selectedCuisines.length > 0 && (
                  <View style={styles.selectedCuisinesContainer}>
                    <Text style={styles.selectedLabel}>Selected:</Text>
                    <View style={styles.chipsContainer}>
                      {selectedCuisines.map(cuisine => (
                        <TouchableOpacity
                          key={cuisine}
                          onPress={() => toggleCuisine(cuisine)}
                        >
                          <View style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                            <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>{cuisine}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                
                {!cuisineSearch.trim() && !showAllCuisines && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => setShowAllCuisines(true)}
                  >
                    <Text style={styles.expandButtonText}>
                      + Show More Cuisines ({ALL_CUISINES.length - POPULAR_CUISINES.length} more)
                    </Text>
                  </TouchableOpacity>
                )}
                
                {isEditingCuisines && !isEditingPreferences && (
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingCuisines}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveCuisines}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              user?.preferred_cuisines && user.preferred_cuisines.length > 0 ? (
                <View style={styles.chipsContainer}>
                  {user.preferred_cuisines.map(cuisine => (
                    <View key={cuisine} style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                      <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>
                        {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No cuisines selected</Text>
              )
            )}
          </View>

          {/* Dietary Restrictions */}
          <View style={styles.preferenceGroup}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceLabel}>Dietary Restrictions</Text>
            </View>
            
            {(isEditingDietary || isEditingPreferences) ? (
              <View>
                <View style={styles.chipsContainer}>
                  {DIETARY_RESTRICTIONS
                    .filter(restriction => !selectedDietary.includes(restriction))
                    .map(restriction => (
                      <TouchableOpacity
                        key={restriction}
                        onPress={() => toggleDietary(restriction)}
                      >
                        <View style={styles.cuisineChip}>
                          <Text style={styles.cuisineChipText}>{restriction}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  }
                </View>
                
                {selectedDietary.length > 0 && (
                  <View style={styles.selectedCuisinesContainer}>
                    <Text style={styles.selectedLabel}>Selected:</Text>
                    <View style={styles.chipsContainer}>
                      {selectedDietary.map(restriction => (
                        <TouchableOpacity
                          key={restriction}
                          onPress={() => toggleDietary(restriction)}
                        >
                          <View style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                            <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>{restriction}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                
                {isEditingDietary && !isEditingPreferences && (
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingDietary}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveDietary}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              user?.dietary_restrictions && user.dietary_restrictions.length > 0 ? (
                <View style={styles.chipsContainer}>
                  {user.dietary_restrictions.map(restriction => (
                    <View key={restriction} style={[styles.cuisineChip, styles.cuisineChipSelected]}>
                      <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>
                        {restriction.charAt(0).toUpperCase() + restriction.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No dietary restrictions selected</Text>
              )
            )}
          </View>

          {/* Home Base */}
          <View style={styles.preferenceGroup}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceLabel}>Home Base</Text>
            </View>
            
            {(isEditingHomeBase || isEditingPreferences) ? (
              <View>
                <TouchableOpacity 
                  style={styles.homeBaseSelector}
                  onPress={() => setShowHomeBasePicker(!showHomeBasePicker)}
                >
                  <View style={styles.homeBaseSelectorContent}>
                    <Text style={styles.homeBaseSelectorText}>
                      {selectedHomeBase ? HOME_BASE_CITIES.find(c => c.name === selectedHomeBase)?.emoji + ' ' + selectedHomeBase : 'Select your home base city'}
                    </Text>
                    <Text style={styles.homeBaseSelectorIcon}>
                      {showHomeBasePicker ? '▲' : '▼'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {showHomeBasePicker && (
                  <View style={styles.homeBasePickerContainer}>
                    <SearchBar
                      value={homeBaseSearch}
                      onChangeText={setHomeBaseSearch}
                      placeholder="Search cities..."
                    />
                    
                    <ScrollView style={styles.homeBaseCityList} showsVerticalScrollIndicator={false}>
                      {getFilteredHomeBaseCities().map((city) => (
                        <TouchableOpacity
                          key={city.name}
                          style={[
                            styles.homeBaseCityItem,
                            selectedHomeBase === city.name && styles.homeBaseCityItemSelected
                          ]}
                          onPress={() => selectHomeBaseCity(city.name)}
                        >
                          <Text style={styles.homeBaseCityName}>{city.emoji} {city.name}</Text>
                          {selectedHomeBase === city.name && (
                            <Text style={styles.homeBaseSelectedIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {isEditingHomeBase && !isEditingPreferences && (
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingHomeBase}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveHomeBase}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.homeBaseDisplayText}>
                {user?.home_base ? HOME_BASE_CITIES.find(c => c.name === user.home_base)?.emoji + ' ' + user.home_base : 'No home base set'}
              </Text>
            )}
          </View>
          
          {isEditingPreferences && (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => {
                setIsEditingPreferences(false);
                setIsEditingCuisines(false);
                setIsEditingDietary(false);
                setIsEditingHomeBase(false);
              }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={async () => {
                if (!userId || !user) return;
                
                const updatedUser = {
                  ...user,
                  preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
                  dietary_restrictions: selectedDietary.map(r => r.toLowerCase()),
                  home_base: selectedHomeBase || undefined,
                  spice_tolerance: editedPreferencesSpiceTolerance,
                  favorite_restaurants: user.favorite_restaurants || [],
                  favorite_dishes: user.favorite_dishes || [],
                  top_3_restaurants: user.top_3_restaurants || [],
                };
                
                try {
                  await api.updateUserPreferences(userId, updatedUser);
                  setUser(updatedUser, userId);
                  setIsEditingPreferences(false);
                  setIsEditingCuisines(false);
                  setIsEditingDietary(false);
                  setIsEditingHomeBase(false);
                } catch (error) {
                  console.error('Failed to update preferences:', error);
                  Alert.alert('Error', 'Failed to update preferences. Please try again.');
                }
              }}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Top 3 Restaurants */}
        <View style={styles.section}>
          <View style={styles.preferenceHeader}>
            <Text style={styles.sectionTitle}>Your Top Restaurants</Text>
            {!isEditingTop3 && (
              <TouchableOpacity onPress={startEditingTop3}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isEditingTop3 ? (
            <View>
              <SearchBar
                value={top3Search}
                onChangeText={setTop3Search}
                placeholder="Search your restaurants..."
              />
              
              {selectedTop3.length > 0 && (
                <View style={styles.selectedTop3Container}>
                  <Text style={styles.selectedLabel}>Selected ({selectedTop3.length}/3):</Text>
                  {selectedTop3.map((restaurant, index) => (
                    <View key={restaurant.place_id} style={styles.selectedTop3Item}>
                      <Text style={styles.selectedTop3Text}>#{index + 1} {restaurant.name}</Text>
                      <TouchableOpacity 
                        style={styles.removeTop3Button}
                        onPress={() => toggleTop3Restaurant(restaurant)}
                      >
                        <Text style={styles.removeTop3Text}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.top3ChipsContainer}>
                {getFilteredTop3Restaurants()
                  .filter(restaurant => !selectedTop3.some(r => r.place_id === restaurant.place_id))
                  .map(restaurant => (
                    <TouchableOpacity
                      key={restaurant.place_id}
                      style={[
                        styles.top3Chip,
                        selectedTop3.length >= 3 && styles.top3ChipDisabled
                      ]}
                      onPress={() => toggleTop3Restaurant(restaurant)}
                      disabled={selectedTop3.length >= 3}
                    >
                      <Text style={[styles.top3ChipText, selectedTop3.length >= 3 && styles.top3ChipTextDisabled]}>
                        {restaurant.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
              
              {selectedTop3.length >= 3 && (
                <Text style={styles.emptyText}>Maximum number of restaurants selected</Text>
              )}
              
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingTop3}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveTop3}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {top3Restaurants.length > 0 ? (
                <View style={styles.top3RestaurantsContainer}>
                  {top3Restaurants.map((restaurant, index) => (
                    <RestaurantCard
                      key={restaurant.place_id}
                      restaurant={restaurant}
                      dishes={getFavoriteDishesForRestaurant(restaurant)}
                      onSelectRestaurant={onSelectRestaurant}
                      onRemoveRestaurant={() => {}}
                      rank={index + 1}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No top restaurants selected</Text>
                  <Text style={styles.emptyStateSubtext}>Tap "Edit" to choose your top 3</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Sign Out Button */}
        {onSignOut && (
          <View style={styles.signOutContainer}>
            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelEditProfile}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancelEditProfile}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile}>
              <Text style={styles.modalSubmitButton}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Profile Photo */}
            <View style={styles.modalProfilePicContainer}>
              {editedProfilePhoto ? (
                <Image source={{ uri: editedProfilePhoto }} style={styles.modalProfilePhoto} />
              ) : (
                <View style={styles.modalProfilePicPlaceholder}>
                  <Text style={styles.modalProfilePicText}>
                    {editedName ? editedName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.changePhotoButton} onPress={handleProfilePhotoChange}>
                <Text style={styles.changePhotoButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Your Name"
              />
            </View>

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.textInput}
                value={editedUsername}
                onChangeText={setEditedUsername}
                placeholder="Your Username"
                autoCapitalize="none"
              />
            </View>

            {/* Spice Tolerance Slider */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Spice Tolerance</Text>
              <View style={styles.spiceSliderContainer}>
                <View style={styles.currentSelectionDisplay}>
                  <Text style={styles.currentPeppers}>
                    {getSpiceEmoji(editedSpiceTolerance)}
                  </Text>
                </View>
                <View style={styles.customSlider}>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${((editedSpiceTolerance - 1) / 4) * 100}%` }
                      ]}
                    />
                    <View style={styles.sliderStops}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.sliderStop,
                            editedSpiceTolerance >= level && styles.sliderStopActive,
                          ]}
                          onPress={() => setEditedSpiceTolerance(level)}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.spiceDescription}>
                  {getSpiceLabel(editedSpiceTolerance)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  profileSectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  profilePicContainer: {
    marginBottom: theme.spacing.xs,
  },
  profilePicPlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
  },
  profilePicText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  userName: {
    fontSize: 28,
    fontWeight: theme.typography.weights.semibold,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  userHandle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.normal,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.regularItalic,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: theme.typography.weights.normal,
    color: '#000000',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  preferenceGroup: {
    marginBottom: theme.spacing.xl,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  preferenceLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  editButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  cuisineChip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cuisineChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cuisineChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  cuisineChipTextSelected: {
    color: '#FFFFFF',
  },
  selectedCuisinesContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectedLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  expandButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  expandButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  collapseButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  collapseButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  homeBaseDisplayText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: theme.typography.weights.medium,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  homeBaseSelector: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  homeBaseSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeBaseSelectorText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  homeBaseSelectorIcon: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  homeBasePickerContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  homeBaseCityList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
  },
  homeBaseCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  homeBaseCityItemSelected: {
    backgroundColor: theme.colors.secondary + '20',
  },
  homeBaseCityName: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  homeBaseSelectedIcon: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  top3RestaurantsContainer: {
    gap: theme.spacing.sm,
  },
  selectedTop3Container: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.secondary + '20',
    borderRadius: 10,
  },
  selectedTop3Item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedTop3Text: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  removeTop3Button: {
    padding: theme.spacing.xs,
  },
  removeTop3Text: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  top3ChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  top3Chip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  top3ChipDisabled: {
    opacity: 0.5,
  },
  top3ChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  top3ChipTextDisabled: {
    color: theme.colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.muted,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  signOutContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 20,
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancelButton: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalSubmitButton: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  modalProfilePicContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalProfilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  modalProfilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalProfilePicText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  changePhotoButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePhotoButtonText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  spiceSliderContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  currentSelectionDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  currentPeppers: {
    fontSize: 28,
    lineHeight: 32,
  },
  customSlider: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  sliderStops: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  sliderStop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  sliderStopActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilies.regular,
  },
});
