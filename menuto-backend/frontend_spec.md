# Menuto Frontend Specification
## React Native + TypeScript + Expo

### 🎯 **Core User Flow**
1. **Onboarding** → Set taste preferences
2. **Camera/Upload** → Capture menu image  
3. **Menu Parsing** → AI extracts dishes
4. **Recommendations** → Ranked dishes with explanations
5. **Rating** → User feedback to improve recommendations

---

## 📱 **Screen Specifications**

### **Screen 1: Onboarding**
**Purpose**: Quick taste preference setup (2-3 minutes max)

**Inputs:**
- Preferred cuisines (multi-select chips)
- Spice tolerance (1-5 slider)  
- Price preference (1-4 scale: $, $$, $$$, $$$$)
- Dietary restrictions (optional chips)

**Output:**
```typescript
interface UserPreferences {
  preferred_cuisines: string[];
  spice_tolerance: number; // 1-5
  price_preference: number; // 1-4
  dietary_restrictions: string[];
}
```

**UI Components:**
- Header: "Let's learn your taste"
- Cuisine chips: Italian, Japanese, Mexican, Indian, etc.
- Spice slider with emoji (🌶️)
- Price level buttons ($-$$$$)
- "Skip" and "Continue" buttons

---

### **Screen 2: Home/Camera**
**Purpose**: Main entry point - scan menus

**Inputs:**
- Camera permission
- Photo library access
- Location (optional - "restaurants near me")

**Actions:**
- **Camera Button**: Opens camera overlay
- **Upload Button**: Opens photo library
- **Search Button**: Find restaurants nearby

**Output:**
```typescript
interface MenuScanResult {
  image_uri: string;
  restaurant_name?: string; // User can edit
  location?: {lat: number, lng: number};
}
```

**UI Components:**
- Large camera button (center)
- "Upload from Photos" secondary button
- Recent scans list (if any)
- Search bar: "Restaurant name or 'near me'"

---

### **Screen 3: Menu Upload/Edit**
**Purpose**: Confirm restaurant and process menu

**Inputs:**
```typescript
interface MenuUploadData {
  image_uri: string;
  restaurant_name: string;
  user_location?: {lat: number, lng: number};
}
```

**Process:**
1. Show image preview
2. Text input for restaurant name (editable)
3. Loading state: "AI reading your menu..."
4. Progress: OCR → GPT parsing → Database

**Output:**
```typescript
interface ParsedMenu {
  restaurant: {
    id: string;
    name: string;
    google_place_id?: string;
  };
  dishes: ParsedDish[];
  parsing_confidence: number;
}
```

**UI Components:**
- Image preview (cropped/optimized)
- Restaurant name input field
- Loading spinner with status text
- Error handling for failed OCR

---

### **Screen 4: Recommendations**
**Purpose**: Show personalized dish rankings with explanations

**Input:**
```typescript
interface RecommendationRequest {
  restaurant_id: string;
  user_id: string;
  context?: {
    budget?: number;
    occasion?: 'date_night' | 'quick_lunch' | 'family_dinner';
    dietary_constraints?: string[];
  };
}
```

**Output:**
```typescript
interface RecommendationResponse {
  restaurant: {
    name: string;
    cuisine_type: string;
  };
  recommendations: Array<{
    dish_id: string;
    name: string;
    description: string;
    price: number;
    score: number; // 0-100
    explanation: string;
    ingredients: string[];
    dietary_tags: string[];
    component_scores: {
      personal_match: number;
      review_consensus: number;
      social_affinity: number;
      context_fit: number;
    };
  }>;
}
```

**UI Components:**
- Restaurant header with cuisine type
- Context filters (budget slider, occasion chips)
- Dish cards with:
  - Score badge (0-100)
  - Dish name + price
  - Explanation text
  - "Why this?" expandable details
  - Swipe actions: ❤️ Want This, 👎 Pass

---

### **Screen 5: Dish Details**
**Purpose**: Detailed view with rating interface

**Input:**
```typescript
interface DishDetailRequest {
  dish_id: string;
  user_id: string;
}
```

**Features:**
- Full description and ingredients
- User reviews and ratings
- "Rate This Dish" interface
- Similar dishes suggestions

**Rating Interface:**
```typescript
interface DishRating {
  rating: number; // 1-5 stars
  notes?: string;
  taste_feedback: {
    saltiness: number; // 1-5
    spiciness: number; // 1-5  
    richness: number; // 1-5
    portion_size: number; // 1-5
  };
}
```

**UI Components:**
- Hero image (if available)
- Star rating (large, interactive)
- Taste sliders with emojis
- Text input for notes
- "Submit Rating" button

---

### **Screen 6: Profile/Settings**
**Purpose**: View and edit preferences, see rating history

**Features:**
- Edit taste preferences
- View rating history
- Export taste profile
- Privacy settings

---

## 🔧 **Technical Implementation**

### **API Integration:**
```typescript
// API Client
const API_BASE = 'http://your-api.com';

class MenutoAPI {
  // Upload menu
  async uploadMenu(imageUri: string, restaurantName: string): Promise<ParsedMenu> {
    const formData = new FormData();
    formData.append('menu_image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'menu.jpg'
    } as any);
    formData.append('restaurant_name', restaurantName);
    
    const response = await fetch(`${API_BASE}/restaurants/upload-menu`, {
      method: 'POST',
      body: formData,
    });
    
    return response.json();
  }
  
  // Get recommendations
  async getRecommendations(
    restaurantId: string, 
    userId: string, 
    context?: any
  ): Promise<RecommendationResponse> {
    const params = new URLSearchParams({
      user_id: userId,
      ...context
    });
    
    const response = await fetch(
      `${API_BASE}/api/${restaurantId}?${params}`
    );
    
    return response.json();
  }
  
  // Rate dish
  async rateDish(dishId: string, userId: string, rating: DishRating): Promise<void> {
    await fetch(`${API_BASE}/api/dishes/${dishId}/rate`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({user_id: userId, ...rating})
    });
  }
}
```

### **State Management:**
```typescript
// Using Zustand (lightweight Redux alternative)
interface AppState {
  user: UserPreferences | null;
  currentMenu: ParsedMenu | null;
  recommendations: RecommendationResponse | null;
  setUser: (user: UserPreferences) => void;
  setMenu: (menu: ParsedMenu) => void;
}
```

### **Camera Integration:**
```typescript
import * as ImagePicker from 'expo-image-picker';

const takePhoto = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  
  if (!result.canceled) {
    return result.assets[0].uri;
  }
};
```

---

## 🎨 **Design System for Figma**

**Colors:**
- Primary: #FF6B35 (food orange)
- Secondary: #2ECC71 (success green)  
- Background: #F8F9FA
- Text: #2C3E50

**Typography:**
- Headers: SF Pro Display (iOS native)
- Body: SF Pro Text
- Scores: Monospace for consistency

**Components:**
- Dish cards with shadows
- Floating action buttons
- Bottom sheets for filters
- Swipe gestures (Tinder-like)

---

## 📦 **Project Setup**

```bash
# Create Expo app
npx create-expo-app menuto-app --template blank-typescript

# Install dependencies
cd menuto-app
npm install @react-navigation/native @react-navigation/stack
npm install expo-image-picker expo-camera expo-location
npm install zustand @tanstack/react-query
npm install react-native-reanimated react-native-gesture-handler

# Start development
npx expo start
```

**Deployment to TestFlight:**
```bash
# Build iOS
eas build --platform ios

# Submit to TestFlight  
eas submit --platform ios
```

This gives you a complete, production-ready app architecture that's optimized for your recommendation engine!