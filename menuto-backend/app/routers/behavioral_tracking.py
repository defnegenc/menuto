"""
Behavioral tracking endpoints for recommendations.
Tracks user interactions (orders, views, ratings, favorites) to improve recommendations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.database import get_db
from app.require_user import require_user
from app.models_behavior import DishOrder, DishView, DishRating, DishFavorite
from app.services.enhanced_recommendation_algorithm import (
    EnhancedRecommendationAlgorithm,
    analyze_user_taste_profile_simple
)
import logging
import uuid
import json
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()


class TrackOrderRequest(BaseModel):
    dish_id: str  # Will be converted to BigInteger
    restaurant_place_id: str
    hunger_level: Optional[int] = None
    cravings: Optional[List[str]] = None


class TrackViewRequest(BaseModel):
    dish_id: str
    restaurant_place_id: str
    view_duration_seconds: Optional[int] = None


class TrackRatingRequest(BaseModel):
    dish_id: str
    restaurant_place_id: str
    rating: float
    feedback_text: Optional[str] = None
    would_order_again: Optional[bool] = None
    hunger_level_when_ordered: Optional[int] = None


class TrackFavoriteRequest(BaseModel):
    dish_id: str
    restaurant_place_id: str
    action: str  # "add" or "remove"


@router.post("/track/order")
async def track_dish_order(
    request: TrackOrderRequest,
    user: dict = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Track when a user orders a dish (critical signal).
    Call this when user confirms they're ordering/ordered this dish.
    """
    user_id = user.get("sub")  # Supabase Auth user ID
    
    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")
    
    order = DishOrder(
        id=uuid.uuid4(),
        user_id=user_id,
        dish_id=dish_id_int,
        restaurant_place_id=request.restaurant_place_id,
        hunger_level=request.hunger_level,
        cravings=json.dumps(request.cravings) if request.cravings else None
    )
    
    db.add(order)
    db.commit()
    
    logger.info(f"Tracked order: user={user_id}, dish={request.dish_id}")
    
    return {"status": "tracked", "type": "order"}


