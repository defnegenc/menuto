# Behavioral Tracking Integration Summary

## ✅ Completed

### Backend Files Created/Updated

1. **`menuto-backend/app/models_behavior.py`** ✅
   - SQLAlchemy models for behavioral tracking tables
   - `DishOrder`, `DishView`, `DishRating`, `DishFavorite`

2. **`menuto-backend/app/services/enhanced_recommendation_algorithm.py`** ✅
   - Multi-signal recommendation algorithm
   - Combines orders, views, ratings, favorites, taste profile, context

3. **`menuto-backend/app/routers/behavioral_tracking.py`** ✅
   - Tracking endpoints: `/track/order`, `/track/view`, `/track/rating`, `/track/favorite`
   - Stats endpoint: `/dish/{dish_id}/stats`

4. **`menuto-backend/app/models.py`** ✅
   - Updated `ParsedMenu` to include `place_id`, `cuisine_type`, `menu_type`
   - Updated `ParsedDish` to include `price`

5. **`menuto-backend/app/main.py`** ✅
   - Registered behavioral_tracking router

### Frontend Files Updated

1. **`menuto-app/services/api.ts`** ✅
   - Added tracking methods: `trackDishView`, `trackDishRating`, `trackDishOrder`, `trackDishFavorite`

2. **`menuto-app/screens/PostMealFeedback.tsx`** ✅
   - Added rating tracking in `submitFeedback()`

3. **`menuto-app/screens/MultiDishScoring.tsx`** ✅
   - Added rating tracking for all dishes in `handleComplete()`

4. **`menuto-app/screens/RestaurantDetailScreen.tsx`** ✅
   - Added favorite tracking in `handleAddDishToFavorites()`

## 📋 Next Steps

### 1. Run SQL Migration
Execute the SQL migration in Supabase SQL Editor to create the tracking tables.

### 2. Add Dish View Tracking (Optional but Recommended)
Add view tracking when users tap on dish cards to see details:

**In `RestaurantDetailScreen.tsx`** - When `MenuItemCard` is pressed:
```typescript
// Add to MenuItemCard onPress handler
api.trackDishView(String(dish.id), restaurant.place_id).catch(/*...*/);
```

**In `DishRecommendations.tsx`** - When dish cards are viewed:
```typescript
// Track views when recommendations are shown
useEffect(() => {
  recommendations.forEach(rec => {
    if (rec.id) {
      api.trackDishView(String(rec.id), restaurant.place_id).catch(/*...*/);
    }
  });
}, [recommendations]);
```

### 3. Add Order Tracking (When User Confirms Ordering)
If you have a "Confirm Order" or "I Ordered This" button, add:
```typescript
api.trackDishOrder(
  String(dish.id),
  restaurant.place_id,
  hungerLevel,  // Current hunger level
  selectedCravings  // Current cravings
).catch(/*...*/);
```

### 4. Update Recommendation Endpoint (Future)
Create a new endpoint that uses `EnhancedRecommendationAlgorithm`:

**Create:** `menuto-backend/app/routers/enhanced_recommendations.py`

```python
@router.post("/generate-enhanced")
async def generate_enhanced_recommendations(
    request: RecommendationRequest,
    user: dict = Depends(require_user),
    db: Session = Depends(get_db)
):
    # Get user favorites from user_profiles (Supabase)
    # Use EnhancedRecommendationAlgorithm
    # Return recommendations
```

### 5. Testing Checklist

- [ ] SQL migration executed successfully
- [ ] Backend endpoints return 200 OK
- [ ] Rating tracking works (check Supabase `dish_ratings` table)
- [ ] Favorite tracking works (check Supabase `dish_favorites` table)
- [ ] View tracking works (when implemented)
- [ ] Order tracking works (when implemented)

## 🔍 How to Verify Tracking Works

1. **Check Supabase Tables:**
   ```sql
   SELECT * FROM dish_ratings ORDER BY rated_at DESC LIMIT 10;
   SELECT * FROM dish_favorites ORDER BY added_at DESC LIMIT 10;
   SELECT * FROM dish_orders ORDER BY ordered_at DESC LIMIT 10;
   SELECT * FROM dish_views ORDER BY viewed_at DESC LIMIT 10;
   ```

2. **Check Backend Logs:**
   Look for: `Tracked rating: user=...`, `Tracked favorite: ...`

3. **Test API Endpoints:**
   ```bash
   # Get dish stats
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/smart-recommendations/dish/123/stats
   ```

## 📝 Notes

- All tracking calls are **best-effort** (wrapped in try/catch, don't throw)
- Tracking uses `dish_id` as string (converted from number in API)
- User ID comes from Clerk token (`user.sub`)
- Restaurant `place_id` is used as restaurant identifier

## 🚀 Future Enhancements

1. **Real-time Stats Display:** Show popularity badges on dish cards
2. **Trending Dishes:** Highlight dishes with recent order spikes
3. **Personalized Recommendations:** Use `EnhancedRecommendationAlgorithm` endpoint
4. **Analytics Dashboard:** View aggregated stats per restaurant/dish

