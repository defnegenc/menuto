# app/routers/places.py
import os, httpx
from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional
from supabase import create_client, Client

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_PLACES_API_KEY")
router = APIRouter(prefix="/api/places", tags=["places"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
sb: Client | None = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Popular cities for home_base matching
POPULAR_CITIES = {
    "San Francisco": "37.7749,-122.4194",
    "New York": "40.7128,-74.0060",
    "Los Angeles": "34.0522,-118.2437",
    "Chicago": "41.8781,-87.6298",
    "Boston": "42.3601,-71.0589",
    "Seattle": "47.6062,-122.3321",
    "Austin": "30.2672,-97.7431",
    "Miami": "25.7617,-80.1918",
    "Denver": "39.7392,-104.9903",
    "Portland": "45.5152,-122.6784",
}

def _get_user_home_base(user_id: str) -> str | None:
    """Get user's home_base city name"""
    if not sb:
        return None
    try:
        r = sb.table("user_profiles").select("home_base").eq("id", user_id).maybe_single().execute()
        return r.data.get("home_base") if r.data else None
    except Exception:
        return None

async def _get_user_optional(authorization: Optional[str] = None) -> dict | None:
    """Get user if authenticated, return None if not (doesn't throw)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from app.require_user import require_user
        # Call require_user which will validate the token
        user = await require_user(authorization)
        return user
    except Exception:
        # If auth fails, return None (optional auth)
        return None

def _extract_city_from_address(address: str, home_base: str | None) -> bool:
    """Check if address is in the home_base city"""
    if not home_base or not address:
        return False
    address_lower = address.lower()
    home_base_lower = home_base.lower()
    # Simple check: city name appears in address
    return home_base_lower in address_lower

@router.get("/search")
async def search_places(
    query: str = Query(...),
    location: str | None = None,
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    if not API_KEY:
        raise HTTPException(404, "Google Places not configured")
    
    # Get user's home_base if authenticated (optional)
    user_home_base = None
    home_base_coords = None
    user = await _get_user_optional(authorization)
    if user:
        user_id = user.get("sub")
        user_home_base = _get_user_home_base(user_id) if user_id else None
        if user_home_base and user_home_base in POPULAR_CITIES:
            home_base_coords = POPULAR_CITIES[user_home_base]
            # Use home_base as location if no location specified
            if not location:
                location = home_base_coords
    
    # Use textsearch API to get multiple results (up to 20)
    params = {
        "query": query,
        "type": "restaurant",
        "key": API_KEY,
    }
    if location:
        params["location"] = location
        params["radius"] = "50000"  # 50km radius
    
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params=params,
        )
        r.raise_for_status()
        data = r.json()
        
        # Transform Google Places response
        restaurants = []
        if data.get("status") == "OK" and data.get("results"):
            for result in data["results"][:20]:  # Limit to 20 results
                address = result.get("formatted_address", "")
                restaurants.append({
                    "place_id": result["place_id"],
                    "name": result["name"],
                    "vicinity": address,
                    "cuisine_type": "Restaurant",  # Default since we don't have cuisine info
                    "rating": result.get("rating", 4.0),
                    "price_level": result.get("price_level"),
                    "has_menu": True,
                    "_address": address,  # Temporary field for city matching
                })
        
        # Re-rank: prioritize restaurants in user's home_base city
        if user_home_base and restaurants:
            home_city_restaurants = []
            other_restaurants = []
            
            for restaurant in restaurants:
                if _extract_city_from_address(restaurant["_address"], user_home_base):
                    home_city_restaurants.append(restaurant)
                else:
                    other_restaurants.append(restaurant)
            
            # Surface home_base restaurants first
            restaurants = home_city_restaurants + other_restaurants
        
        # Remove the temporary field before returning
        for restaurant in restaurants:
            restaurant.pop("_address", None)
        
        return {
            "query": query,
            "restaurants": restaurants,
            "total": len(restaurants),
            "source": "google_places",
            "home_base_prioritized": user_home_base if user_home_base else None
        }