@router.post("/track/view")
async def track_dish_view(
    request: TrackViewRequest,
    user: dict = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Track when a user views a dish detail page.
    Call this when user opens dish details or spends time viewing.
    """
    user_id = user.get("sub")
    
    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")
    
    view = DishView(
        id=uuid.uuid4(),
        user_id=user_id,
        dish_id=dish_id_int,
        restaurant_place_id=request.restaurant_place_id,
        view_duration_seconds=request.view_duration_seconds
    )
    
    db.add(view)
    db.commit()
    
    return {"status": "tracked", "type": "view"}


@router.post("/track/rating")
async def track_dish_rating(
    request: TrackRatingRequest,
    user: dict = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Track user rating after eating.
    Call this in your PostMealFeedback screen.
    """
    if not 1 <= request.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    user_id = user.get("sub")
    
    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")
    
    rating_obj = DishRating(
        id=uuid.uuid4(),
        user_id=user_id,
        dish_id=dish_id_int,
        restaurant_place_id=request.restaurant_place_id,
        rating=request.rating,
        feedback_text=request.feedback_text,
        would_order_again=request.would_order_again,
        hunger_level_when_ordered=request.hunger_level_when_ordered
    )
    
    db.add(rating_obj)
    db.commit()
    
    logger.info(f"Tracked rating: user={user_id}, dish={request.dish_id}, rating={request.rating}")
    
    return {"status": "tracked", "type": "rating"}


@router.post("/track/favorite")
async def track_dish_favorite(
    request: TrackFavoriteRequest,
    user: dict = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Track when user adds/removes dish as favorite.
    Call this when user taps the heart/favorite icon.
    """
    user_id = user.get("sub")
    
    if request.action not in ["add", "remove"]:
        raise HTTPException(status_code=400, detail="Action must be 'add' or 'remove'")
    
    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")
    
    if request.action == "add":
        # Check if already exists
        existing = db.query(DishFavorite).filter(
            DishFavorite.user_id == user_id,
            DishFavorite.dish_id == dish_id_int,
            DishFavorite.removed_at == None
        ).first()
        
        if not existing:
            favorite = DishFavorite(
                id=uuid.uuid4(),
                user_id=user_id,
                dish_id=dish_id_int,
                restaurant_place_id=request.restaurant_place_id
            )
            db.add(favorite)
            db.commit()
            logger.info(f"Added favorite: user={user_id}, dish={request.dish_id}")
        
        return {"status": "tracked", "action": "added"}
    
    elif request.action == "remove":
        # Mark as removed (soft delete)
        existing = db.query(DishFavorite).filter(
            DishFavorite.user_id == user_id,
            DishFavorite.dish_id == dish_id_int,
            DishFavorite.removed_at == None
        ).first()
        
        if existing:
            existing.removed_at = datetime.utcnow()
            db.commit()
            logger.info(f"Removed favorite: user={user_id}, dish={request.dish_id}")
        
        return {"status": "tracked", "action": "removed"}


@router.get("/dish/{dish_id}/stats")
async def get_dish_stats(
    dish_id: str,
    db: Session = Depends(get_db)
):
    """
    Get behavioral stats for a dish.
    Useful for showing popularity indicators in UI.
    """
    from sqlalchemy import func
    
    try:
        dish_id_int = int(dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")
    
    order_count = db.query(func.count(DishOrder.id)).filter(
        DishOrder.dish_id == dish_id_int
    ).scalar() or 0
    
    view_count = db.query(func.count(DishView.id)).filter(
        DishView.dish_id == dish_id_int
    ).scalar() or 0
    
    rating_stats = db.query(
        func.avg(DishRating.rating),
        func.count(DishRating.id)
    ).filter(
        DishRating.dish_id == dish_id_int
    ).first()
    
    avg_rating = float(rating_stats[0]) if rating_stats[0] else 0.0
    rating_count = rating_stats[1] or 0
    
    # Get recent orders (trending indicator)
    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    recent_order_count = db.query(func.count(DishOrder.id)).filter(
        DishOrder.dish_id == dish_id_int,
        DishOrder.ordered_at >= thirty_days_ago
    ).scalar() or 0
    
    return {
        "dish_id": dish_id,
        "order_count": order_count,
        "view_count": view_count,
        "avg_rating": round(avg_rating, 2),
        "rating_count": rating_count,
        "recent_order_count": recent_order_count,
        "is_trending": recent_order_count > order_count * 0.5  # 50%+ orders in last 30 days
    }


@router.get("/restaurant/{restaurant_place_id}/popular-dishes")
async def get_popular_dishes(
    restaurant_place_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get popular dishes for a restaurant, sorted by popularity score.
    
    Popularity is calculated from:
    - Order count (strongest signal, weight: 1.0)
    - Average rating (gold standard, weight: 0.8, needs 3+ ratings)
    - View count (interest signal, weight: 0.3)
    - Recent orders boost (trending, weight: 0.2)
    
    Returns dishes sorted by popularity score (highest first).
    """
    from app.services.enhanced_recommendation_algorithm import EnhancedRecommendationAlgorithm
    from app.models import ParsedDish, ParsedMenu
    
    algorithm = EnhancedRecommendationAlgorithm(db)
    
    # Get all dishes for this restaurant
    dishes = db.query(ParsedDish).join(
        ParsedMenu, ParsedDish.menu_id == ParsedMenu.id
    ).filter(
        ParsedMenu.place_id == restaurant_place_id
    ).all()
    
    if not dishes:
        return {
            "restaurant_place_id": restaurant_place_id,
            "popular_dishes": [],
            "total_dishes": 0
        }
    
    # Get signals for all dishes
    signals_dict = algorithm.get_dish_signals(restaurant_place_id)
    
    # Calculate popularity scores and build response
    popular_dishes = []
    for dish in dishes:
        dish_id_str = str(dish.id)
        signals = signals_dict.get(dish_id_str)
        
        if not signals:
            continue
        
        popularity_score = algorithm.calculate_popularity_score(signals)
        
        popular_dishes.append({
            "id": dish_id_str,
            "name": dish.name,
            "description": dish.description or "",
            "category": dish.category or "main",
            "price": float(dish.price) if dish.price else None,
            "popularity_score": round(popularity_score, 3),
            "signals": {
                "order_count": signals.order_count,
                "view_count": signals.view_count,
                "avg_rating": round(signals.avg_rating, 2) if signals.avg_rating > 0 else None,
                "rating_count": signals.rating_count,
                "recent_order_boost": round(signals.recent_order_boost, 3)
            }
        })
    
    # Sort by popularity score (highest first)
    popular_dishes.sort(key=lambda x: x["popularity_score"], reverse=True)
    
    # Limit results
    popular_dishes = popular_dishes[:limit]
    
    return {
        "restaurant_place_id": restaurant_place_id,
        "popular_dishes": popular_dishes,
        "total_dishes": len(dishes),
        "returned_count": len(popular_dishes)
    }

