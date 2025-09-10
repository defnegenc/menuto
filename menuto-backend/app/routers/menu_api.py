# menuto-backend/app/routers/menu_api.py
from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any
import os
import logging
from supabase import create_client, Client

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase not configured")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def _get_latest_menu_by_place_or_name(place_id: str, restaurant_name: str):
    """
    Strategy:
      1) Try to find menu where restaurant_url == place_id (you store place_id here from the app)
      2) Fallback to case-insensitive name match
    """
        
    # 1) by place_id in restaurant_url
    menus = supabase.table("parsed_menus") \
        .select("*") \
        .eq("restaurant_url", place_id) \
        .order("parsed_at", desc=True) \
        .limit(1) \
        .execute()

    if menus.data:
        return menus.data[0]

    # 2) fallback by name (ilike)
    menus = supabase.table("parsed_menus") \
        .select("*") \
        .ilike("restaurant_name", f"%{restaurant_name}%") \
        .order("parsed_at", desc=True) \
        .limit(1) \
        .execute()

    return menus.data[0] if menus.data else None

@router.get("/menu/restaurant/{place_id}")
async def get_restaurant_menu(place_id: str, restaurant_name: str):
    """
    Fetch dishes from Supabase for the given restaurant.
    The mobile app passes restaurant.place_id AND restaurant.name.
    """
    try:
        if not place_id or not restaurant_name:
            raise HTTPException(status_code=400, detail="place_id and restaurant_name are required")

        logger.info(f"🍽️ Fetching menu for: {restaurant_name} ({place_id})")

        menu = _get_latest_menu_by_place_or_name(place_id, restaurant_name)
        dishes = []
        
        if menu:
            # Found menu entry, get dishes by menu_id
            menu_id = menu["id"]
            dishes = supabase.table("parsed_dishes").select("*").eq("menu_id", menu_id).execute().data or []
        else:
            # No menu entry found, try to find dishes directly by restaurant name
            # This handles cases where dishes exist but no menu entry was created
            logger.info(f"No menu entry found, searching dishes directly for: {restaurant_name}")
            dishes = supabase.table("parsed_dishes").select("*").ilike("name", f"%{restaurant_name}%").execute().data or []
            
            # If still no dishes, return empty list (no fallback to random dishes)
            if not dishes:
                logger.info(f"No dishes found for restaurant: {restaurant_name}")
                dishes = []

        # Normalize to what the app expects
        out = []
        for d in dishes:
            out.append({
                "id": d.get("id"),
                "name": d.get("name"),
                "description": d.get("description"),
                "category": d.get("category") or "main",
                "ingredients": d.get("ingredients") or [],
                "dietary_tags": d.get("dietary_tags") or [],
                "preparation_style": d.get("preparation_style") or [],
                "is_user_added": bool(d.get("is_user_added", False)),
            })

        cuisine_type = menu.get("cuisine_type", "restaurant") if menu else "restaurant"
        restaurant_display_name = menu["restaurant_name"] if menu else restaurant_name
        
        return {
            "restaurant": {"place_id": place_id, "name": restaurant_display_name, "cuisine_type": cuisine_type},
            "dishes": out,
            "total_items": len(out),
            "sources": ["supabase"],
            "success": True,
            "message": f"Found {len(out)} menu items",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Menu fetch error")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/menu/restaurant/{place_id}/coverage")
async def get_menu_coverage(place_id: str, restaurant_name: str):
    try:
        menu = _get_latest_menu_by_place_or_name(place_id, restaurant_name)
        if not menu:
            return {
                "restaurant": {"place_id": place_id, "name": restaurant_name},
                "coverage": {"status": "missing", "user_added_items": 0, "parsed_items": 0, "total_items": 0, "needs_contribution": True},
            }

        menu_id = menu["id"]
        items = supabase.table("parsed_dishes").select("*").eq("menu_id", menu_id).execute().data or []
        user_added = [i for i in items if i.get("is_user_added")]
        parsed = [i for i in items if not i.get("is_user_added")]
        status = "complete" if len(items) >= 5 else "partial" if len(items) > 0 else "missing"

        return {
            "restaurant": {"place_id": place_id, "name": menu["restaurant_name"]},
            "coverage": {
                "status": status,
                "user_added_items": len(user_added),
                "parsed_items": len(parsed),
                "total_items": len(items),
                "needs_contribution": len(items) < 3,
            },
        }
    except Exception as e:
        logger.exception("Coverage error")
        raise HTTPException(status_code=500, detail=str(e))