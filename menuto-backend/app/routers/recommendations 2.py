from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Restaurant
from app.services.ranking_engine import rank_restaurant_dishes
from typing import Optional

router = APIRouter()

@router.get("/{restaurant_id}")
async def get_dish_recommendations(
    restaurant_id: int,
    user_id: int,
    budget: Optional[float] = Query(None, description="Budget constraint for recommendations"),
    occasion: Optional[str] = Query(None, description="Occasion type (date_night, quick_lunch, etc.)"),
    spice_preference: Optional[str] = Query(None, description="Spice preference (mild, medium, spicy)"),
    dietary_constraints: Optional[str] = Query(None, description="Temporary dietary constraints (comma-separated)"),
    db: Session = Depends(get_db)
):
    """Get personalized dish recommendations for a user at a restaurant"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify restaurant exists
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
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
    
    try:
        # Get ranked recommendations
        ranked_dishes = rank_restaurant_dishes(restaurant_id, user_id, context, db)
        
        # Format response safely
        recommendations = []
        for item in ranked_dishes:
            dish = item['dish']
            
            # Safe property access
            recommendations.append({
                "dish_id": dish.id,
                "name": str(dish.name) if dish.name else "",
                "description": str(dish.description) if dish.description else "",
                "price": float(dish.price) if dish.price else 0.0,
                "category": str(dish.category) if dish.category else "",
                "ingredients": dish.ingredients if dish.ingredients else [],
                "dietary_tags": dish.dietary_tags if dish.dietary_tags else [],
                "score": round(item['score'] * 100),
                "explanation": str(item['explanation']) if item['explanation'] else "",
                "component_scores": {
                    "personal_match": round(item['component_scores']['personal_match'] * 100),
                    "review_consensus": round(item['component_scores']['review_consensus'] * 100),
                    "social_affinity": round(item['component_scores']['social_affinity'] * 100),
                    "context_fit": round(item['component_scores']['context_fit'] * 100)
                }
            })
        
        return {
            "restaurant": {
                "id": restaurant.id,
                "name": str(restaurant.name) if restaurant.name else "",
                "cuisine_type": str(restaurant.cuisine_type) if restaurant.cuisine_type else ""
            },
            "user_context": context,
            "recommendations": recommendations
        }
        
    except Exception as e:
        # Return detailed error for debugging
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "context": context
        }