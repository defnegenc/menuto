# app/users.py
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase import create_client, Client
from app.require_user import require_user

logger = logging.getLogger(__name__)

DEV = (os.getenv("API_ENV") or "prod").lower() == "dev"

router = APIRouter(prefix="/users", tags=["users"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use service-role in the backend so RLS isn't a blocker
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase not configured for users - using mock mode")
    sb = None
else:
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
TABLE = "user_profiles"  # <-- matches your schema screenshot

class UserPreferences(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    profile_photo: Optional[str] = None
    preferred_cuisines: List[str] = []
    spice_tolerance: int = 3
    price_preference: int = 2
    dietary_restrictions: List[str] = []
    favorite_restaurants: List[Dict] = []
    favorite_dishes: List[Dict] = []
    top_3_restaurants: List[Dict] = []
    home_base: Optional[str] = None

def _get_user(user_id: str):
    if not sb:
        return None
    r = sb.table(TABLE).select("*").eq("id", user_id).maybe_single().execute()
    return r.data if r else None

def _upsert(row: dict):
    if not sb:
        return row  # Return the data as-is in mock mode
    # First upsert the data
    sb.table(TABLE).upsert(row, on_conflict="id").execute()
    # Then fetch the updated record
    r = sb.table(TABLE).select("*").eq("id", row["id"]).maybe_single().execute()
    return r.data

@router.get("/{user_id}/preferences")
async def get_user_preferences(user_id: str, user=Depends(require_user)):
    # In dev mode, allow any user_id for testing
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    data = _get_user(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data

@router.post("/{user_id}/preferences")
async def create_user_preferences(user_id: str, prefs: UserPreferences, user=Depends(require_user)):
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if prefs.id and prefs.id != user_id:
        raise HTTPException(status_code=400, detail="Payload id must match path user_id")
    row = {"id": user_id, **prefs.model_dump(exclude={"id"})}
    return _upsert(row)

@router.put("/{user_id}/preferences")
async def update_user_preferences(user_id: str, prefs: UserPreferences, user=Depends(require_user)):
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    current = _get_user(user_id) or {"id": user_id}
    row = {**current, **prefs.model_dump(exclude_none=True)}
    return _upsert(row)

@router.put("/{user_id}/top-3-restaurants")
async def update_top_3_restaurants(user_id: str, restaurants: List[Dict], user=Depends(require_user)):
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not sb:
        return {"success": True, "message": "Mock mode - not saved to database"}
    r = sb.table(TABLE).update({"top_3_restaurants": restaurants}).eq("id", user_id).execute()
    return {"success": bool(r.data)}

@router.post("/{user_id}/favorite-dishes")
async def add_favorite_dish(user_id: str, dish_data: Dict, user=Depends(require_user)):
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not sb:
        return {"success": True, "message": "Mock mode - not saved to database"}
    current = _get_user(user_id) or {"id": user_id}
    favs = (current.get("favorite_dishes") or []) + [dish_data]
    r = sb.table(TABLE).update({"favorite_dishes": favs}).eq("id", user_id).execute()
    return {"success": bool(r.data)}

@router.get("/{user_id}/favorite-dishes")
async def get_favorite_dishes(user_id: str, user=Depends(require_user)):
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    current = _get_user(user_id) or {}
    return current.get("favorite_dishes", [])

@router.get("/{user_id}/tried-dishes")
async def get_tried_dishes(user_id: str, user=Depends(require_user)):
    """
    Get dishes the user has tried (ordered or rated).
    Combines data from dish_orders and dish_ratings tables, joined with parsed_dishes.
    """
    if not DEV and user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not sb:
        return []

    tried_dishes = []

    # Query orders and ratings from Supabase
    # First, get orders
    try:
        orders_response = sb.table("dish_orders") \
            .select("dish_id, restaurant_place_id, ordered_at") \
            .eq("user_id", user_id) \
            .order("ordered_at", desc=True) \
            .execute()

        order_dict = {}
        if orders_response.data:
            for order in orders_response.data:
                dish_id = str(order.get("dish_id"))
                if dish_id not in order_dict:
                    order_dict[dish_id] = {
                        "dish_id": dish_id,
                        "restaurant_place_id": order.get("restaurant_place_id"),
                        "tried_at": order.get("ordered_at"),
                        "rating": None,
                    }
    except Exception as e:
        logger.error("Error querying dish_orders for user %s: %s", user_id, e)
        order_dict = {}

    # Get ratings and merge with orders
    try:
        ratings_response = sb.table("dish_ratings") \
            .select("dish_id, restaurant_place_id, rating, rated_at") \
            .eq("user_id", user_id) \
            .order("rated_at", desc=True) \
            .execute()

        if ratings_response.data:
            for rating in ratings_response.data:
                dish_id = str(rating.get("dish_id"))
                rated_at = rating.get("rated_at")

                if dish_id in order_dict:
                    # Update existing order entry with rating
                    existing_date = order_dict[dish_id]["tried_at"]
                    if existing_date and rated_at:
                        try:
                            existing_dt = datetime.fromisoformat(existing_date.replace('Z', '+00:00')) if isinstance(existing_date, str) else existing_date
                            rated_dt = datetime.fromisoformat(rated_at.replace('Z', '+00:00')) if isinstance(rated_at, str) else rated_at
                            if rated_dt > existing_dt:
                                order_dict[dish_id]["tried_at"] = rated_at
                        except Exception as e:
                            logger.error("Error parsing date for dish %s: %s", dish_id, e)
                    order_dict[dish_id]["rating"] = rating.get("rating")
                else:
                    # New entry from rating only
                    order_dict[dish_id] = {
                        "dish_id": dish_id,
                        "restaurant_place_id": rating.get("restaurant_place_id"),
                        "tried_at": rated_at,
                        "rating": rating.get("rating"),
                    }
    except Exception as e:
        logger.error("Error querying dish_ratings for user %s: %s", user_id, e)

    # Fetch dish details from parsed_dishes
    for dish_id, dish_info in order_dict.items():
        try:
            dish_response = sb.table("parsed_dishes") \
                .select("id, name, description, category, price, price_text") \
                .eq("id", int(dish_id)) \
                .maybe_single() \
                .execute()

            if dish_response.data:
                dish_data = dish_response.data
                tried_dishes.append({
                    "id": str(dish_data.get("id")),
                    "name": dish_data.get("name", "Unknown Dish"),
                    "description": dish_data.get("description"),
                    "category": dish_data.get("category"),
                    "price": dish_data.get("price"),
                    "price_text": dish_data.get("price_text"),
                    "restaurant_place_id": dish_info["restaurant_place_id"],
                    "rating": dish_info["rating"],
                    "tried_at": dish_info["tried_at"],
                })
        except Exception as e:
            logger.error("Error fetching dish details for %s: %s", dish_id, e)
            # Include basic info even if dish details fail
            tried_dishes.append({
                "id": dish_id,
                "name": "Unknown Dish",
                "description": None,
                "category": None,
                "price": None,
                "price_text": None,
                "restaurant_place_id": dish_info["restaurant_place_id"],
                "rating": dish_info["rating"],
                "tried_at": dish_info["tried_at"],
            })

    # Sort by tried_at descending (most recent first)
    def get_tried_at_timestamp(dish):
        tried_at = dish.get("tried_at")
        if not tried_at:
            return datetime.min
        try:
            if isinstance(tried_at, str):
                return datetime.fromisoformat(tried_at.replace('Z', '+00:00'))
            return tried_at
        except Exception:
            return datetime.min

    tried_dishes.sort(key=get_tried_at_timestamp, reverse=True)

    return tried_dishes
