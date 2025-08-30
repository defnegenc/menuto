from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from pydantic import BaseModel
from app.database_supabase import SupabaseDB

router = APIRouter(prefix="/users", tags=["users"])

# Initialize database
db = SupabaseDB()

class UserPreferences(BaseModel):
    id: Optional[str] = None  # Add id field to match frontend expectations
    name: Optional[str] = None
    email: Optional[str] = None
    preferred_cuisines: List[str] = []
    spice_tolerance: int = 3
    price_preference: int = 2
    dietary_restrictions: List[str] = []
    favorite_restaurants: List[Dict] = []
    favorite_dishes: List[Dict] = []

@router.get("/{user_id}/preferences")
async def get_user_preferences(user_id: str):
    """Get user preferences from user_profiles table"""
    try:
        user = db.get_user_profile(user_id)
        if not user:
            # Return 404 so the client knows to create one
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/preferences")
async def create_user_preferences(user_id: str, preferences: UserPreferences):
    """Create or update user preferences"""
    try:
        # Validate that the payload includes the correct ID
        if preferences.id and preferences.id != user_id:
            raise HTTPException(status_code=400, detail="Payload id must match path user_id")
        
        user_data = {
            "id": user_id,
            "name": preferences.name,
            "email": preferences.email,
            "preferred_cuisines": preferences.preferred_cuisines,
            "spice_tolerance": preferences.spice_tolerance,
            "price_preference": preferences.price_preference,
            "dietary_restrictions": preferences.dietary_restrictions,
            "favorite_restaurants": preferences.favorite_restaurants,  # Save to favorite_restaurants field
            "favorite_dishes": preferences.favorite_dishes
        }
        
        result = db.upsert_user_profile(user_data)
        return result
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}/preferences")
async def update_user_preferences(user_id: str, preferences: UserPreferences):
    """Update user preferences"""
    try:
        user_data = {
            "name": preferences.name,
            "email": preferences.email,
            "preferred_cuisines": preferences.preferred_cuisines,
            "spice_tolerance": preferences.spice_tolerance,
            "price_preference": preferences.price_preference,
            "dietary_restrictions": preferences.dietary_restrictions,
            "favorite_restaurants": preferences.favorite_restaurants,  # Save to favorite_restaurants field
            "favorite_dishes": preferences.favorite_dishes
        }
        
        result = db.update_user_profile(user_id, user_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}/top-3-restaurants")
async def update_top_3_restaurants(user_id: str, restaurants: List[Dict]):
    """Update user's top 3 restaurants"""
    try:
        result = db.update_top_3_restaurants(user_id, restaurants)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/favorite-dishes")
async def add_favorite_dish(user_id: str, dish_data: Dict):
    """Add a favorite dish for a restaurant"""
    try:
        result = db.add_favorite_dish(user_id, dish_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/favorite-dishes")
async def get_favorite_dishes(user_id: str):
    """Get user's favorite dishes"""
    try:
        result = db.get_favorite_dishes(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
