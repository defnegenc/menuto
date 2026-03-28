"""
Behavioral tracking endpoints for recommendations.
Tracks user interactions (orders, views, ratings, favorites) to improve recommendations.
Uses Supabase client directly (no SQLAlchemy).
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from app.require_user import require_user
from supabase import create_client, Client
import logging
import json
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
sb: Client | None = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


def _get_supabase() -> Client:
    """Get Supabase client or raise if not configured."""
    if not sb:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return sb


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
):
    """
    Track when a user orders a dish (critical signal).
    Call this when user confirms they're ordering/ordered this dish.
    """
    user_id = user.get("sub")
    supabase = _get_supabase()

    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")

    row = {
        "user_id": user_id,
        "dish_id": dish_id_int,
        "restaurant_place_id": request.restaurant_place_id,
    }
    if request.hunger_level is not None:
        row["hunger_level"] = request.hunger_level
    if request.cravings is not None:
        row["cravings"] = json.dumps(request.cravings)

    try:
        supabase.table("dish_orders").insert(row).execute()
    except Exception as e:
        logger.error("Failed to track order: %s", e)
        raise HTTPException(status_code=500, detail="Failed to track order")

    logger.info("Tracked order: user=%s, dish=%s", user_id, request.dish_id)
    return {"status": "tracked", "type": "order"}


@router.post("/track/view")
async def track_dish_view(
    request: TrackViewRequest,
    user: dict = Depends(require_user),
):
    """
    Track when a user views a dish detail page.
    Call this when user opens dish details or spends time viewing.
    """
    user_id = user.get("sub")
    supabase = _get_supabase()

    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")

    row = {
        "user_id": user_id,
        "dish_id": dish_id_int,
        "restaurant_place_id": request.restaurant_place_id,
    }
    if request.view_duration_seconds is not None:
        row["view_duration_seconds"] = request.view_duration_seconds

    try:
        supabase.table("dish_views").insert(row).execute()
    except Exception as e:
        logger.error("Failed to track view: %s", e)
        raise HTTPException(status_code=500, detail="Failed to track view")

    return {"status": "tracked", "type": "view"}


@router.post("/track/rating")
async def track_dish_rating(
    request: TrackRatingRequest,
    user: dict = Depends(require_user),
):
    """
    Track user rating after eating.
    Call this in your PostMealFeedback screen.
    """
    if not 1 <= request.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    user_id = user.get("sub")
    supabase = _get_supabase()

    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")

    row = {
        "user_id": user_id,
        "dish_id": dish_id_int,
        "restaurant_place_id": request.restaurant_place_id,
        "rating": request.rating,
    }
    if request.feedback_text is not None:
        row["feedback_text"] = request.feedback_text
    if request.would_order_again is not None:
        row["would_order_again"] = request.would_order_again
    if request.hunger_level_when_ordered is not None:
        row["hunger_level_when_ordered"] = request.hunger_level_when_ordered

    try:
        supabase.table("dish_ratings").insert(row).execute()
    except Exception as e:
        logger.error("Failed to track rating: %s", e)
        raise HTTPException(status_code=500, detail="Failed to track rating")

    logger.info("Tracked rating: user=%s, dish=%s, rating=%s", user_id, request.dish_id, request.rating)
    return {"status": "tracked", "type": "rating"}


@router.post("/track/favorite")
async def track_dish_favorite(
    request: TrackFavoriteRequest,
    user: dict = Depends(require_user),
):
    """
    Track when user adds/removes dish as favorite.
    Call this when user taps the heart/favorite icon.
    """
    user_id = user.get("sub")
    supabase = _get_supabase()

    if request.action not in ["add", "remove"]:
        raise HTTPException(status_code=400, detail="Action must be 'add' or 'remove'")

    try:
        dish_id_int = int(request.dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")

    if request.action == "add":
        # Check if already exists (active favorite)
        existing = supabase.table("dish_favorites") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("dish_id", dish_id_int) \
            .is_("removed_at", "null") \
            .execute()

        if not existing.data:
            row = {
                "user_id": user_id,
                "dish_id": dish_id_int,
                "restaurant_place_id": request.restaurant_place_id,
            }
            try:
                supabase.table("dish_favorites").insert(row).execute()
                logger.info("Added favorite: user=%s, dish=%s", user_id, request.dish_id)
            except Exception as e:
                logger.error("Failed to add favorite: %s", e)
                raise HTTPException(status_code=500, detail="Failed to add favorite")

        return {"status": "tracked", "action": "added"}

    elif request.action == "remove":
        # Mark as removed (soft delete)
        try:
            existing = supabase.table("dish_favorites") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("dish_id", dish_id_int) \
                .is_("removed_at", "null") \
                .execute()

            if existing.data:
                fav_id = existing.data[0]["id"]
                supabase.table("dish_favorites") \
                    .update({"removed_at": datetime.utcnow().isoformat()}) \
                    .eq("id", fav_id) \
                    .execute()
                logger.info("Removed favorite: user=%s, dish=%s", user_id, request.dish_id)
        except Exception as e:
            logger.error("Failed to remove favorite: %s", e)
            raise HTTPException(status_code=500, detail="Failed to remove favorite")

        return {"status": "tracked", "action": "removed"}


@router.get("/dish/{dish_id}/stats")
async def get_dish_stats(dish_id: str):
    """
    Get behavioral stats for a dish.
    Useful for showing popularity indicators in UI.
    """
    supabase = _get_supabase()

    try:
        dish_id_int = int(dish_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="dish_id must be a valid integer")

    try:
        # Order count
        orders = supabase.table("dish_orders") \
            .select("id", count="exact") \
            .eq("dish_id", dish_id_int) \
            .execute()
        order_count = orders.count if orders.count is not None else 0

        # View count
        views = supabase.table("dish_views") \
            .select("id", count="exact") \
            .eq("dish_id", dish_id_int) \
            .execute()
        view_count = views.count if views.count is not None else 0

        # Rating stats
        ratings = supabase.table("dish_ratings") \
            .select("rating") \
            .eq("dish_id", dish_id_int) \
            .execute()
        rating_values = [r["rating"] for r in (ratings.data or [])]
        rating_count = len(rating_values)
        avg_rating = sum(rating_values) / rating_count if rating_count > 0 else 0.0

        # Recent orders (last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        recent_orders = supabase.table("dish_orders") \
            .select("id", count="exact") \
            .eq("dish_id", dish_id_int) \
            .gte("ordered_at", thirty_days_ago) \
            .execute()
        recent_order_count = recent_orders.count if recent_orders.count is not None else 0

    except Exception as e:
        logger.error("Failed to get dish stats for %s: %s", dish_id, e)
        raise HTTPException(status_code=500, detail="Failed to get dish stats")

    return {
        "dish_id": dish_id,
        "order_count": order_count,
        "view_count": view_count,
        "avg_rating": round(avg_rating, 2),
        "rating_count": rating_count,
        "recent_order_count": recent_order_count,
        "is_trending": recent_order_count > order_count * 0.5 if order_count > 0 else False,
    }


@router.get("/restaurant/{restaurant_place_id}/popular-dishes")
async def get_popular_dishes(
    restaurant_place_id: str,
    limit: int = 10,
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
    supabase = _get_supabase()

    try:
        # Get menus for this restaurant
        menus_resp = supabase.table("parsed_menus") \
            .select("id") \
            .eq("place_id", restaurant_place_id) \
            .execute()

        if not menus_resp.data:
            return {
                "restaurant_place_id": restaurant_place_id,
                "popular_dishes": [],
                "total_dishes": 0,
            }

        menu_ids = [m["id"] for m in menus_resp.data]

        # Get all dishes for these menus
        dishes_resp = supabase.table("parsed_dishes") \
            .select("id, name, description, category, price") \
            .in_("menu_id", menu_ids) \
            .execute()

        dishes = dishes_resp.data or []
        if not dishes:
            return {
                "restaurant_place_id": restaurant_place_id,
                "popular_dishes": [],
                "total_dishes": 0,
            }

        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        dish_ids = [d["id"] for d in dishes]

        # Fetch all behavioral data for these dishes in bulk
        all_orders = supabase.table("dish_orders") \
            .select("dish_id, ordered_at") \
            .in_("dish_id", dish_ids) \
            .execute()
        all_views = supabase.table("dish_views") \
            .select("dish_id") \
            .in_("dish_id", dish_ids) \
            .execute()
        all_ratings = supabase.table("dish_ratings") \
            .select("dish_id, rating") \
            .in_("dish_id", dish_ids) \
            .execute()

        # Aggregate signals per dish
        from collections import defaultdict
        order_counts = defaultdict(int)
        recent_order_counts = defaultdict(int)
        view_counts = defaultdict(int)
        rating_sums = defaultdict(float)
        rating_counts = defaultdict(int)

        for o in (all_orders.data or []):
            did = o["dish_id"]
            order_counts[did] += 1
            if o.get("ordered_at") and o["ordered_at"] >= thirty_days_ago:
                recent_order_counts[did] += 1

        for v in (all_views.data or []):
            view_counts[v["dish_id"]] += 1

        for r in (all_ratings.data or []):
            did = r["dish_id"]
            rating_sums[did] += r["rating"]
            rating_counts[did] += 1

        # Score each dish
        popular_dishes = []
        for dish in dishes:
            did = dish["id"]
            oc = order_counts[did]
            vc = view_counts[did]
            rc = rating_counts[did]
            avg_r = rating_sums[did] / rc if rc > 0 else 0.0
            roc = recent_order_counts[did]
            recent_boost = min(roc / max(oc, 1), 1.0) * 0.3 if oc > 0 else 0.0

            # Popularity score (same formula as EnhancedRecommendationAlgorithm)
            order_score = min(oc / 10.0, 1.0) * 1.0
            rating_score = ((avg_r - 1.0) / 4.0) * 0.8 if rc >= 3 else 0.0
            view_score = min(vc / 50.0, 1.0) * 0.3
            trending_boost = recent_boost * 0.2
            popularity_score = min(order_score + rating_score + view_score + trending_boost, 1.0)

            if oc == 0 and vc == 0 and rc == 0:
                continue  # Skip dishes with no signals

            popular_dishes.append({
                "id": str(did),
                "name": dish["name"],
                "description": dish.get("description") or "",
                "category": dish.get("category") or "main",
                "price": float(dish["price"]) if dish.get("price") else None,
                "popularity_score": round(popularity_score, 3),
                "signals": {
                    "order_count": oc,
                    "view_count": vc,
                    "avg_rating": round(avg_r, 2) if avg_r > 0 else None,
                    "rating_count": rc,
                    "recent_order_boost": round(recent_boost, 3),
                },
            })

        # Sort by popularity score (highest first)
        popular_dishes.sort(key=lambda x: x["popularity_score"], reverse=True)
        popular_dishes = popular_dishes[:limit]

    except Exception as e:
        logger.error("Failed to get popular dishes for %s: %s", restaurant_place_id, e)
        raise HTTPException(status_code=500, detail="Failed to get popular dishes")

    return {
        "restaurant_place_id": restaurant_place_id,
        "popular_dishes": popular_dishes,
        "total_dishes": len(dishes),
        "returned_count": len(popular_dishes),
    }
