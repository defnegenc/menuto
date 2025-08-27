# Menuto App - Codebase Context Summary

## Overview
Menuto is a React Native app that provides personalized restaurant dish recommendations based on user preferences. The app analyzes menus and suggests dishes the user would likely enjoy.

## Architecture

### State Management (Zustand)
**Location:** `store/useStore.ts`

The app uses Zustand for global state management with the following key state:

```typescript
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
}
```

**Key Variables:**
- `user`: Contains user's dietary preferences, favorite restaurants, and dishes
- `userId`: Unique identifier for the user (name-based auth)
- `currentScan`: Menu scan result from photo or URL upload
- `currentRecommendations`: AI-generated dish recommendations

### Navigation System
**Location:** `App.tsx`

The app uses a **simple state-based navigation** (not React Navigation router) with these screens:

```typescript
type AppScreen = 'signIn' | 'onboarding' | 'mainTabs' | 'recommendations' | 'dishDetail';
```

**Navigation Flow:**
1. `signIn` → User enters name
2. `onboarding` → User sets preferences (cuisines, dietary restrictions, spice level)
3. `mainTabs` → Main app with two tabs (handled by React Navigation Bottom Tabs)
4. `recommendations` → Shows dish recommendations for selected restaurant
5. `dishDetail` → Shows detailed dish information with rating/favorites

**Tab Navigation:**
- **"My Restaurants"** tab → `ProfileScreen` (shows saved restaurants)
- **"Add Restaurant"** tab → `RestaurantSearchScreen` (search and add new restaurants)

### Key Components & Screens

#### 1. MainTabScreen (`screens/MainTabScreen.tsx`)
- Uses React Navigation Bottom Tabs
- Contains ProfileScreen and RestaurantSearchScreen as tabs
- Passes `onSelectRestaurant` callback to ProfileScreen

#### 2. ProfileScreen (`screens/ProfileScreen.tsx`)
- Displays user's favorite restaurants from `user.favorite_restaurants`
- Shows simple greeting with user's name
- Each restaurant card calls `onSelectRestaurant(restaurant)` when tapped
- Triggers navigation to recommendations screen

#### 3. RestaurantSearchScreen (`screens/RestaurantSearchScreen.tsx`)
**Key Variables:**
- `searchQuery`: Current search input
- `searchResults`: Array of restaurants from Google Places API
- `selectedRestaurants`: Array of restaurants user has selected (max 3)
- `userLocation`: GPS coordinates for location-based search
- `locationStatus`: 'loading' | 'granted' | 'denied' | 'unavailable'

**Restaurant Search Flow:**
1. Gets user location permission
2. User types restaurant name/cuisine → debounced autocomplete search
3. Calls `api.searchPlaces(query, location)` → Google Places API
4. Shows restaurant cards with name, vicinity, rating
5. User taps to add restaurants to their favorites

#### 4. RecommendationsScreen (`screens/RecommendationsScreen.tsx`)
- Receives `restaurant` prop from navigation
- Calls multiple API endpoints to get recommendations:
  - `api.getMenuCoverage()` - Check if restaurant has menu data
  - `api.getRestaurantMenu()` - Get actual menu items
  - `api.getSmartRecommendations()` - AI-powered recommendations
- Shows dish cards with ratings, prices, and "Why recommended?" explanations
- Each dish can be rated 1-5 stars and added to favorites

#### 5. DishDetailScreen (`screens/DishDetailScreen.tsx`)
- Shows detailed dish information
- Rating system (1-5 stars)
- "Add to Favorites" functionality after rating
- Updates user preferences in global store

## API Integration

### Backend API (`services/api.ts`)
**Base URL:** `http://localhost:8080`

**Key Endpoints:**
- `POST /restaurants/upload-menu` - Upload menu photo
- `POST /restaurants/upload-menu-url` - Upload menu from URL
- `GET /api/places/search` - Search restaurants (Google Places)
- `GET /api/{restaurantId}` - Get recommendations
- `POST /smart-recommendations/generate` - AI recommendations
- `GET /menu/restaurant/{placeId}` - Get restaurant menu
- `POST /menu/restaurant/{placeId}/add-dish` - Add user-contributed dish

### LLM Integration (Backend)
**Models Used:** GPT-4o-mini (optimized from GPT-4 for cost reduction)

**Key AI Services:**
1. **Menu Parser** (`menu_parser.py`) - Extracts dishes from menu images/URLs
2. **Smart Recommendation Algorithm** (`smart_recommendation_algorithm.py`) - Matches user preferences to dishes
3. **Recommendation Engine** (`recommendation_engine.py`) - Generates explanations

**Cost Optimizations:**
- Switched from GPT-4 to GPT-4o-mini (60-80% cost reduction)
- Added max_tokens limits (300-1500 tokens per call)
- Reduced result counts (5 recommendations instead of 8)
- Removed test/demo files

## Data Types

### Core Types (`types/index.ts`)

```typescript
// User preferences and profile
interface UserPreferences {
  preferred_cuisines: string[];
  spice_tolerance: number; // 1-5
  price_preference: number; // 1-4  
  dietary_restrictions: string[];
  favorite_restaurants?: FavoriteRestaurant[];
  favorite_dishes?: FavoriteDish[];
}

// Restaurant data
interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string;
  google_place_id?: string;
}

// Recommended dish with AI scoring
interface ParsedDish {
  dish_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  ingredients: string[];
  dietary_tags: string[];
  score: number; // 0-100 AI confidence score
  explanation: string; // "Why recommended?"
  avg_rating?: number;
}
```

## User Flow Summary

1. **Sign In** → Enter name (simple auth)
2. **Onboarding** → Set food preferences and dietary restrictions
3. **Main App** → Two tab navigation:
   - **My Restaurants**: View saved restaurants, tap to get recommendations
   - **Add Restaurant**: Search and add new restaurants
4. **Recommendations** → AI-powered dish suggestions with explanations
5. **Dish Detail** → Rate dishes, add to favorites, update taste profile

## Key Features

### Implemented ✅
- Name-based authentication
- Preference onboarding (cuisines, spice level, dietary restrictions)
- Restaurant search with location services
- AI-powered dish recommendations
- 1-5 star rating system
- Favorites system
- Cost-optimized LLM usage

### Technical Highlights
- Zustand for state management
- React Navigation for tabs only (main navigation is state-based)
- Location services with fallback to San Francisco
- Debounced search with 300ms delay
- Error handling with user-friendly messages
- Theme system with consistent styling

## Development Notes

- **Backend:** Python FastAPI with Supabase database
- **Frontend:** React Native with Expo
- **AI:** OpenAI GPT-4o-mini for menu parsing and recommendations
- **Maps:** Google Places API for restaurant search
- **State:** Zustand (simple, TypeScript-friendly)
- **Navigation:** Mixed approach (state-based + React Navigation tabs)

## Fixed Issues
- ✅ Removed circular navigation dependencies
- ✅ Added missing `selectedRestaurants` state variable in RestaurantSearchScreen
- ✅ Cleaned up unused BackButton component references
- ✅ Optimized LLM costs by 60-80%