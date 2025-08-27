import { FavoriteRestaurant, FavoriteDish, ParsedDish } from '../types';

// Mock dish database organized by cuisine type
const MOCK_DISHES_BY_CUISINE: Record<string, ParsedDish[]> = {
  italian: [
    { id: 'it-1', name: 'Margherita Pizza', description: 'Classic tomato, mozzarella, and basil', price: 16, ingredients: ['tomato', 'mozzarella', 'basil'], dietary_tags: ['vegetarian'], category: 'main', avg_rating: 4.6 },
    { id: 'it-2', name: 'Carbonara', description: 'Pasta with eggs, cheese, pancetta, and pepper', price: 18, ingredients: ['pasta', 'eggs', 'pancetta', 'parmesan'], dietary_tags: [], category: 'main', avg_rating: 4.7 },
    { id: 'it-3', name: 'Tiramisu', description: 'Classic coffee-flavored dessert', price: 8, ingredients: ['mascarpone', 'coffee', 'ladyfingers'], dietary_tags: ['vegetarian'], category: 'dessert', avg_rating: 4.5 },
    { id: 'it-4', name: 'Caesar Salad', description: 'Crisp romaine with parmesan and croutons', price: 12, ingredients: ['romaine', 'parmesan', 'croutons'], dietary_tags: ['vegetarian'], category: 'starter', avg_rating: 4.2 },
  ],
  japanese: [
    { id: 'jp-1', name: 'Salmon Sashimi', description: 'Fresh sliced salmon', price: 22, ingredients: ['salmon'], dietary_tags: ['gluten-free'], category: 'starter', avg_rating: 4.8 },
    { id: 'jp-2', name: 'Chicken Teriyaki', description: 'Grilled chicken with teriyaki sauce', price: 19, ingredients: ['chicken', 'teriyaki sauce'], dietary_tags: [], category: 'main', avg_rating: 4.4 },
    { id: 'jp-3', name: 'Miso Soup', description: 'Traditional soybean paste soup', price: 6, ingredients: ['miso', 'tofu', 'scallions'], dietary_tags: ['vegetarian'], category: 'starter', avg_rating: 4.3 },
    { id: 'jp-4', name: 'Tempura Vegetables', description: 'Lightly battered and fried vegetables', price: 15, ingredients: ['vegetables', 'tempura batter'], dietary_tags: ['vegetarian'], category: 'starter', avg_rating: 4.1 },
  ],
  mexican: [
    { id: 'mx-1', name: 'Fish Tacos', description: 'Grilled fish with cabbage slaw', price: 14, ingredients: ['fish', 'tortilla', 'cabbage'], dietary_tags: [], category: 'main', avg_rating: 4.6 },
    { id: 'mx-2', name: 'Guacamole', description: 'Fresh avocado dip with chips', price: 9, ingredients: ['avocado', 'lime', 'cilantro'], dietary_tags: ['vegan'], category: 'starter', avg_rating: 4.4 },
    { id: 'mx-3', name: 'Chicken Quesadilla', description: 'Grilled chicken and cheese in tortilla', price: 13, ingredients: ['chicken', 'cheese', 'tortilla'], dietary_tags: [], category: 'main', avg_rating: 4.2 },
    { id: 'mx-4', name: 'Churros', description: 'Fried pastry with cinnamon sugar', price: 7, ingredients: ['pastry', 'cinnamon', 'sugar'], dietary_tags: ['vegetarian'], category: 'dessert', avg_rating: 4.5 },
  ],
  indian: [
    { id: 'in-1', name: 'Butter Chicken', description: 'Creamy tomato curry with chicken', price: 17, ingredients: ['chicken', 'tomato', 'cream'], dietary_tags: ['spicy'], category: 'main', avg_rating: 4.7 },
    { id: 'in-2', name: 'Paneer Tikka', description: 'Marinated cottage cheese cubes', price: 15, ingredients: ['paneer', 'spices'], dietary_tags: ['vegetarian', 'spicy'], category: 'starter', avg_rating: 4.5 },
    { id: 'in-3', name: 'Naan Bread', description: 'Soft leavened flatbread', price: 4, ingredients: ['flour', 'yogurt'], dietary_tags: ['vegetarian'], category: 'side', avg_rating: 4.3 },
    { id: 'in-4', name: 'Mango Lassi', description: 'Sweet yogurt drink with mango', price: 5, ingredients: ['yogurt', 'mango'], dietary_tags: ['vegetarian'], category: 'beverage', avg_rating: 4.6 },
  ],
  chinese: [
    { id: 'ch-1', name: 'Kung Pao Chicken', description: 'Spicy stir-fried chicken with peanuts', price: 16, ingredients: ['chicken', 'peanuts', 'vegetables'], dietary_tags: ['spicy'], category: 'main', avg_rating: 4.4 },
    { id: 'ch-2', name: 'Dumplings', description: 'Steamed pork and vegetable dumplings', price: 12, ingredients: ['pork', 'vegetables', 'wrapper'], dietary_tags: [], category: 'starter', avg_rating: 4.6 },
    { id: 'ch-3', name: 'Fried Rice', description: 'Wok-fried rice with egg and vegetables', price: 11, ingredients: ['rice', 'egg', 'vegetables'], dietary_tags: ['vegetarian'], category: 'main', avg_rating: 4.2 },
    { id: 'ch-4', name: 'Hot & Sour Soup', description: 'Spicy and tangy soup with tofu', price: 8, ingredients: ['tofu', 'mushrooms', 'vinegar'], dietary_tags: ['vegetarian', 'spicy'], category: 'starter', avg_rating: 4.1 },
  ],
  american: [
    { id: 'am-1', name: 'Burger & Fries', description: 'Classic beef burger with crispy fries', price: 15, ingredients: ['beef', 'bun', 'potatoes'], dietary_tags: [], category: 'main', avg_rating: 4.3 },
    { id: 'am-2', name: 'BBQ Ribs', description: 'Slow-cooked pork ribs with BBQ sauce', price: 24, ingredients: ['pork ribs', 'BBQ sauce'], dietary_tags: [], category: 'main', avg_rating: 4.5 },
    { id: 'am-3', name: 'Mac & Cheese', description: 'Creamy macaroni with cheese sauce', price: 12, ingredients: ['pasta', 'cheese'], dietary_tags: ['vegetarian'], category: 'main', avg_rating: 4.4 },
    { id: 'am-4', name: 'Apple Pie', description: 'Classic dessert with vanilla ice cream', price: 8, ingredients: ['apples', 'pastry'], dietary_tags: ['vegetarian'], category: 'dessert', avg_rating: 4.6 },
  ]
};

