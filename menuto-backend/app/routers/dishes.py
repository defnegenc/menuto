from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Dish, User, UserRating
from typing import Optional

router = APIRouter()

@router.get("/{dish_id}")
async def get_dish_details(dish_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific dish"""
    
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    
    return {
        "id": dish.id,
        "name": dish.name,
        "description": dish.description,
        "price": dish.price,
        "category": dish.category,
        "ingredients": dish.ingredients,
        "dietary_tags": dish.dietary_tags,
        "preparation_style": dish.preparation_style,
        "avg_rating": dish.avg_rating,
        "total_reviews": dish.total_reviews,
        "restaurant": {
            "id": dish.restaurant.id,
            "name": dish.restaurant.name,
            "cuisine_type": dish.restaurant.cuisine_type
        }
    }

@router.post("/{dish_id}/rate")
async def rate_dish(
    dish_id: int,
    user_id: int,
    rating: float,
    notes: Optional[str] = None,
    saltiness: Optional[int] = None,
    spiciness: Optional[int] = None,
    richness: Optional[int] = None,
    portion_size: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """User rates a dish with detailed feedback"""
    
    # Verify dish exists
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate rating
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user already rated this dish
    existing_rating = db.query(UserRating).filter(
        UserRating.user_id == user_id,
        UserRating.dish_id == dish_id
    ).first()
    
    if existing_rating:
        # Update existing rating
        existing_rating.rating = rating
        existing_rating.notes = notes
        existing_rating.saltiness = saltiness
        existing_rating.spiciness = spiciness
        existing_rating.richness = richness
        existing_rating.portion_size = portion_size
    else:
        # Create new rating
        user_rating = UserRating(
            user_id=user_id,
            dish_id=dish_id,
            rating=rating,
            notes=notes,
            saltiness=saltiness,
            spiciness=spiciness,
            richness=richness,
            portion_size=portion_size
        )
        db.add(user_rating)
    
    db.commit()
    
    # Update dish average rating and count
    dish_ratings = db.query(UserRating).filter(UserRating.dish_id == dish_id).all()
    if dish_ratings:
        dish.avg_rating = sum(r.rating for r in dish_ratings) / len(dish_ratings)
        dish.total_reviews = len(dish_ratings)
        db.commit()
    
    return {
        "message": "Rating submitted successfully",
        "dish": {
            "id": dish.id,
            "name": dish.name,
            "new_avg_rating": dish.avg_rating,
            "total_reviews": dish.total_reviews
        }
    }

@router.get("/{dish_id}/user-rating/{user_id}")
async def get_user_dish_rating(
    dish_id: int, 
    user_id: int, 
    db: Session = Depends(get_db)
):
    """Get a user's rating for a specific dish"""
    
    rating = db.query(UserRating).filter(
        UserRating.user_id == user_id,
        UserRating.dish_id == dish_id
    ).first()
    
    if not rating:
        raise HTTPException(status_code=404, detail="User has not rated this dish")
    
    return {
        "dish_id": dish_id,
        "user_id": user_id,
        "rating": rating.rating,
        "notes": rating.notes,
        "feedback": {
            "saltiness": rating.saltiness,
            "spiciness": rating.spiciness,
            "richness": rating.richness,
            "portion_size": rating.portion_size
        },
        "created_at": rating.created_at
    }