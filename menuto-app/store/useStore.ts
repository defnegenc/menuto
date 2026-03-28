import { create } from 'zustand';
import { UserPreferences, RecommendationResponse, MenuScanResult, FavoriteRestaurant } from '../types';
import { api } from '../services/api';

interface AppState {
  // User data
  user: UserPreferences | null;
  userId: string | null;

  // Current session
  currentScan: MenuScanResult | null;
  currentRecommendations: RecommendationResponse | null;

  // Loading & error states
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  // Actions
  debugState: () => AppState;
  setUser: (user: UserPreferences | null, userId: string) => void;
  setCurrentScan: (scan: MenuScanResult) => void;
  setRecommendations: (recommendations: RecommendationResponse) => void;
  updateTop3Restaurants: (restaurants: FavoriteRestaurant[], userId: string) => Promise<void>;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearSession: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  userId: null,
  currentScan: null,
  currentRecommendations: null,
  isLoading: false,
  loadingMessage: '',
  error: null,

  // Debug function
  debugState: (): AppState => {
    return get();
  },
  
  // Actions
  setUser: (user: UserPreferences | null, userId: string) => {
    // Always save to local state first - merge with existing user data
    set((state) => {
      const newState = {
        user: user ? { ...(state.user ?? {}), ...user } : null,
        userId: userId || null
      };
      
      return newState;
    });
    
    if (user && userId && userId !== '' && userId !== 'SIGNED_OUT') {
      // Try to save to backend API in background (don't await)
      api.saveUserPreferences(userId, user).catch(() => {
        // Don't throw - allow app to continue working locally
      });
    }
  },
    
  setCurrentScan: (scan: MenuScanResult) => 
    set({ currentScan: scan }),
    
  setRecommendations: (recommendations: RecommendationResponse) => 
    set({ currentRecommendations: recommendations }),
    
  updateTop3Restaurants: async (restaurants: FavoriteRestaurant[], userId: string) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, top_3_restaurants: restaurants };
      set({ user: updatedUser });
      // Save to backend API in background (optional)
      try {
        await api.updateTop3Restaurants(userId, restaurants);
      } catch (error) {
        // Don't throw - allow app to continue working locally
      }
    }
  },

  // Loading & error actions
  setLoading: (loading: boolean, message?: string) =>
    set({ isLoading: loading, loadingMessage: message || '' }),

  setError: (error: string | null) =>
    set({ error }),

  clearError: () =>
    set({ error: null }),

  clearSession: () =>
    set({ currentScan: null, currentRecommendations: null }),
}));