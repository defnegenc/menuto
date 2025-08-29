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
  setUser: (user: UserPreferences, userId: string) => void;
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
  
  // Actions
  setUser: async (user: UserPreferences, userId: string) => {
    set({ user, userId });
    // Save to backend API in background (optional - app works without it)
    try {
      await api.saveUserPreferences(userId, user);
    } catch (error) {
      console.log('Backend not available - continuing with local storage only');
      // Don't throw - allow app to continue working locally
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