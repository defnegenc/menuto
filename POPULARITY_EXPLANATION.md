# How Popular Dishes Are Calculated

## Overview

Popular dishes are calculated using a **multi-signal scoring system** that combines behavioral tracking data from user interactions.

## Popularity Score Formula

The popularity score is calculated in `EnhancedRecommendationAlgorithm.calculate_popularity_score()`:

```
Popularity Score = Order Score + Rating Score + View Score + Trending Boost
```

### Component Scores

1. **Order Score (Weight: 1.0)** - Strongest signal
   - Formula: `min(order_count / 10.0, 1.0) * 1.0`
   - Caps at 10 orders (100% weight)
   - Example: 5 orders = 0.5, 15 orders = 1.0

2. **Rating Score (Weight: 0.8)** - Gold standard signal
   - Only applies if dish has 3+ ratings (trust threshold)
   - Formula: `((avg_rating - 1.0) / 4.0) * 0.8`
   - Normalizes 1-5 star rating to 0-1 scale, then applies 0.8 weight
   - Example: 4.5 stars = ((4.5-1)/4) * 0.8 = 0.7

3. **View Score (Weight: 0.3)** - Interest signal
   - Formula: `min(view_count / 50.0, 1.0) * 0.3`
   - Caps at 50 views (100% of view weight)
   - Example: 25 views = 0.15, 100 views = 0.3

4. **Trending Boost (Weight: 0.2)** - Recent activity signal
   - Formula: `(recent_orders / max(total_orders, 1)) * 0.3 * 0.2`
   - Recent orders = orders in last 30 days
   - Max boost of 0.3 * 0.2 = 0.06 (if 100% of orders are recent)
   - Example: 8 recent orders out of 10 total = 0.24 boost * 0.2 = 0.048

### Final Score

- Total score is capped at 1.0
- Higher score = more popular dish
- Scores are sorted descending to show most popular first

## Example Calculation

**Dish: "Chicken Tikka Masala"**
- Orders: 15
- Views: 60
- Ratings: 4.2 avg (5 ratings)
- Recent orders: 8 out of 15 (last 30 days)

**Calculation:**
1. Order score: `min(15/10, 1.0) * 1.0` = 1.0
2. Rating score: `((4.2-1)/4) * 0.8` = 0.64 (5 ratings >= 3 threshold)
3. View score: `min(60/50, 1.0) * 0.3` = 0.3
4. Trending boost: `(8/15) * 0.3 * 0.2` = 0.032

**Total:** 1.0 + 0.64 + 0.3 + 0.032 = **1.972** → capped at **1.0**

## API Endpoints

### Get Popular Dishes for Restaurant

```
GET /smart-recommendations/restaurant/{place_id}/popular-dishes?limit=10
```

**Response:**
```json
{
  "restaurant_place_id": "ChIJ...",
  "popular_dishes": [
    {
      "id": "123",
      "name": "Chicken Tikka Masala",
      "description": "Creamy tomato curry",
      "category": "main",
      "price": 18.99,
      "popularity_score": 0.95,
      "signals": {
        "order_count": 15,
        "view_count": 60,
        "avg_rating": 4.2,
        "rating_count": 5,
        "recent_order_boost": 0.24
      }
    }
  ],
  "total_dishes": 45,
  "returned_count": 10
}
```

### Get Stats for Single Dish

```
GET /smart-recommendations/dish/{dish_id}/stats
```

**Response:**
```json
{
  "dish_id": "123",
  "order_count": 15,
  "view_count": 60,
  "avg_rating": 4.2,
  "rating_count": 5,
  "recent_order_count": 8,
  "is_trending": true
}
```

## Data Sources

Popularity scores are calculated from:

1. **dish_orders** table - When users order dishes
2. **dish_ratings** table - When users rate dishes after eating
3. **dish_views** table - When users view dish details
4. **dish_favorites** table - When users save dishes (used in personalized recommendations, not direct popularity)

## Usage in Frontend

You can display popular dishes by:

1. Calling the `/popular-dishes` endpoint
2. Showing dishes with highest `popularity_score`
3. Displaying signals like order count, rating, or "Trending" badge if `is_trending: true`

Example React Native:
```typescript
const popularDishes = await api.getPopularDishes(restaurant.place_id, 5);
// Sort by popularity_score (already sorted by backend)
popularDishes.forEach(dish => {
  console.log(`${dish.name}: ${dish.popularity_score} (${dish.signals.order_count} orders)`);
});
```

## Thresholds

- **Minimum ratings for rating score:** 3 ratings (to avoid trusting single-user ratings)
- **Order count cap:** 10 orders (100% of order weight)
- **View count cap:** 50 views (100% of view weight)
- **Trending threshold:** 50%+ of orders in last 30 days
- **Recent orders window:** 30 days

