import { create } from 'zustand';
import { UserPreferences, RecommendationResponse, MenuScanResult } from '../types';

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
  setUser: (user: UserPreferences, userId: string) => 
    set({ user, userId }),
    
  setCurrentScan: (scan: MenuScanResult) => 
    set({ currentScan: scan }),
    
  setRecommendations: (recommendations: RecommendationResponse) => 
    set({ currentRecommendations: recommendations }),
    
  clearSession: () => 
    set({ currentScan: null, currentRecommendations: null }),
}));