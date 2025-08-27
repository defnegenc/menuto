import { create } from 'zustand';
import { UserPreferences, RecommendationResponse, MenuScanResult } from '../types';

interface AppState {
  // User data
  user: UserPreferences | null;
  userId: string | null;
  
  // Current session
  currentScan: MenuScanResult | null;
  currentRecommendations: RecommendationResponse | null;
  
  // UI state
  isLoading: boolean;
  loadingMessage: string;
  
  // Actions
  setUser: (user: UserPreferences, userId: string) => void;
  setCurrentScan: (scan: MenuScanResult) => void;
  setRecommendations: (recommendations: RecommendationResponse) => void;
  setLoading: (loading: boolean, message?: string) => void;
  clearSession: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  userId: null,
  currentScan: null,
  currentRecommendations: null,
  isLoading: false,
  loadingMessage: '',
  
  // Actions
  setUser: (user: UserPreferences, userId: string) => 
    set({ user, userId }),
    
  setCurrentScan: (scan: MenuScanResult) => 
    set({ currentScan: scan }),
    
  setRecommendations: (recommendations: RecommendationResponse) => 
    set({ currentRecommendations: recommendations }),
    
  setLoading: (loading: boolean, message: string = '') => 
    set({ isLoading: loading, loadingMessage: message }),
    
  clearSession: () => 
    set({ currentScan: null, currentRecommendations: null }),
}));