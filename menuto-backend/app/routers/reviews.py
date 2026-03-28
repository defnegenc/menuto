import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.services.review_ingestion import (
    get_reviews_for_restaurant,
    get_dish_sentiment_scores,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{place_id}/reviews")
async def get_reviews(
    place_id: str,
    force_refresh: bool = Query(False, description="Bypass cache and re-fetch from Google"),
):
    """
    Get reviews for a restaurant by Google Place ID.
    Uses cached reviews when available (14-day TTL).
    Pass ?force_refresh=true to bypass cache.
    """
    try:
        if force_refresh:
            # Import internals to force a cache miss
            from app.services.review_ingestion import _fetch_google_reviews, _enrich_reviews_batch, _cache_reviews
            raw = _fetch_google_reviews(place_id)
            if raw:
                enriched = _enrich_reviews_batch(raw, place_id)
                _cache_reviews(place_id, enriched)
                reviews = enriched
            else:
                reviews = []
        else:
            reviews = get_reviews_for_restaurant(place_id)

        return {
            "place_id": place_id,
            "reviews": reviews,
            "count": len(reviews),
        }
    except Exception as e:
        logger.error("Error fetching reviews for %s: %s", place_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{place_id}/dish-sentiments")
async def get_dish_sentiments(place_id: str):
    """
    Get aggregated sentiment scores per dish mentioned in reviews.
    Useful for understanding which dishes are most praised.
    """
    try:
        sentiments = get_dish_sentiment_scores(place_id)
        return {
            "place_id": place_id,
            "dish_sentiments": sentiments,
            "dishes_found": len(sentiments),
        }
    except Exception as e:
        logger.error("Error getting dish sentiments for %s: %s", place_id, e)
        raise HTTPException(status_code=500, detail=str(e))
