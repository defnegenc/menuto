import { UserPreferences, RecommendationResponse, MenuScanResult } from '../types';

// Change this to your backend URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

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
      // First try the backend
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
      console.error('Backend search failed:', error);
      // If backend fails, return a structured error so the frontend can handle it
      throw new Error('Backend not available');
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
      const response = await fetch(`${API_BASE}/menu/restaurant/${encodeURIComponent(placeIdParam)}?restaurant_name=${encodeURIComponent(restaurantName)}`, {
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
}

export const api = new MenutoAPI();