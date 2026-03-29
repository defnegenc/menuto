from __future__ import annotations

import logging
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request

from app.services.menu_data_service import MenuDataService
from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import HungerLevel, RecommendationContext
from app.services.review_ingestion import get_dish_sentiment_scores, get_review_based_popularity
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
        preference_level = context_weights.get("preferenceLevel")  # 1=adventurous, 5=fan favorites

        # Time-aware hunger adjustment: if user didn't specify hunger level,
        # infer from time of day
        if hunger_raw is None:
            hour = datetime.now().hour
            if 6 <= hour < 11:      # breakfast
                hunger_raw = 2       # light
            elif 11 <= hour < 14:   # lunch
                hunger_raw = 3       # normal
            elif 14 <= hour < 17:   # afternoon
                hunger_raw = 2       # light (snack time)
            elif 17 <= hour < 21:   # dinner
                hunger_raw = 4       # hungry
            else:                    # late night
                hunger_raw = 2       # light

        # Determine meal period for context signals
        hour = datetime.now().hour
        meal_period = (
            "breakfast" if 6 <= hour < 11
            else "lunch" if 11 <= hour < 14
            else "afternoon" if 14 <= hour < 17
            else "dinner" if 17 <= hour < 21
            else "late_night"
        )

        # Create Supabase client once for all user-data fetches
        from supabase import create_client
        sb_url = os.getenv("SUPABASE_URL")
        sb_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        sb = None
        if sb_url and sb_key:
            try:
                sb = create_client(sb_url, sb_key)
            except Exception as e:
                logger.warning("Failed to create Supabase client: %s", e)

        # Fetch user's past dish ratings to feed into the algorithm
        user_ratings_map: dict[str, float] = {}
        user_id = data.get("user_id")
        if user_id and sb:
            try:
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
                        "Loaded %d cross-restaurant dish ratings for user %s (all restaurants)",
                        len(user_ratings_map), user_id,
                    )
            except Exception as e:
                logger.warning("Failed to fetch user ratings: %s", e)

        # Fetch behavioral signals (views, orders, favorites)
        behavioral_signals: dict[str, dict] = {}
        if user_id and sb:
            try:
                # Fetch orders with dish names
                orders_result = sb.table("dish_orders").select(
                    "dish_id, parsed_dishes(name)"
                ).eq("user_id", user_id).execute()

                for r in (orders_result.data or []):
                    dish = r.get("parsed_dishes")
                    if dish and dish.get("name"):
                        name = dish["name"]
                        behavioral_signals.setdefault(name, {"views": 0, "orders": 0, "favorited": False})
                        behavioral_signals[name]["orders"] += 1

                # Fetch views with dish names
                views_result = sb.table("dish_views").select(
                    "dish_id, parsed_dishes(name)"
                ).eq("user_id", user_id).execute()

                for r in (views_result.data or []):
                    dish = r.get("parsed_dishes")
                    if dish and dish.get("name"):
                        name = dish["name"]
                        behavioral_signals.setdefault(name, {"views": 0, "orders": 0, "favorited": False})
                        behavioral_signals[name]["views"] += 1

                # Fetch favorites with dish names
                favs_result = sb.table("dish_favorites").select(
                    "dish_id, parsed_dishes(name)"
                ).eq("user_id", user_id).is_("removed_at", "null").execute()

                for r in (favs_result.data or []):
                    dish = r.get("parsed_dishes")
                    if dish and dish.get("name"):
                        name = dish["name"]
                        behavioral_signals.setdefault(name, {"views": 0, "orders": 0, "favorited": False})
                        behavioral_signals[name]["favorited"] = True

                if behavioral_signals:
                    logger.info("Loaded behavioral signals for %d dishes", len(behavioral_signals))
            except Exception as e:
                logger.warning("Failed to fetch behavioral signals: %s", e)

        # Fetch dish popularity from two sources:
        # 1. Cross-user order counts from Menuto app (dish_orders table)
        # 2. Review mention frequency from Google (free — already cached)
        dish_popularity: dict[str, float] = {}
        try:
            # Source 1: Menuto user orders
            if sb:
                pop_result = sb.table("dish_orders").select(
                    "dish_id, parsed_dishes(name)"
                ).eq("restaurant_place_id", restaurant_place_id).execute()

                dish_order_counts: dict[str, int] = {}
                for r in (pop_result.data or []):
                    dish = r.get("parsed_dishes")
                    if dish and dish.get("name"):
                        name = dish["name"]
                        dish_order_counts[name] = dish_order_counts.get(name, 0) + 1

                if dish_order_counts:
                    max_orders = max(dish_order_counts.values())
                    dish_popularity = {
                        name: count / max_orders
                        for name, count in dish_order_counts.items()
                    }

            # Source 2: Google review mention frequency (free, no extra API calls)
            review_popularity = get_review_based_popularity(restaurant_place_id)
            if review_popularity:
                # Merge: if we have order data, blend 60/40 (orders are stronger signal).
                # If no order data, review mentions are the sole popularity signal.
                if dish_popularity:
                    for name, review_score in review_popularity.items():
                        if name in dish_popularity:
                            dish_popularity[name] = 0.6 * dish_popularity[name] + 0.4 * review_score
                        else:
                            dish_popularity[name] = review_score * 0.8  # slightly discount review-only
                else:
                    dish_popularity = review_popularity

            if dish_popularity:
                logger.info(
                    "Popularity data: %d dishes (%d from orders, %d from reviews) at %s",
                    len(dish_popularity),
                    len(dish_order_counts) if sb else 0,
                    len(review_popularity),
                    restaurant_name,
                )
        except Exception as e:
            logger.warning("Failed to fetch dish popularity: %s", e)

        # Extract taste signals from past feedback (Gemini-analyzed)
        feedback_liked: list[str] = []
        feedback_disliked: list[str] = []
        if user_id and sb:
            try:
                signals_result = sb.table("dish_ratings").select(
                    "taste_signals"
                ).eq("user_id", user_id).not_.is_("taste_signals", "null").execute()

                for r in (signals_result.data or []):
                    signals = r.get("taste_signals")
                    if isinstance(signals, str):
                        import json as _json
                        try:
                            signals = _json.loads(signals)
                        except Exception:
                            continue
                    if not isinstance(signals, dict):
                        continue
                    feedback_liked.extend(signals.get("liked", []))
                    feedback_liked.extend(signals.get("flavor_keywords", []))
                    feedback_disliked.extend(signals.get("disliked", []))

                # Deduplicate
                feedback_liked = list(set(feedback_liked))
                feedback_disliked = list(set(feedback_disliked))

                if feedback_liked or feedback_disliked:
                    logger.info(
                        "Loaded feedback signals: %d liked, %d disliked keywords",
                        len(feedback_liked), len(feedback_disliked),
                    )
            except Exception as e:
                logger.warning("Failed to fetch feedback signals: %s", e)

        dining_occasion = context_weights.get("diningOccasion")
        party_size = context_weights.get("partySize", 1)

        context = RecommendationContext(
            hunger_level=_map_hunger_level(hunger_raw),
            craving_tags=context_weights.get("selectedCravings", []) or [],
            spice_preference=(spice_raw or 3) / 5.0,
            friend_selected_item_ids=[fs.get("id") for fs in friend_selections if fs.get("id")],
            restaurant_specific_signals={
                "name": restaurant_name,
                "meal_period": meal_period,
                "preference_level": preference_level,
            },
            user_dish_ratings=user_ratings_map,
            user_behavioral_signals=behavioral_signals,
            dish_popularity=dish_popularity,
            user_id=user_id,
            dining_occasion=dining_occasion,
            party_size=party_size,
            feedback_liked_keywords=feedback_liked,
            feedback_disliked_keywords=feedback_disliked,
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

        # Check menu freshness
        menu_stale = False
        age_days: int | None = None
        try:
            if sb:
                menu_meta = sb.table("parsed_menus").select("parsed_at").eq(
                    "place_id", restaurant_place_id
                ).order("parsed_at", desc=True).limit(1).maybe_single().execute()
                if menu_meta.data:
                    from datetime import timedelta, timezone
                    parsed_at = datetime.fromisoformat(
                        menu_meta.data["parsed_at"].replace("Z", "+00:00")
                    )
                    age_days = (datetime.now(timezone.utc) - parsed_at).days
                    if age_days > 90:
                        menu_stale = True
                        logger.info(
                            "Menu for %s is %d days old (stale)",
                            restaurant_name, age_days,
                        )
        except Exception as e:
            logger.warning("Menu freshness check failed: %s", e)

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

        # Cold-start detection: lean on crowd signals when user has no history
        is_cold_start = (
            not user_ratings_map
            and not behavioral_signals
            and not user_favorite_dishes
        )
        if is_cold_start:
            # Cold-start: lean on crowd signals, reduce personal taste (unreliable)
            algorithm.component_weights = {
                "personal_taste": 0.10,  # unreliable without data
                "sentiment": 0.25,       # what reviewers praise
                "craving": 0.15,         # still respect current craving
                "rating_history": 0.0,   # no history
                "spice": 0.10,
                "behavioral": 0.0,       # no signals
                "popularity": 0.25,      # what others order most
                "hunger": 0.10,          # time-aware
                "friend": 0.05,
                "restaurant": 0.0,
            }
            logger.info("Cold-start user — using popularity/sentiment-weighted scoring")

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
                "is_discovery": scored.is_discovery,
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
            "menu_stale": menu_stale,
            "menu_age_days": age_days if menu_stale else None,
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

@router.post("/feedback")
async def submit_recommendation_feedback(request: Request):
    """Submit feedback on a recommendation to train per-user weights."""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        dish_id = data.get("dish_id")
        outcome = data.get("outcome")  # "positive" or "negative"
        component_scores = data.get("component_scores", {})

        if not user_id or not outcome or not component_scores:
            raise HTTPException(
                status_code=400,
                detail="user_id, outcome, and component_scores required",
            )

        SmartRecommendationAlgorithm.update_weight_priors(user_id, component_scores, outcome)
        return {
            "status": "ok",
            "message": f"Updated weight priors for {len(component_scores)} components",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Feedback error: %s", e)
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
