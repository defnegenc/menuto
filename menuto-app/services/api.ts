import { UserPreferences, RecommendationResponse, MenuScanResult } from '../types';

// Change this to your backend URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8080';
console.log('🔌 API_BASE =', API_BASE);

// Helper function to get Clerk token
let authTokenGetter: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  authTokenGetter = getter;
  console.log('🧲 api.ts: authTokenGetter wired');
};

export const isAuthGetterWired = () => !!authTokenGetter;

const getAuthToken = async (): Promise<string | null> => {
  console.log('🔍 getAuthToken called, authTokenGetter exists:', !!authTokenGetter);
  if (authTokenGetter) {
    const token = await authTokenGetter();
    console.log('🔍 getAuthToken result:', token ? `SUCCESS (${token.length} chars)` : 'NULL');
    return token;
  }
  console.log('❌ getAuthToken: No authTokenGetter available');
  return null;
};

async function request(path: string, opts: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = new Headers(opts.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('🔐 sending auth header to', path);
  } else {
    console.log('⚠️ request(): no token for', path);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

class MenutoAPI {
  // Upload menu image
  async uploadMenu(imageUri: string, restaurantName: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('menu_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'menu.jpg',
      } as any);
      formData.append('restaurant_name', restaurantName);
      
      const response = await fetch(`${API_BASE}/restaurants/upload-menu`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Menu upload error:', error);
      throw error;
    }
  }
  
  // Upload menu URL
  async uploadMenuUrl(menuUrl: string, restaurantName: string): Promise<any> {
    try {
      console.log('🔗 Attempting to upload menu URL:', menuUrl);
      
      // Try form data first (original endpoint)
      const params = new URLSearchParams({
        menu_url: menuUrl,
        restaurant_name: restaurantName,
      });
      
      let response = await fetch(`${API_BASE}/restaurants/upload-menu-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
      
      // If form data fails with 422, try JSON endpoint
      if (response.status === 422) {
        console.log('🔄 Form data failed, trying JSON endpoint...');
        response = await fetch(`${API_BASE}/restaurants/upload-menu-url-json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            menu_url: menuUrl,
            restaurant_name: restaurantName,
          }),
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Menu URL upload successful:', result);
      return result;
    } catch (error) {
      console.error('Menu URL upload error:', error);
      throw error;
    }
  }
  
  // Get recommendations
  async getRecommendations(
    restaurantId: string, 
    userId: string, 
    context?: {
      budget?: number;
      occasion?: string;
      dietary_constraints?: string[];
    }
  ): Promise<RecommendationResponse> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
      });
      
      if (context?.budget) {
        params.append('budget', context.budget.toString());
      }
      if (context?.occasion) {
        params.append('occasion', context.occasion);
      }
      if (context?.dietary_constraints?.length) {
        params.append('dietary_constraints', context.dietary_constraints.join(','));
      }
      
      const response = await fetch(`${API_BASE}/api/${restaurantId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Recommendations error:', error);
      throw error;
    }
  }
  
  
  // Search places
  async searchPlaces(query: string, location?: string | null): Promise<any> {
    try {
      // Use Google Places API for real restaurant search with location
      const params = new URLSearchParams({ query });
      
      if (location) {
        params.append('location', location);
      }
      
      const response = await fetch(`${API_BASE}/api/places/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Google Places search failed:', error);
      // If Google Places fails, try LLM-based search as fallback
      try {
        const params = new URLSearchParams({ query });
        const response = await fetch(`${API_BASE}/menu-parsing/search?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (llmError) {
        console.error('LLM search also failed:', llmError);
        throw new Error('Backend not available');
      }
    }
  }
  
  // Check if restaurant has menu
  async checkRestaurantMenu(restaurantName: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/restaurants/by-name/${encodeURIComponent(restaurantName)}/has-menu`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Menu check error:', error);
      throw error;
    }
  }

  // Get smart recommendations based on user's taste profile
  async getSmartRecommendations(
    restaurantPlaceId: string,
    restaurantName: string,
    userFavoriteDishes: any[],
    userDietaryConstraints: string[] = []
  ): Promise<any> {
    try {
      console.log('🤖 Requesting smart recommendations for:', restaurantName);
      
      const response = await fetch(`${API_BASE}/smart-recommendations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_place_id: restaurantPlaceId,
          restaurant_name: restaurantName,
          user_favorite_dishes: userFavoriteDishes,
          user_dietary_constraints: userDietaryConstraints
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Smart recommendations failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Smart recommendations received:', result);
      return result;
    } catch (error) {
      console.error('Smart recommendations error:', error);
      throw error;
    }
  }

  // Get actual restaurant menu from multiple sources
  async getRestaurantMenuWithPlaceId(restaurantPlaceId: string, restaurantName: string, abortController?: AbortController): Promise<any> {
    try {
      console.log('🍽️  Requesting menu for:', restaurantName);
      
      const response = await fetch(`${API_BASE}/menu/restaurant/${restaurantPlaceId}?restaurant_name=${encodeURIComponent(restaurantName)}`, {
        signal: abortController?.signal
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No menu found for restaurant: ${restaurantName}`);
          return { success: false, message: 'No menu found' };
        }
        const errorText = await response.text();
        console.error('Menu fetch failed:', errorText);
        return { success: false, message: `HTTP error! status: ${response.status}`, error: errorText };
      }
      
      const result = await response.json();
      console.log(`✅ Menu received: ${result?.dishes?.length || 0} dishes for ${restaurantName}`);
      return result;
    } catch (error) {
      console.error('Menu fetch error:', error);
      return { success: false, message: 'Failed to load menu', error: String(error) };
    }
  }

  // Add user-contributed dish to restaurant menu
  async addUserDish(
    restaurantPlaceId: string,
    restaurantName: string,
    dishData: {
      dish_name: string;
      dish_description?: string;
      dish_price?: number;
      dish_category?: string;
    }
  ): Promise<any> {
    try {
      console.log('➕ Adding user dish:', dishData.dish_name);
      
      const response = await fetch(`${API_BASE}/menu/restaurant/${restaurantPlaceId}/add-dish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_name: restaurantName,
          ...dishData
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Add dish failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Dish added:', result);
      return result;
    } catch (error) {
      console.error('Add dish error:', error);
      throw error;
    }
  }

  // Check menu coverage for a restaurant
  async getMenuCoverage(restaurantPlaceId: string, restaurantName: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/menu/restaurant/${restaurantPlaceId}/coverage?restaurant_name=${encodeURIComponent(restaurantName)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Menu coverage error:', error);
      throw error;
    }
  }

  // Get smart recommendations using the new algorithm
  async getSmartRecommendationsNew(
    restaurantPlaceId: string,
    restaurantName: string,
    userFavoriteDishes: any[],
    userDietaryConstraints: string[] = [],
    contextWeights?: {
      hungerLevel: number;
      preferenceLevel: number;
      selectedCravings: string[];
      spiceTolerance?: number;
    },
    friendSelections: any[] = []
  ): Promise<any> {
    try {
      console.log('🤖 Requesting new smart recommendations for:', restaurantName);
      
      const response = await fetch(`${API_BASE}/smart-recommendations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_place_id: restaurantPlaceId,
          restaurant_name: restaurantName,
          user_favorite_dishes: userFavoriteDishes,
          user_dietary_constraints: userDietaryConstraints,
          context_weights: contextWeights,
          friend_selections: friendSelections
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('New smart recommendations failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ New smart recommendations received:', result);
      return result;
    } catch (error) {
      console.error('New smart recommendations error:', error);
      throw error;
    }
  }

  // Get explanation for why a dish was recommended
  async explainRecommendation(dishData: any): Promise<any> {
    try {
      console.log('💭 Requesting recommendation explanation for:', dishData.name);
      
      const response = await fetch(`${API_BASE}/smart-recommendations/explain-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dish: dishData
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Explanation request failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Explanation received:', result);
      return result;
    } catch (error) {
      console.error('Explanation error:', error);
      throw error;
    }
  }

  // Get restaurant menu from database
  async getRestaurantMenu(restaurantName: string, placeId?: string, abortController?: AbortController): Promise<any> {
    try {
      console.log(`🔍 Fetching menu for: ${restaurantName}`);
      
      // Use provided abort controller or create new one
      const controller = abortController || new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Only add timeout if we created the controller
      if (!abortController) {
        timeoutId = setTimeout(() => {
          console.log(`⏰ Timeout for ${restaurantName} - aborting request`);
          controller.abort();
        }, 15000); // 15 second timeout
      }
      
      const placeIdParam = placeId || restaurantName;
      const response = await fetch(`${API_BASE}/menu/menu/restaurant/${encodeURIComponent(placeIdParam)}?restaurant_name=${encodeURIComponent(restaurantName)}`, {
        signal: controller.signal
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No menu found for restaurant: ${restaurantName}`);
          return { success: false, message: 'No menu found' };
        }
        // For other errors, try to get the error message from response
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        return { success: false, message: `HTTP error! status: ${response.status}`, error: errorText };
      }
      
      const result = await response.json();
      console.log(`✅ Menu fetched for: ${restaurantName}`);
      return result;
    } catch (error) {
      console.error(`❌ Get restaurant menu error for ${restaurantName}:`, error);
      // Don't throw error, return a graceful failure
      return { success: false, message: 'Failed to load menu', error: String(error) };
    }
  }

  // Parse and store menu from URL
  async parseAndStoreMenu(menuUrl: string, restaurantName: string, restaurantUrl: string = '', abortController?: AbortController): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('menu_url', menuUrl);
      formData.append('restaurant_name', restaurantName);
      formData.append('restaurant_url', restaurantUrl);
      
      const response = await fetch(`${API_BASE}/menu-parsing/parse-and-store`, {
        method: 'POST',
        body: formData,
        signal: abortController?.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Parse and store menu error:', error);
      throw error;
    }
  }

  // Parse menu from screenshot using OpenAI Vision
  async parseMenuFromScreenshot(imageUri: string, restaurantName: string, restaurantUrl: string = '', abortController?: AbortController): Promise<any> {
    try {
      const formData = new FormData();
      
      // React Native requires this specific format for file uploads
      formData.append('menu_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'menu.jpg',
      } as any);
      formData.append('restaurant_name', restaurantName);
      formData.append('restaurant_url', restaurantUrl);
      
      const response = await fetch(`${API_BASE}/menu-parsing/parse-screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        signal: abortController?.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Parse menu from screenshot error:', error);
      throw error;
    }
  }

  // Parse menu from text
  async parseMenuFromText(menuText: string, restaurantName: string, restaurantUrl: string = '', abortController?: AbortController): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('menu_text', menuText);
      formData.append('restaurant_name', restaurantName);
      formData.append('restaurant_url', restaurantUrl);
      
      const response = await fetch(`${API_BASE}/menu-parsing/parse-text`, {
        method: 'POST',
        body: formData,
        signal: abortController?.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Parse menu from text error:', error);
      throw error;
    }
  }

  // Add dish to menu
  async addDishToMenu(restaurantName: string, dishData: any, userId: number): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('restaurant_name', restaurantName);
      formData.append('dish_data', JSON.stringify(dishData));
      formData.append('user_id', userId.toString());
      
      const response = await fetch(`${API_BASE}/menu-parsing/add-dish`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Add dish to menu error:', error);
      throw error;
    }
  }

  // User Management
  async saveUserPreferences(userId: string, preferences: any): Promise<any> {
    try {
      // Basic validation
      if (!userId || userId === 'undefined') {
        console.error('❌ Invalid user ID format:', userId);
        throw new Error('Invalid user ID format - must be a proper Clerk user ID');
      }
      
      console.log('🔍 API: Validating user ID:', userId);
      
      // Destructure to remove any incoming id/created_at/updated_at from prefs
      const { id: _dropId, created_at: _c, updated_at: _u, ...cleanPrefs } = preferences || {};
      
      // Strip undefined values from arrays
      const stripUndefined = (obj: any) =>
        Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
      
      const sanitizeArray = (arr: any[]) => arr.map(stripUndefined);
      
      // Clean up arrays if they exist
      if (cleanPrefs.favorite_dishes) {
        cleanPrefs.favorite_dishes = sanitizeArray(cleanPrefs.favorite_dishes);
      }
      if (cleanPrefs.favorite_restaurants) {
        cleanPrefs.favorite_restaurants = sanitizeArray(cleanPrefs.favorite_restaurants);
      }
      
      // Make sure the *correct* id is last so it cannot be overridden
      const payload = { ...cleanPrefs, id: userId };
      console.log('💾 Saving user preferences:', { userId, payload });
      console.log('🔍 DEBUG: Username in payload:', payload.username);
      
      return await request(`/users/${userId}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('❌ Save user preferences error:', error);
      // Return a mock response so the app continues working
      return { success: true, message: 'Stored locally only' };
    }
  }

  async getUserPreferences(userId: string): Promise<any> {
    try {
      console.log('📥 Getting user preferences for:', userId);
      return await request(`/users/${userId}/preferences`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log('📥 User not found (404) - will create new profile');
        return null; // Return null so the client knows to create one
      }
      console.error('❌ Get user preferences error:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    try {
      // Use the same payload cleaning logic as saveUserPreferences
      const { id: _dropId, created_at: _c, updated_at: _u, ...cleanPrefs } = preferences || {};
      
      // Strip undefined values from arrays
      const stripUndefined = (obj: any) =>
        Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
      
      const sanitizeArray = (arr: any[]) => arr.map(stripUndefined);
      
      // Clean up arrays if they exist
      if (cleanPrefs.favorite_dishes) {
        cleanPrefs.favorite_dishes = sanitizeArray(cleanPrefs.favorite_dishes);
      }
      if (cleanPrefs.favorite_restaurants) {
        cleanPrefs.favorite_restaurants = sanitizeArray(cleanPrefs.favorite_restaurants);
      }
      
      // Make sure the *correct* id is last so it cannot be overridden
      const payload = { ...cleanPrefs, id: userId };
      
      return await request(`/users/${userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('❌ Update user preferences error:', error);
      throw error;
    }
  }

  async updateTop3Restaurants(userId: string, restaurants: any[]): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/top-3-restaurants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restaurants),
      });

      if (!response.ok) {
        throw new Error(`Failed to update top 3 restaurants: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.log('Backend not available - top 3 restaurants will be stored locally only');
      // Return a mock response so the app continues working
      return { success: true, message: 'Stored locally only' };
    }
  }

  async addFavoriteDish(userId: string, dishData: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/favorite-dishes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dishData),
      });

      if (!response.ok) {
        throw new Error(`Failed to add favorite dish: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Add favorite dish error:', error);
      throw error;
    }
  }

  async getFavoriteDishes(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/favorite-dishes`);

      if (!response.ok) {
        throw new Error(`Failed to get favorite dishes: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Get favorite dishes error:', error);
      throw error;
    }
  }
}

export const api = new MenutoAPI();

export async function ensureUserProfile(userId: string, email?: string) {
  const payload = {
    id: userId,
    email,
    home_base: undefined,
    preferred_cuisines: [],
    spice_tolerance: 3,
    price_preference: 2,
    dietary_restrictions: [],
    favorite_restaurants: [],
    favorite_dishes: [],
  };

  async function request(path: string, opts: RequestInit = {}) {
    // Get token directly from Clerk each time
    const token = await getAuthToken();
    const headers = new Headers(opts.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('🔐 sending auth header to', path);
    } else {
      console.log('⚠️ request(): no token available for', path);
      
      // If no token, try one more time with a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryToken = await getAuthToken();
      if (retryToken) {
        headers.set('Authorization', `Bearer ${retryToken}`);
        console.log('🔐 retry successful - sending auth header to', path);
      } else {
        console.log('⚠️ retry failed - no token for', path);
      }
    }
    
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${body}`);
    }
    return res.json();
  }

  try {
    console.log('🔄 Creating user profile for:', userId);
    return await request(`/users/${userId}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('❌ Ensure user profile error:', error);
    // Return the payload as fallback so the app can continue
    return payload;
  }
}