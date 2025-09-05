# app/routers/places.py
import os, httpx
from fastapi import APIRouter, HTTPException, Query

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_PLACES_API_KEY")
router = APIRouter(prefix="/api/places", tags=["places"])

@router.get("/search")
async def search_places(query: str = Query(...), location: str | None = None):
    if not API_KEY:
        raise HTTPException(404, "Google Places not configured")
    params = {
        "input": query,
        "inputtype": "textquery",
        "fields": "place_id,name,formatted_address,geometry",
        "key": API_KEY,
    }
    if location:
        params["location"] = location
        params["radius"] = "50000"
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
            params=params,
        )
        r.raise_for_status()
        data = r.json()
        
        # Transform Google Places response to match frontend expectations
        if data.get("status") == "OK" and data.get("candidates"):
            restaurants = []
            for candidate in data["candidates"]:
                restaurants.append({
                    "place_id": candidate["place_id"],
                    "name": candidate["name"],
                    "vicinity": candidate["formatted_address"],
                    "cuisine_type": "Restaurant",  # Default since we don't have cuisine info
                    "rating": 4.0,  # Default rating
                    "price_level": None,
                    "has_menu": True
                })
            
            return {
                "query": query,
                "restaurants": restaurants,
                "total": len(restaurants),
                "source": "google_places"
            }
        else:
            return {
                "query": query,
                "restaurants": [],
                "total": 0,
                "source": "google_places",
                "status": data.get("status", "UNKNOWN_ERROR")
            }
