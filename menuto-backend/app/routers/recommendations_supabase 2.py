from fastapi import APIRouter, HTTPException, Query
from app.database_supabase import db
from app.services.places_api import places_api
from typing import Optional
import uuid

router = APIRouter()

@router.get("/{place_id}")
async def get_dish_recommendations(
    place_id: str,
    user_id: str,
    budget: Optional[float] = Query(None, description="Budget constraint for recommendations"),
    occasion: Optional[str] = Query(None, description="Occasion type (date_night, quick_lunch, etc.)"),
    spice_preference: Optional[str] = Query(None, description="Spice preference (mild, medium, spicy)"),
    dietary_constraints: Optional[str] = Query(None, description="Temporary dietary constraints (comma-separated)"),
):
    """Get personalized dish recommendations for a user at a place"""
    
    try:
        # Verify user exists
        user = db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify place exists
        place = db.get_place_by_id(place_id)
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")
        
        # Get dishes for this place
        dishes = db.get_dishes_by_place(place_id)
        if not dishes:
            return {
                "place": place,
                "recommendations": [],
                "message": "No dishes found for this place"
            }
        
        # Build context
        dietary_list = []
        if dietary_constraints:
            dietary_list = [d.strip() for d in dietary_constraints.split(",")]
        
        context = {
            "budget": budget,
            "occasion": occasion,
            "spice_preference": spice_preference,
            "dietary_constraints": dietary_list
        }
        
        # Simple ranking for now (we'll improve this)
        recommendations = []
        for dish in dishes:
            score = 50  # Base score
            
            # Budget filtering
            if budget and dish.get('price'):
                if dish['price'] <= budget:
                    score += 10
                else:
                    score -= 20
            
            # Cuisine preference match
            if user.get('preferred_cuisines') and place.get('cuisine_type'):
                if place['cuisine_type'] in user['preferred_cuisines']:
                    score += 15
            
            # Dietary preferences
            if dietary_list and dish.get('dietary_tags'):
                dish_tags = dish['dietary_tags'] or []
                if any(tag in dish_tags for tag in dietary_list):
                    score += 10
            
            explanation = "Recommended based on your preferences"
            if score > 60:
                explanation = "Great match for your taste and budget"
            elif score < 40:
                explanation = "This might not be the best fit"
                
            recommendations.append({
                "dish_id": dish['id'],
                "name": dish['name'],
                "description": dish.get('description', ''),
                "price": dish.get('price', 0.0),
                "category": dish.get('category', ''),
                "ingredients": dish.get('ingredients', []),
                "dietary_tags": dish.get('dietary_tags', []),
                "score": min(100, max(0, score)),
                "explanation": explanation,
                "avg_rating": dish.get('avg_rating', 0)
            })
        
        # Sort by score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            "place": {
                "id": place['id'],
                "name": place['name'],
                "cuisine_type": place.get('cuisine_type', ''),
                "google_place_id": place.get('google_place_id', '')
            },
            "user_context": context,
            "recommendations": recommendations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/places/search")
async def search_places(
    query: str = Query(..., description="Search query for places"),
    location: Optional[str] = Query(None, description="Location coordinates (lat,lng) or address"),
    limit: int = Query(20, le=50, description="Number of results to return")
):
    """Search for places using Google Places API"""
    
    try:
        # Use Google Places API for real restaurant search
        places = places_api.search_places(query, location)
        
        return {
            "query": query,
            "restaurants": [
                {
                    "place_id": place['place_id'],
                    "name": place['name'],
                    "vicinity": place['vicinity'],
                    "cuisine_type": place.get('cuisine_type', 'restaurant'),
                    "rating": place.get('rating'),
                    "price_level": place.get('price_level')
                }
                for place in places[:limit]
            ],
            "total": len(places)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dishes/{dish_id}/rate")
async def rate_dish(
    dish_id: str,
    user_id: str,
    rating: float,
    notes: Optional[str] = None,
    saltiness: Optional[int] = None,
    spiciness: Optional[int] = None,
    richness: Optional[int] = None,
    portion_size: Optional[int] = None
):
    """User rates a dish"""
    
    try:
        # Validate rating
        if not 1 <= rating <= 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Verify user and dish exist
        user = db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        dish = db.get_dish_by_id(dish_id)
        if not dish:
            raise HTTPException(status_code=404, detail="Dish not found")
        
        # Check if user already rated this dish
        existing_rating = db.get_user_rating(user_id, dish_id)
        
        rating_data = {
            "user_id": user_id,
            "dish_id": dish_id,
            "rating": rating,
            "notes": notes,
            "saltiness": saltiness,
            "spiciness": spiciness,
            "richness": richness,
            "portion_size": portion_size
        }
        
        if existing_rating:
            # Update existing rating
            updated_rating = db.update_user_rating(user_id, dish_id, rating_data)
        else:
            # Create new rating
            updated_rating = db.create_user_rating(rating_data)
        
        # Update dish average rating
        all_ratings = db.get_dish_ratings(dish_id)
        if all_ratings:
            avg_rating = sum(r['rating'] for r in all_ratings) / len(all_ratings)
            db.update_dish_rating(dish_id, avg_rating, len(all_ratings))
        
        return {
            "message": "Rating submitted successfully",
            "rating": updated_rating,
            "dish": {
                "id": dish['id'],
                "name": dish['name']
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))