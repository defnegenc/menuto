import { create } from 'zustand';
import { UserPreferences, RecommendationResponse, MenuScanResult } from '../types';
import { api } from '../services/api';

interface AppState {
  // User data
  user: UserPreferences | null;
  userId: string | null;
  
  // Current session
  currentScan: MenuScanResult | null;
  currentRecommendations: RecommendationResponse | null;
  
  // Actions
  debugState: () => any;
  setUser: (user: UserPreferences | null, userId: string) => void;
  setCurrentScan: (scan: MenuScanResult) => void;
  setRecommendations: (recommendations: RecommendationResponse) => void;
  clearSession: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  userId: null,
  currentScan: null,
  currentRecommendations: null,
  
  // Debug function
  debugState: () => {
    const state = get();
    console.log('🔍 Store Debug:', {
      hasUser: !!state.user,
      userId: state.userId,
      userData: state.user
    });
    return state;
  },
  
  // Actions
  setUser: (user: UserPreferences | null, userId: string) => {
    console.log('💾 setUser called:', {
      userId,
      hasUser: !!user,
      hasRestaurants: !!user?.favorite_restaurants?.length,
      hasDishes: !!user?.favorite_dishes?.length,
      restaurantCount: user?.favorite_restaurants?.length || 0,
      dishCount: user?.favorite_dishes?.length || 0
    });
    
    // Always save to local state first - merge with existing user data
    set((state) => {
      const newState = {
        user: user ? { ...(state.user ?? {}), ...user } : null,
        userId: userId || null
      };
      
      console.log('💾 setUser state update:', {
        previousUser: !!state.user,
        newUser: !!newState.user,
        previousRestaurants: state.user?.favorite_restaurants?.length || 0,
        newRestaurants: newState.user?.favorite_restaurants?.length || 0,
        previousDishes: state.user?.favorite_dishes?.length || 0,
        newDishes: newState.user?.favorite_dishes?.length || 0
      });
      
      return newState;
    });
    
    if (user && userId && userId !== '' && userId !== 'SIGNED_OUT') {
      console.log('💾 User saved to local state:', { userId, hasRestaurants: !!user.favorite_restaurants?.length });
      
      // Try to save to backend API in background (don't await)
      api.saveUserPreferences(userId, user).then((result) => {
        console.log('💾 User saved to backend:', result);
      }).catch((error) => {
        console.log('Backend not available - continuing with local storage only');
        // Don't throw - allow app to continue working locally
      });
    } else {
      console.log('💾 User cleared from local state');
    }
  },
    
  setCurrentScan: (scan: MenuScanResult) => 
    set({ currentScan: scan }),
    
  setRecommendations: (recommendations: RecommendationResponse) => 
    set({ currentRecommendations: recommendations }),
    
  updateTop3Restaurants: async (restaurants: any[], userId: string) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, top_3_restaurants: restaurants };
      set({ user: updatedUser });
      // Save to backend API in background (optional)
      try {
        await api.updateTop3Restaurants(userId, restaurants);
      } catch (error) {
        console.log('Backend not available - continuing with local storage only');
        // Don't throw - allow app to continue working locally
      }
    }
  },
    
  clearSession: () => 
    set({ currentScan: null, currentRecommendations: null }),
}));