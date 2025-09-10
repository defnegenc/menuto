// Type definitions for Menuto app

export interface UserPreferences {
  id?: string; // Changed from number to string to match Clerk user IDs
  name?: string;
  username?: string; // Unique username for the user
  email?: string;
  profile_photo?: string; // URI of the profile photo
  home_base?: string; // User's home base city
  preferred_cuisines: string[];
  spice_tolerance: number; // 1-5
  price_preference: number; // 1-4
  dietary_restrictions: string[];
  favorite_restaurants?: FavoriteRestaurant[];
  favorite_dishes?: FavoriteDish[];
  top_3_restaurants?: FavoriteRestaurant[];
}

export interface FavoriteRestaurant {
  place_id: string;
  name: string;
  vicinity: string;
  cuisine_type?: string;
  visit_count?: number;
  rating?: number;
  last_visited?: string;
}

export interface FavoriteDish {
  restaurant_id: string;
  dish_name: string;
  dessert_name?: string;
}

export interface ParsedDish {
  id?: string;
  dish_id?: string;
  name: string;
  description: string;
  price?: number;
  category: string;
  ingredients: string[];
  dietary_tags: string[];
  score: number; // 0-100
  explanation: string;
  avg_rating?: number;
  restaurant_id: string;
  is_user_added?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string;
  google_place_id?: string;
}

export interface RecommendationResponse {
  place: Restaurant;
  user_context: {
    budget?: number;
    occasion?: string;
    dietary_constraints: string[];
  };
  recommendations: ParsedDish[];
}


export interface MenuScanResult {
  image_uri: string;
  restaurant_name: string;
  input_type?: 'photo' | 'url';
  restaurant_id?: string;
  restaurant_place_id?: string;
  location?: {lat: number, lng: number};
}