from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import logging
from app.database_supabase import db as supabase_db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/restaurant/{place_id}")
async def get_restaurant_menu(place_id: str, restaurant_name: str):
    """
    Get the actual menu for a specific restaurant from Supabase
    """
    try:
        if not place_id or not restaurant_name:
            raise HTTPException(status_code=400, detail="place_id and restaurant_name are required")
        
        print(f"🍽️  Fetching menu for: {restaurant_name} ({place_id})")
        
        # Get dishes from Supabase
        menu_items = supabase_db.get_dishes_by_place(place_id, restaurant_name)
        
        # Get cuisine_type from parsed_menus table
        menus = supabase_db.client.table("parsed_menus").select("cuisine_type").ilike("restaurant_name", f"%{restaurant_name}%").execute()
        cuisine_type = menus.data[0].get('cuisine_type', 'restaurant') if menus.data else 'restaurant'
        
        return {
            "restaurant": {
                "place_id": place_id,
                "name": restaurant_name,
                "cuisine_type": cuisine_type
            },
            "dishes": menu_items,
            "total_items": len(menu_items),
            "sources": ["supabase"],
            "message": f"Found {len(menu_items)} menu items"
        }
        
    except Exception as e:
        print(f"❌ Menu fetch error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restaurant/{place_id}/add-dish")
async def add_user_dish(place_id: str, request: Request):
    """
    Allow users to add missing menu items to Supabase
    """
    try:
        data = await request.json()
        
        restaurant_name = data.get('restaurant_name')
        dish_name = data.get('dish_name')
        dish_description = data.get('dish_description', '')
        dish_price = data.get('dish_price')
        dish_category = data.get('dish_category', 'main')
        
        if not restaurant_name or not dish_name:
            raise HTTPException(status_code=400, detail="restaurant_name and dish_name are required")
        
        # Convert price to float if provided
        if dish_price:
            try:
                dish_price = float(dish_price)
            except (ValueError, TypeError):
                dish_price = None
        
        # Find or create menu in Supabase
        menus = supabase_db.client.table("parsed_menus").select("*").eq("restaurant_name", restaurant_name).execute()
        
        if not menus.data:
            # Create new menu
            menu_data = {
                "restaurant_name": restaurant_name,
                "restaurant_url": "",
                "menu_url": "",
                "dish_count": 1
            }
            menu_result = supabase_db.client.table("parsed_menus").insert(menu_data).execute()
            menu_id = menu_result.data[0]["id"] if menu_result.data else None
        else:
            menu_id = menus.data[0]["id"]
        
        if not menu_id:
            raise HTTPException(status_code=500, detail="Failed to create or find menu")
        
        # Add dish to Supabase
        dish_data = {
            "menu_id": menu_id,
            "name": dish_name,
            "description": dish_description,
            "category": dish_category,
            "ingredients": data.get('ingredients', []),
            "dietary_tags": data.get('dietary_tags', []),
            "preparation_style": data.get('preparation_style', []),
            "is_user_added": True
        }
        
        dish_result = supabase_db.client.table("parsed_dishes").insert(dish_data).execute()
        
        if not dish_result.data:
            raise HTTPException(status_code=500, detail="Failed to add dish")
        
        return {
            "success": True,
            "message": f"Successfully added dish '{dish_name}' to {restaurant_name}",
            "dish": dish_result.data[0]
        }
        
    except Exception as e:
        print(f"❌ Add dish error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/restaurant/{place_id}/coverage")
async def get_menu_coverage(place_id: str, restaurant_name: str):
    """
    Check what menu data we have for a restaurant in Supabase
    """
    try:
        menu_items = supabase_db.get_dishes_by_place(place_id, restaurant_name)
        
        # Analyze coverage
        user_added_items = [item for item in menu_items if item.get('is_user_added')]
        parsed_items = [item for item in menu_items if not item.get('is_user_added')]
        
        coverage_status = "complete" if len(menu_items) >= 5 else "partial" if len(menu_items) > 0 else "missing"
        
        return {
            "restaurant": {
                "place_id": place_id,
                "name": restaurant_name
            },
            "coverage": {
                "status": coverage_status,
                "user_added_items": len(user_added_items),
                "parsed_items": len(parsed_items),
                "total_items": len(menu_items),
                "needs_contribution": len(menu_items) < 3
            },
            "suggestions": {
                "add_popular_items": len(menu_items) < 3,
                "verify_prices": len([item for item in menu_items if not item.get('price')]) > 0,
                "add_descriptions": len([item for item in menu_items if not item.get('description')]) > 0
            }
        }
        
    except Exception as e:
        print(f"❌ Coverage check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))