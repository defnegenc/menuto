from __future__ import annotations

import logging
import os
from fastapi import APIRouter, HTTPException, Request

from app.services.menu_data_service import MenuDataService
from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import HungerLevel, RecommendationContext
from app.services.review_ingestion import get_dish_sentiment_scores
from app.services.smart_recommendation_algorithm import SmartRecommendationAlgorithm

logger = logging.getLogger(__name__)

router = APIRouter()


def _map_hunger_level(raw: int | float | None) -> HungerLevel:
    if raw is None:
        return HungerLevel.NORMAL
    if raw <= 2:
        return HungerLevel.LIGHT
    if raw >= 4:
        return HungerLevel.STARVING
    return HungerLevel.NORMAL


@router.post("/generate")
async def generate_smart_recommendations(
    request: Request,
):
    try:
        data = await request.json()

        restaurant_place_id: str | None = data.get("restaurant_place_id")
        restaurant_name: str | None = data.get("restaurant_name")
        user_favorite_dishes = data.get("user_favorite_dishes", []) or []
        user_dietary_constraints = data.get("user_dietary_constraints", []) or []
        context_weights = data.get("context_weights", {}) or {}
        friend_selections = data.get("friend_selections", []) or []

        if not restaurant_place_id or not restaurant_name:
            raise HTTPException(
                status_code=400,
                detail="restaurant_place_id and restaurant_name are required",
            )

        hunger_raw = context_weights.get("hungerLevel")
        spice_raw = context_weights.get("spiceTolerance")

        # Fetch user's past dish ratings to feed into the algorithm
        user_ratings_map: dict[str, float] = {}
        user_id = data.get("user_id")
        if user_id:
            try:
                from supabase import create_client
                sb_url = os.getenv("SUPABASE_URL")
                sb_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                if sb_url and sb_key:
                    sb = create_client(sb_url, sb_key)
                    # Fetch user's ratings with dish names via foreign key join
                    result = sb.table("dish_ratings").select(
                        "rating, dish_id, parsed_dishes(name)"
                    ).eq("user_id", user_id).execute()
                    for r in (result.data or []):
                        dish_info = r.get("parsed_dishes")
                        if dish_info and dish_info.get("name"):
                            user_ratings_map[dish_info["name"]] = r["rating"]
                    if user_ratings_map:
                        logger.info(
                            "Loaded %d past dish ratings for user %s",
                            len(user_ratings_map), user_id,
                        )
            except Exception as e:
                logger.warning("Failed to fetch user ratings: %s", e)

        context = RecommendationContext(
            hunger_level=_map_hunger_level(hunger_raw),
            craving_tags=context_weights.get("selectedCravings", []) or [],
            spice_preference=(spice_raw or 3) / 5.0,
            budget_min=None,
            budget_max=None,
            friend_selected_item_ids=[fs.get("id") for fs in friend_selections if fs.get("id")],
            restaurant_specific_signals={"name": restaurant_name},
            user_dish_ratings=user_ratings_map,
        )

        legacy_engine = RecommendationEngine()
        menu_service = MenuDataService(recommendation_engine=legacy_engine)
        algorithm = SmartRecommendationAlgorithm(
            menu_data_service=menu_service,
            legacy_engine=legacy_engine,
        )

        menu_items = menu_service.get_menu_items_with_features(
            restaurant_place_id=restaurant_place_id,
            restaurant_name=restaurant_name,
        )

        if not menu_items:
            return {
                "restaurant": {
                    "place_id": restaurant_place_id,
                    "name": restaurant_name,
                },
                "recommendations": [],
                "total_count": 0,
                "message": f"No menu items available for {restaurant_name}. Try adding some menu items manually.",
            }

        # Enrich menu items with review-based sentiment scores
        try:
            dish_sentiments = get_dish_sentiment_scores(restaurant_place_id)
            if dish_sentiments:
                logger.info(
                    "Enriching %d menu items with %d dish sentiment scores from reviews",
                    len(menu_items), len(dish_sentiments),
                )
                for item in menu_items:
                    # Fuzzy match: check if any reviewed dish name appears in the item name
                    item_name_lower = item.name.lower()
                    for dish_name, score in dish_sentiments.items():
                        if dish_name.lower() in item_name_lower or item_name_lower in dish_name.lower():
                            # Override the default 0.65 sentiment with real review data
                            item.sentiment_score = score
                            break
        except Exception as e:
            logger.warning("Review enrichment failed, using defaults: %s", e)

        scored_recommendations = algorithm.generate_recommendations_from_payload(
            menu_items=menu_items,
            restaurant_place_id=restaurant_place_id,
            restaurant_name=restaurant_name,
            user_favorite_dishes=user_favorite_dishes,
            user_dietary_constraints=user_dietary_constraints,
            context=context,
        )

        recommendations_payload = [
            {
                "id": scored.item.item_id,
                "name": scored.item.name,
                "description": scored.item.description,
                "price": scored.item.price,
                "category": scored.item.course,
                "sentiment_score": scored.item.sentiment_score,
                "score": scored.score,
                "score_breakdown": scored.components,
                "explanations": scored.explanations,
                "recommendation_reason": " | ".join(scored.explanations) if scored.explanations else "Great choice based on your preferences",
                "reasoning": scored.reasoning,
            }
            for scored in scored_recommendations
        ]

        return {
            "restaurant": {
                "place_id": restaurant_place_id,
                "name": restaurant_name,
            },
            "recommendations": recommendations_payload,
            "total_count": len(recommendations_payload),
            "message": f"Found {len(recommendations_payload)} personalized recommendations based on real menu items",
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Smart recommendations error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Taste profile analysis error: %s", e, exc_info=True)
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recommendation explanation error: %s", e, exc_info=True)
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Taste profile building error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