// Simple cuisine mapping
const getCuisineFromRestaurantName = (restaurantName: string): string => {
  const name = restaurantName.toLowerCase();
  if (name.includes('pizza') || name.includes('italian')) return 'italian';
  if (name.includes('sushi') || name.includes('japanese') || name.includes('ramen')) return 'japanese';
  if (name.includes('taco') || name.includes('mexican') || name.includes('burrito')) return 'mexican';
  if (name.includes('indian') || name.includes('curry')) return 'indian';
  if (name.includes('chinese') || name.includes('dim sum')) return 'chinese';
  return 'american'; // Default fallback
};

export const generateMockRecommendations = (
  restaurant: FavoriteRestaurant,
  userFavoriteDishes: FavoriteDish[],
  userPreferences: {
    dietary_constraints?: string[];
    spice_tolerance?: number;
    price_range?: number[];
  }
): ParsedDish[] => {
  // Determine cuisine type
  const cuisine = getCuisineFromRestaurantName(restaurant.name);
  let availableDishes = MOCK_DISHES_BY_CUISINE[cuisine] || MOCK_DISHES_BY_CUISINE.american;
  
  // Filter based on dietary constraints
  if (userPreferences.dietary_constraints?.length) {
    availableDishes = availableDishes.filter(dish => {
      // If user is vegetarian, only show vegetarian dishes
      if (userPreferences.dietary_constraints!.includes('vegetarian')) {
        return dish.dietary_tags.includes('vegetarian') || dish.dietary_tags.includes('vegan');
      }
      // If user is vegan, only show vegan dishes
      if (userPreferences.dietary_constraints!.includes('vegan')) {
        return dish.dietary_tags.includes('vegan');
      }
      return true;
    });
  }
  
  // Filter based on spice tolerance
  if (userPreferences.spice_tolerance && userPreferences.spice_tolerance < 3) {
    // If low spice tolerance, avoid spicy dishes
    availableDishes = availableDishes.filter(dish => !dish.dietary_tags.includes('spicy'));
  }
  
  // Filter based on price range
  if (userPreferences.price_range?.length) {
    const maxPriceLevel = Math.max(...userPreferences.price_range);
    const maxPrice = maxPriceLevel * 15; // $15 per price level
    availableDishes = availableDishes.filter(dish => dish.price <= maxPrice);
  }
  
  // Score dishes based on user's favorite dishes
  const scoredDishes = availableDishes.map(dish => {
    let score = dish.avg_rating || 4.0; // Base score
    
    // Boost score if ingredients match user's favorite dishes
    userFavoriteDishes.forEach(favDish => {
      const favIngredients = favDish.dish_name.toLowerCase().split(' ');
      const dishIngredients = dish.ingredients.map(ing => ing.toLowerCase());
      
      const matchingIngredients = favIngredients.filter(favIng =>
        dishIngredients.some(dishIng => dishIng.includes(favIng) || favIng.includes(dishIng))
      );
      
      if (matchingIngredients.length > 0) {
        score += 0.5 * matchingIngredients.length;
      }
    });
    
    return { ...dish, score };
  });
  
  // Sort by score and return top recommendations
  return scoredDishes
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 recommendations
};