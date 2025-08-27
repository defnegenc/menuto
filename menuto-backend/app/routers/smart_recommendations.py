from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.recommendation_engine import RecommendationEngine
from app.services.demo_recommendations import generate_demo_recommendations
from app.services.smart_recommendation_algorithm import SmartRecommendationAlgorithm
from app.services.menu_data_service import MenuDataService
from typing import List, Dict, Any, Optional
import json

router = APIRouter()

@router.post("/generate")
async def generate_smart_recommendations(request: Request, db: Session = Depends(get_db)):
    """
    Generate intelligent recommendations based on user's favorite dishes and restaurant reviews
    Uses the new SmartRecommendationAlgorithm with real menu data
    """
    try:
        data = await request.json()
        
        restaurant_place_id = data.get('restaurant_place_id')
        restaurant_name = data.get('restaurant_name')  
        user_favorite_dishes = data.get('user_favorite_dishes', [])
        user_dietary_constraints = data.get('user_dietary_constraints', [])
        friend_selections = data.get('friend_selections', [])
        
        if not restaurant_place_id or not restaurant_name:
            raise HTTPException(status_code=400, detail="restaurant_place_id and restaurant_name are required")
        
        print(f"🤖 Generating smart recommendations for {restaurant_name}")
        print(f"👤 User has {len(user_favorite_dishes)} favorite dishes")
        
        # Get actual menu items from multiple sources (with caching)
        menu_service = MenuDataService()
        menu_items = menu_service.get_restaurant_menu(restaurant_place_id, restaurant_name, db)
        
        if not menu_items:
            print(f"⚠️  No menu items found for {restaurant_name}")
            return {
                "restaurant": {
                    "place_id": restaurant_place_id,
                    "name": restaurant_name
                },
                "recommendations": [],
                "total_count": 0,
                "message": f"No menu items available for {restaurant_name}. Try adding some menu items manually."
            }
        
        # Use smart recommendation algorithm
        smart_algorithm = SmartRecommendationAlgorithm()
        scored_recommendations = smart_algorithm.score_menu_items(
            menu_items=menu_items,
            user_favorite_dishes=user_favorite_dishes,
            user_dietary_restrictions=user_dietary_constraints,
            friend_selections=friend_selections
        )
        
        return {
            "restaurant": {
                "place_id": restaurant_place_id,
                "name": restaurant_name
            },
            "recommendations": scored_recommendations,
            "total_count": len(scored_recommendations),
            "message": f"Found {len(scored_recommendations)} personalized recommendations based on real menu items"
        }
        
    except Exception as e:
        print(f"❌ Smart recommendations error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-taste-profile")
async def analyze_taste_profile(request: Request):
    """
    Analyze a user's taste profile based on their favorite dishes
    """
    try:
        data = await request.json()
        user_favorite_dishes = data.get('user_favorite_dishes', [])
        
        if not user_favorite_dishes:
            raise HTTPException(status_code=400, detail="user_favorite_dishes is required")
        
        engine = RecommendationEngine()
        taste_profile = engine.analyze_user_taste_profile(user_favorite_dishes)
        
        return {
            "taste_profile": taste_profile,
            "dishes_analyzed": len(user_favorite_dishes)
        }
        
    except Exception as e:
        print(f"❌ Taste profile analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain-recommendation")
async def explain_recommendation(request: Request):
    """
    Get detailed explanation for why a specific dish was recommended
    """
    try:
        data = await request.json()
        
        dish_data = data.get('dish')
        if not dish_data:
            raise HTTPException(status_code=400, detail="dish data is required")
        
        smart_algorithm = SmartRecommendationAlgorithm()
        explanation = smart_algorithm.explain_recommendation(dish_data)
        
        return {
            "explanation": explanation,
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Recommendation explanation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/build-taste-profile")
async def build_taste_profile(request: Request):
    """
    Build a comprehensive taste profile from user's favorite dishes
    This helps train the recommendation algorithm
    """
    try:
        data = await request.json()
        
        user_favorite_dishes = data.get('user_favorite_dishes', [])
        if not user_favorite_dishes:
            raise HTTPException(status_code=400, detail="user_favorite_dishes is required")
        
        smart_algorithm = SmartRecommendationAlgorithm()
        taste_profile = smart_algorithm.build_user_taste_profile(user_favorite_dishes)
        
        return {
            "taste_profile": taste_profile,
            "dishes_analyzed": len(user_favorite_dishes),
            "success": True,
            "message": f"Built taste profile from {len(user_favorite_dishes)} favorite dishes"
        }
        
    except Exception as e:
        print(f"❌ Taste profile building error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))