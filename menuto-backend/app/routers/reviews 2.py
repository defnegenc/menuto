from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Restaurant, Review, ReviewerProfile
from app.services.review_ingestion import ingest_restaurant_reviews
from typing import Optional

router = APIRouter()

@router.post("/{restaurant_id}/ingest")
async def ingest_reviews(
    restaurant_id: int,
    google_place_id: Optional[str] = None,
    yelp_business_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Ingest reviews for a restaurant from Google/Yelp"""
    
    # Check restaurant exists
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Update restaurant with platform IDs
    if google_place_id:
        restaurant.google_place_id = google_place_id
    if yelp_business_id:
        restaurant.yelp_business_id = yelp_business_id
    
    try:
        # Ingest reviews
        reviews_data = ingest_restaurant_reviews(google_place_id, yelp_business_id)
        
        created_reviews = []
        for review_data in reviews_data:
            # Check if review already exists
            existing_review = db.query(Review).filter(
                Review.restaurant_id == restaurant_id,
                Review.reviewer_external_id == review_data["reviewer_external_id"],
                Review.platform == review_data["platform"]
            ).first()
            
            if not existing_review:
                review = Review(
                    restaurant_id=restaurant_id,
                    reviewer_external_id=review_data["reviewer_external_id"],
                    platform=review_data["platform"],
                    rating=review_data["rating"],
                    text=review_data["text"],
                    sentiment_score=review_data["sentiment_score"],
                    extracted_attributes=review_data["extracted_attributes"],
                    preparation_feedback=review_data["preparation_feedback"],
                    context_tags=review_data["context_tags"]
                )
                db.add(review)
                created_reviews.append(review_data)
        
        db.commit()
        
        # Update restaurant average rating
        avg_rating = db.query(Review).filter(Review.restaurant_id == restaurant_id).with_entities(
            db.func.avg(Review.rating)
        ).scalar()
        restaurant.avg_rating = float(avg_rating) if avg_rating else 0.0
        db.commit()
        
        return {
            "message": f"Ingested {len(created_reviews)} new reviews",
            "reviews_count": len(created_reviews)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{restaurant_id}")
async def get_restaurant_reviews(
    restaurant_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get reviews for a restaurant"""
    reviews = db.query(Review).filter(
        Review.restaurant_id == restaurant_id
    ).limit(limit).all()
    
    return [
        {
            "id": review.id,
            "platform": review.platform,
            "rating": review.rating,
            "text": review.text,
            "sentiment_score": review.sentiment_score,
            "extracted_attributes": review.extracted_attributes,
            "created_at": review.created_at
        }
        for review in reviews
    ]