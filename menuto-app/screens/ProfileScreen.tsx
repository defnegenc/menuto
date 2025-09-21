import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';
import { theme } from '../theme';
import { FavoriteRestaurant } from '../types';
import { SearchBar } from '../components/SearchBar';

const POPULAR_CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 
  'Thai', 'French', 'American', 'Korean', 'Vietnamese',
  'Mediterranean', 'Greek', 'Spanish', 'Turkish'
];

const ALL_CUISINES = [
  // Popular cuisines (already shown above)
  ...POPULAR_CUISINES,
  
  // Regional Asian
  'Persian', 'Georgian', 'Nepalese', 'Pakistani',
  'Bangladeshi', 'Sri Lankan', 'Afghan', 'Indonesian',
  'Malaysian', 'Filipino', 'Burmese', 'Laotian', 'Cambodian',
  
  // Middle Eastern & North African
  'Lebanese', 'Moroccan', 'Tunisian', 'Algerian', 'Egyptian', 'Israeli',
  'Syrian', 'Jordanian', 'Iraqi', 'Yemeni', 'Ethiopian',
  'Eritrean', 'Sudanese',
  
  // European
  'Russian', 'Ukrainian', 'Polish', 'Hungarian', 'Czech',
  'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Albanian',
  'Portuguese', 'Dutch', 'German', 'Austrian', 'Swiss',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Estonian',
  'Latvian', 'Lithuanian',
  
  // Latin American & Caribbean
  'Peruvian', 'Colombian', 'Venezuelan', 'Ecuadorian', 'Brazilian',
  'Argentinian', 'Chilean', 'Bolivian', 'Paraguayan', 'Uruguayan',
  'Cuban', 'Dominican', 'Puerto Rican', 'Jamaican', 'Haitian',
  'Trinidadian', 'Barbadian',
  
  // African
  'Nigerian', 'Ghanaian', 'Senegalese', 'Ivorian', 'Malian',
  'South African', 'Kenyan', 'Tanzanian', 'Ugandan',
  
  // Specialty & Fusion
  'Fusion', 'Experimental', 'Vegan', 'Vegetarian', 'Raw', 'Molecular Gastronomy',
  'Farm-to-Table', 'Comfort Food', 'Soul Food', 'Cajun', 'Creole'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Nut-Free', 'Keto', 'Pescatarian', 'Halal', 'Kosher'
];

const HOME_BASE_CITIES = [
  // Major US cities
  { name: 'New York', coordinates: '40.7128,-74.0060', country: 'USA' },
  { name: 'San Francisco', coordinates: '37.7749,-122.4194', country: 'USA' },
  { name: 'Los Angeles', coordinates: '34.0522,-118.2437', country: 'USA' },
  { name: 'Chicago', coordinates: '41.8781,-87.6298', country: 'USA' },
  { name: 'Seattle', coordinates: '47.6062,-122.3321', country: 'USA' },
  { name: 'Boston', coordinates: '42.3601,-71.0589', country: 'USA' },
  { name: 'Austin', coordinates: '30.2672,-97.7431', country: 'USA' },
  { name: 'Miami', coordinates: '25.7617,-80.1918', country: 'USA' },
  { name: 'Denver', coordinates: '39.7392,-104.9903', country: 'USA' },
  { name: 'Portland', coordinates: '45.5152,-122.6784', country: 'USA' },
  { name: 'Nashville', coordinates: '36.1627,-86.7816', country: 'USA' },
  { name: 'Atlanta', coordinates: '33.7490,-84.3880', country: 'USA' },
  { name: 'Dallas', coordinates: '32.7767,-96.7970', country: 'USA' },
  { name: 'Houston', coordinates: '29.7604,-95.3698', country: 'USA' },
  { name: 'Phoenix', coordinates: '33.4484,-112.0740', country: 'USA' },
  { name: 'Las Vegas', coordinates: '36.1699,-115.1398', country: 'USA' },
  
  // International cities
  { name: 'London', coordinates: '51.5074,-0.1278', country: 'UK' },
  { name: 'Paris', coordinates: '48.8566,2.3522', country: 'France' },
  { name: 'Tokyo', coordinates: '35.6762,139.6503', country: 'Japan' },
  { name: 'Sydney', coordinates: '-33.8688,151.2093', country: 'Australia' },
  { name: 'Toronto', coordinates: '43.6532,-79.3832', country: 'Canada' },
  { name: 'Vancouver', coordinates: '49.2827,-123.1207', country: 'Canada' },
  { name: 'Berlin', coordinates: '52.5200,13.4050', country: 'Germany' },
  { name: 'Amsterdam', coordinates: '52.3676,4.9041', country: 'Netherlands' },
  { name: 'Barcelona', coordinates: '41.3851,2.1734', country: 'Spain' },
  { name: 'Rome', coordinates: '41.9028,12.4964', country: 'Italy' },
  { name: 'Madrid', coordinates: '40.4168,-3.7038', country: 'Spain' },
  { name: 'Milan', coordinates: '45.4642,9.1900', country: 'Italy' },
  { name: 'Zurich', coordinates: '47.3769,8.5417', country: 'Switzerland' },
  { name: 'Vienna', coordinates: '48.2082,16.3738', country: 'Austria' },
  { name: 'Prague', coordinates: '50.0755,14.4378', country: 'Czech Republic' },
  { name: 'Warsaw', coordinates: '52.2297,21.0122', country: 'Poland' },
  { name: 'Stockholm', coordinates: '59.3293,18.0686', country: 'Sweden' },
  { name: 'Copenhagen', coordinates: '55.6761,12.5683', country: 'Denmark' },
  { name: 'Oslo', coordinates: '59.9139,10.7522', country: 'Norway' },
  { name: 'Helsinki', coordinates: '60.1699,24.9384', country: 'Finland' },
];

