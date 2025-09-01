import { createClient } from '@supabase/supabase-js';
import { UserPreferences } from '../types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {
  // Save or update user preferences
  async saveUser(user: UserPreferences, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          id: userId,
          name: user.name,
          email: user.email,
          preferred_cuisines: user.preferred_cuisines,
          spice_tolerance: user.spice_tolerance,
          price_preference: user.price_preference,
          dietary_restrictions: user.dietary_restrictions,
          favorite_restaurants: user.favorite_restaurants,
          favorite_dishes: user.favorite_dishes,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving user:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save user to Supabase:', error);
      // Don't throw - allow app to continue working locally
    }
  }

  // Load user preferences
  async loadUser(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user:', error);
        return null;
      }

      return data as UserPreferences;
    } catch (error) {
      console.error('Failed to load user from Supabase:', error);
      return null;
    }
  }

  // Update user's favorite restaurants
  async updateFavoriteRestaurants(userId: string, restaurants: any[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          favorite_restaurants: restaurants,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating restaurants:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update restaurants in Supabase:', error);
      // Don't throw - allow app to continue working locally
    }
  }

  // Add a restaurant visit (for future ranking)
  async addRestaurantVisit(userId: string, restaurantId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('restaurant_visits')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          visited_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding visit:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to add restaurant visit:', error);
      // Don't throw - allow app to continue working locally
    }
  }

  // Get restaurant visit count for ranking
  async getRestaurantVisitCount(userId: string, restaurantId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('restaurant_visits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('Error getting visit count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get visit count:', error);
      return 0;
    }
  }
}

export const supabaseService = new SupabaseService();
