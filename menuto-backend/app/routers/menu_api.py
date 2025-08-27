from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.database_supabase import db as supabase_db
from app.services.menu_data_service import MenuDataService
from typing import List, Dict, Any

router = APIRouter()

@router.get("/restaurant/{place_id}")
async def get_restaurant_menu(place_id: str, restaurant_name: str, db: Session = Depends(get_db)):
    """
    Get the actual menu for a specific restaurant from multiple sources:
    1. Our in-house database (user-contributed)
    2. Google Places reviews (LLM extracted)
    3. Yelp data (if available)
    """
    try:
        if not place_id or not restaurant_name:
            raise HTTPException(status_code=400, detail="place_id and restaurant_name are required")
        
        print(f"🍽️  Fetching menu for: {restaurant_name} ({place_id})")
        
        # Get dishes from Supabase
        menu_items = supabase_db.get_dishes_by_place(place_id, restaurant_name)
        
        return {
            "restaurant": {
                "place_id": place_id,
                "name": restaurant_name
            },
            "menu_items": menu_items,
            "total_items": len(menu_items),
            "sources": list(set([item.get('source', 'unknown') for item in menu_items])),
            "message": f"Found {len(menu_items)} menu items"
        }
        
    except Exception as e:
        print(f"❌ Menu fetch error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restaurant/{place_id}/add-dish")
async def add_user_dish(place_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Allow users to add missing menu items to build our in-house menu database
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
        
        dish_data = {
            'name': dish_name,
            'description': dish_description,
            'price': dish_price,
            'category': dish_category,
            'ingredients': data.get('ingredients', []),
            'dietary_tags': data.get('dietary_tags', [])
        }
        
        menu_service = MenuDataService()
        result = menu_service.add_user_contributed_dish(
            place_id, restaurant_name, dish_data, db
        )
        
        return result
        
    except Exception as e:
        print(f"❌ Add dish error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/restaurant/{place_id}/coverage")
async def get_menu_coverage(place_id: str, restaurant_name: str, db: Session = Depends(get_db)):
    """
    Check what menu data we have for a restaurant and suggest if user should contribute
    """
    try:
        menu_service = MenuDataService()
        menu_items = menu_service.get_restaurant_menu(place_id, restaurant_name, db)
        
        # Analyze coverage
        database_items = [item for item in menu_items if item.get('source') == 'database']
        extracted_items = [item for item in menu_items if item.get('source') == 'reviews']
        
        coverage_status = "complete" if len(database_items) >= 5 else "partial" if len(database_items) > 0 else "missing"
        
        return {
            "restaurant": {
                "place_id": place_id,
                "name": restaurant_name
            },
            "coverage": {
                "status": coverage_status,
                "database_items": len(database_items),
                "extracted_items": len(extracted_items),
                "total_items": len(menu_items),
                "needs_contribution": len(database_items) < 3
            },
            "suggestions": {
                "add_popular_items": len(database_items) < 3,
                "verify_prices": len([item for item in menu_items if not item.get('price')]) > 0,
                "add_descriptions": len([item for item in menu_items if not item.get('description')]) > 0
            }
        }
        
    except Exception as e:
        print(f"❌ Coverage check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))