interface Props {
  onSelectRestaurant: (restaurant: FavoriteRestaurant) => void;
  onSignOut?: () => void;
}

export function ProfileScreen({ onSelectRestaurant, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser, userId } = useStore();
  
  // Use favorite restaurants (first 3) for the top restaurants display
  const top3Restaurants = user?.favorite_restaurants?.slice(0, 3) || [];
  
  // Edit mode state
  const [isEditingCuisines, setIsEditingCuisines] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSearch, setCuisineSearch] = useState<string>('');
  const [showAllCuisines, setShowAllCuisines] = useState<boolean>(false);
  
  // Dietary restrictions edit state
  const [isEditingDietary, setIsEditingDietary] = useState(false);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [isEditingTop3, setIsEditingTop3] = useState(false);
  const [selectedTop3, setSelectedTop3] = useState<FavoriteRestaurant[]>([]);
  const [top3Search, setTop3Search] = useState('');
  
  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  // Home base location state
  const [isEditingHomeBase, setIsEditingHomeBase] = useState(false);
  const [selectedHomeBase, setSelectedHomeBase] = useState<string | null>(null);
  const [homeBaseSearch, setHomeBaseSearch] = useState('');
  const [showHomeBasePicker, setShowHomeBasePicker] = useState(false);

  // Load profile photo from user data when component mounts or user changes
  React.useEffect(() => {
    if (user?.profile_photo) {
      console.log('📸 Loading profile photo from user data:', user.profile_photo);
      setProfilePhoto(user.profile_photo);
    }
  }, [user?.profile_photo]);

  // Load home base from user data
  React.useEffect(() => {
    if (user?.home_base) {
      setSelectedHomeBase(user.home_base);
    }
  }, [user?.home_base]);
  
  const getSpiceEmoji = (level: number) => {
    return '🌶️';
  };
  
  const getPriceEmoji = (level: number) => {
    return '$'.repeat(level);
  };

  const handleProfilePhotoPress = () => {
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
                const photoUri = result.assets[0].uri;
                setProfilePhoto(photoUri);
                
                // Save to backend
                if (user && userId) {
                  console.log('📸 Saving profile photo to backend:', photoUri);
                  const updatedUser = {
                    ...user,
                    profile_photo: photoUri,
                    preferred_cuisines: user.preferred_cuisines || [],
                    spice_tolerance: user.spice_tolerance || 3,
                    price_preference: user.price_preference || 2,
                    dietary_restrictions: user.dietary_restrictions || [],
                    favorite_restaurants: user.favorite_restaurants || [],
                    favorite_dishes: user.favorite_dishes || [],
                  };
                  console.log('📸 Updated user object:', updatedUser);
                  setUser(updatedUser, userId);
                } else {
                  console.log('❌ Cannot save profile photo - missing user or userId:', { user: !!user, userId });
                }
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
                const photoUri = result.assets[0].uri;
                setProfilePhoto(photoUri);
                
                // Save to backend
                if (user && userId) {
                  console.log('📸 Saving profile photo to backend:', photoUri);
                  const updatedUser = {
                    ...user,
                    profile_photo: photoUri,
                    preferred_cuisines: user.preferred_cuisines || [],
                    spice_tolerance: user.spice_tolerance || 3,
                    price_preference: user.price_preference || 2,
                    dietary_restrictions: user.dietary_restrictions || [],
                    favorite_restaurants: user.favorite_restaurants || [],
                    favorite_dishes: user.favorite_dishes || [],
                  };
                  console.log('📸 Updated user object:', updatedUser);
                  setUser(updatedUser, userId);
                } else {
                  console.log('❌ Cannot save profile photo - missing user or userId:', { user: !!user, userId });
                }
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

  // Initialize selected cuisines when entering edit mode
  const startEditingCuisines = () => {
    const currentCuisines = user?.preferred_cuisines?.map(c => 
      c.charAt(0).toUpperCase() + c.slice(1)
    ) || [];
    setSelectedCuisines(currentCuisines);
    setIsEditingCuisines(true);
  };

  const saveCuisines = () => {
    if (userId && user) {
      const updatedUser = {
        ...user,
        preferred_cuisines: selectedCuisines.map(c => c.toLowerCase()),
        spice_tolerance: user.spice_tolerance || 3,
        price_preference: user.price_preference || 2,
        dietary_restrictions: user.dietary_restrictions || [],
        favorite_restaurants: user.favorite_restaurants || [],
        favorite_dishes: user.favorite_dishes || [],
      };
      setUser(updatedUser, userId);
    }
    setIsEditingCuisines(false);
    setCuisineSearch('');
    setShowAllCuisines(false);
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

  const removeCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => prev.filter(c => c !== cuisine));
  };

  // Dietary restrictions editing functions
  const startEditingDietary = () => {
    const currentDietary = user?.dietary_restrictions?.map(r => 
      r.charAt(0).toUpperCase() + r.slice(1)
    ) || [];
    setSelectedDietary(currentDietary);
    setIsEditingDietary(true);
  };

  const saveDietary = () => {
    if (userId && user) {
      const updatedUser = {
        ...user,
        dietary_restrictions: selectedDietary.map(r => r.toLowerCase()),
        preferred_cuisines: user.preferred_cuisines || [],
        spice_tolerance: user.spice_tolerance || 3,
        price_preference: user.price_preference || 2,
        favorite_restaurants: user.favorite_restaurants || [],
        favorite_dishes: user.favorite_dishes || [],
      };
      setUser(updatedUser, userId);
    }
    setIsEditingDietary(false);
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

  const removeDietary = (restriction: string) => {
    setSelectedDietary(prev => prev.filter(r => r !== restriction));
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
      spice_tolerance: user.spice_tolerance || 0,
      price_preference: user.price_preference || 0,
      dietary_restrictions: user.dietary_restrictions || [],
      favorite_restaurants: user.favorite_restaurants || [],
      favorite_dishes: user.favorite_dishes || [],
    };

    setUser(updatedUser, userId);
    setIsEditingTop3(false);
    setTop3Search('');
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
      // Add to the end to maintain order
      setSelectedTop3(prev => [...prev, restaurant]);
    }
  };

  const removeTop3Restaurant = (restaurant: FavoriteRestaurant) => {
    setSelectedTop3(prev => prev.filter(r => r.place_id !== restaurant.place_id));
  };

  // Home base editing functions
  const startEditingHomeBase = () => {
    setSelectedHomeBase(user?.home_base || null);
    setIsEditingHomeBase(true);
  };

  const saveHomeBase = () => {
    if (userId && user) {
      const updatedUser = {
        ...user,
        home_base: selectedHomeBase || undefined,
        preferred_cuisines: user.preferred_cuisines || [],
        spice_tolerance: user.spice_tolerance || 3,
        price_preference: user.price_preference || 2,
        dietary_restrictions: user.dietary_restrictions || [],
        favorite_restaurants: user.favorite_restaurants || [],
        favorite_dishes: user.favorite_dishes || [],
      };
      setUser(updatedUser, userId);
    }
    setIsEditingHomeBase(false);
    setShowHomeBasePicker(false);
    setHomeBaseSearch('');
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
      city.name.toLowerCase().includes(homeBaseSearch.toLowerCase()) ||
      (city.country && city.country.toLowerCase().includes(homeBaseSearch.toLowerCase()))
    );
  };

  const getFilteredTop3Restaurants = () => {
    const allRestaurants = user?.favorite_restaurants || [];
    if (!top3Search.trim()) return allRestaurants;
    
    return allRestaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(top3Search.toLowerCase()) ||
      restaurant.vicinity.toLowerCase().includes(top3Search.toLowerCase()) ||
      (restaurant.cuisine_type && restaurant.cuisine_type.toLowerCase().includes(top3Search.toLowerCase()))
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

  const renderChip = (text: string) => (
    <View key={text} style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollViewContent, { paddingBottom: insets.bottom + 8 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
        {/* Header with Profile Pic and Name */}
        <View style={styles.header}>
          <View style={styles.profilePicContainer}>
            <TouchableOpacity style={styles.profilePic} onPress={handleProfilePhotoPress}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <Text style={styles.profilePicText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
              <View style={styles.cameraIconContainer}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, theme.typography.h1.fancy]}>Your Preferences</Text>
          
          {/* Cuisine Preferences */}
          <View style={styles.preferenceGroup}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceLabel}>Favorite Cuisines</Text>
              {!isEditingCuisines && (
                <TouchableOpacity onPress={startEditingCuisines}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isEditingCuisines ? (
              // Edit mode
              <View>
                <SearchBar
                  value={cuisineSearch}
                  onChangeText={setCuisineSearch}
                  placeholder="Search cuisines (e.g., Turkish, Georgian, Persian...)"
                />
                
                {showAllCuisines && !cuisineSearch.trim() && (
                  <TouchableOpacity 
                    style={styles.collapseTopButton}
                    onPress={() => setShowAllCuisines(false)}
                  >
                    <Text style={styles.collapseTopButtonText}>
                      − Collapse Cuisines
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Selected cuisines with X buttons */}
                {selectedCuisines.length > 0 && (
                  <View style={styles.selectedCuisinesContainer}>
                    {selectedCuisines.map(cuisine => (
                      <View key={cuisine} style={styles.selectedCuisineChip}>
                        <Text style={styles.selectedCuisineText}>{cuisine}</Text>
                        <TouchableOpacity 
                          style={styles.removeCuisineButton}
                          onPress={() => removeCuisine(cuisine)}
                        >
                          <Text style={styles.removeCuisineText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Available cuisines to select */}
                <View style={styles.chipsContainer}>
                  {getFilteredCuisines()
                    .filter(cuisine => !selectedCuisines.includes(cuisine))
                    .map(cuisine => (
                      <TouchableOpacity
                        key={cuisine}
                        style={styles.chip}
                        onPress={() => toggleCuisine(cuisine)}
                      >
                        <Text style={styles.chipText}>{cuisine}</Text>
                      </TouchableOpacity>
                    ))
                  }
                </View>
                
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
                
                {showAllCuisines && !cuisineSearch.trim() && (
                  <TouchableOpacity 
                    style={styles.collapseButton}
                    onPress={() => setShowAllCuisines(false)}
                  >
                    <Text style={styles.collapseButtonText}>
                      − Show Less
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Save/Cancel buttons */}
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingCuisines}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveCuisines}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Display mode
              user?.preferred_cuisines && user.preferred_cuisines.length > 0 ? (
                <View style={styles.chipsContainer}>
                  {user.preferred_cuisines.map(cuisine => 
                    renderChip(cuisine.charAt(0).toUpperCase() + cuisine.slice(1))
                  )}
                </View>
              ) : (
                <Text style={styles.emptyCuisinesText}>No cuisines selected</Text>
              )
            )}
          </View>

          {/* Spice Tolerance */}
          {user?.spice_tolerance && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Spice Tolerance</Text>
              <View style={styles.spiceContainer}>
                <Text style={styles.spiceEmoji}>{getSpiceEmoji(user.spice_tolerance)}</Text>
                <Text style={styles.spiceLevel}>{user.spice_tolerance}/5</Text>
              </View>
            </View>
          )}



          {/* Dietary Restrictions */}
          <View style={styles.preferenceGroup}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceLabel}>Dietary Restrictions</Text>
              {!isEditingDietary && (
                <TouchableOpacity onPress={startEditingDietary}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isEditingDietary ? (
              // Edit mode
              <View>
                {/* Selected dietary restrictions with X buttons */}
                {selectedDietary.length > 0 && (
                  <View style={styles.selectedCuisinesContainer}>
                    {selectedDietary.map(restriction => (
                      <View key={restriction} style={styles.selectedCuisineChip}>
                        <Text style={styles.selectedCuisineText}>{restriction}</Text>
                        <TouchableOpacity 
                          style={styles.removeCuisineButton}
                          onPress={() => removeDietary(restriction)}
                        >
                          <Text style={styles.removeCuisineText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Available dietary restrictions to select */}
                <View style={styles.chipsContainer}>
                  {DIETARY_RESTRICTIONS
                    .filter(restriction => !selectedDietary.includes(restriction))
                    .map(restriction => (
                      <TouchableOpacity
                        key={restriction}
                        style={styles.chip}
                        onPress={() => toggleDietary(restriction)}
                      >
                        <Text style={styles.chipText}>{restriction}</Text>
                      </TouchableOpacity>
                    ))
                  }
                </View>
                
                {/* Save/Cancel buttons */}
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingDietary}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveDietary}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Display mode
              user?.dietary_restrictions && user.dietary_restrictions.length > 0 ? (
                <View style={styles.chipsContainer}>
                  {user.dietary_restrictions.map(restriction => 
                    renderChip(restriction.charAt(0).toUpperCase() + restriction.slice(1))
                  )}
                </View>
              ) : (
                <Text style={styles.emptyCuisinesText}>No dietary restrictions selected</Text>
              )
            )}
          </View>

          {/* Home Base Location */}
          <View style={styles.preferenceGroup}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceLabel}>Home Base</Text>
              {!isEditingHomeBase && (
                <TouchableOpacity onPress={startEditingHomeBase}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isEditingHomeBase ? (
              // Edit mode
              <View>
                <TouchableOpacity 
                  style={styles.homeBaseSelector}
                  onPress={() => setShowHomeBasePicker(!showHomeBasePicker)}
                >
                  <View style={styles.homeBaseSelectorContent}>
                    <Text style={styles.homeBaseSelectorText}>
                      {selectedHomeBase || 'Select your home base city'}
                    </Text>
                    <Text style={styles.homeBaseSelectorIcon}>
                      {showHomeBasePicker ? '▲' : '▼'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {/* City Picker */}
                {showHomeBasePicker && (
                  <View style={styles.homeBasePickerContainer}>
                    <SearchBar
                      value={homeBaseSearch}
                      onChangeText={setHomeBaseSearch}
                      placeholder="Search cities..."
                      style={styles.homeBaseSearchInput}
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
                          <View style={styles.homeBaseCityInfo}>
                            <Text style={styles.homeBaseCityName}>{city.name}</Text>
                            {city.country && (
                              <Text style={styles.homeBaseCityCountry}>{city.country}</Text>
                            )}
                          </View>
                          {selectedHomeBase === city.name && (
                            <Text style={styles.homeBaseSelectedIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* Save/Cancel buttons */}
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingHomeBase}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveHomeBase}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Display mode
              <View style={styles.homeBaseDisplay}>
                <Text style={styles.homeBaseDisplayText}>
                  {user?.home_base ? `🏠 ${user.home_base}` : 'No home base set'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Top 3 Restaurants */}
        <View style={styles.section}>
          <View style={styles.preferenceHeader}>
            <Text style={styles.sectionTitle}>Your Top Restaurants</Text>
            {!isEditingTop3 && (
              <TouchableOpacity onPress={startEditingTop3}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isEditingTop3 ? (
            // Edit mode
            <View>
              <SearchBar
                value={top3Search}
                onChangeText={setTop3Search}
                placeholder="Search your restaurants..."
              />
              
              {/* Selected restaurants with X buttons */}
              {selectedTop3.length > 0 && (
                <View style={styles.selectedCuisinesContainer}>
                  {selectedTop3.map((restaurant, index) => (
                    <View key={restaurant.place_id} style={styles.selectedCuisineChip}>
                      <Text style={styles.selectedCuisineText}>
                        #{index + 1} {restaurant.name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.removeCuisineButton}
                        onPress={() => removeTop3Restaurant(restaurant)}
                      >
                        <Text style={styles.removeCuisineText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Available restaurants */}
              <View style={styles.chipsContainer}>
                {getFilteredTop3Restaurants()
                  .filter(restaurant => !selectedTop3.some(r => r.place_id === restaurant.place_id))
                  .map(restaurant => (
                    <TouchableOpacity
                      key={restaurant.place_id}
                      style={[
                        styles.chip,
                        selectedTop3.length >= 3 && { opacity: 0.5 }
                      ]}
                      onPress={() => toggleTop3Restaurant(restaurant)}
                      disabled={selectedTop3.length >= 3}
                    >
                      <Text style={styles.chipText}>{restaurant.name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
              
              {selectedTop3.length >= 3 && (
                <Text style={styles.emptyCuisinesText}>
                  Maximum number of restaurants selected
                </Text>
              )}
              
              {/* Save/Cancel buttons */}
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
            // Display mode
            <>
              {top3Restaurants.length > 0 ? (
                <View style={styles.restaurantsContainer}>
                  {top3Restaurants.map((restaurant: any, index: number) => (
                    <TouchableOpacity
                      key={restaurant.place_id}
                      style={styles.restaurantCard}
                      onPress={() => onSelectRestaurant(restaurant)}
                    >
                      <View style={styles.restaurantRank}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.restaurantInfo}>
                        <Text style={styles.restaurantName}>{restaurant.name}</Text>
                        <Text style={styles.restaurantLocation}>{restaurant.vicinity}</Text>
                        {restaurant.cuisine_type && (
                          <Text style={styles.restaurantCuisine}>{restaurant.cuisine_type}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
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
          <View style={[styles.signOutContainer, { paddingBottom: 0 }]}>
            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  profilePicContainer: {
    marginBottom: 16,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  preferenceGroup: {
    marginBottom: 32,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  editButton: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  selectedCuisinesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedCuisineChip: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCuisineText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 4,
  },
  removeCuisineButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeCuisineText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  expandButton: {
    backgroundColor: theme.colors.tertiary + '15',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
    borderStyle: 'dashed',
  },
  expandButtonText: {
    fontSize: 14,
    color: theme.colors.tertiary,
    fontWeight: '500',
  },
  collapseButton: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  collapseButtonText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  collapseTopButton: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  collapseTopButtonText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  },
  emptyCuisinesText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  spiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  spiceEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  spiceText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  spiceLevel: {
    fontSize: 24,
    color: '#DF403F',
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceEmoji: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  priceText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  restaurantsContainer: {
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  restaurantLocation: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: theme.colors.tertiary,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  signOutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  homeBaseDisplay: {
    paddingVertical: 8,
  },
  homeBaseDisplayText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  homeBaseDisplaySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  homeBaseSelector: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  homeBaseSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  homeBaseSelectorText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  homeBaseSelectorIcon: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  homeBasePickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    maxHeight: 200,
  },
  homeBaseSearchInput: {
    margin: 12,
  },
  homeBaseCityList: {
    maxHeight: 150,
  },
  homeBaseCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  homeBaseCityItemSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  homeBaseCityInfo: {
    flex: 1,
  },
  homeBaseCityName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  homeBaseCityCountry: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  homeBaseSelectedIcon: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});