from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.services.menu_data_service import MenuDataService
from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import HungerLevel, RecommendationContext
from app.services.smart_recommendation_algorithm import SmartRecommendationAlgorithm

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

        print(f"🤖 Generating smart recommendations for {restaurant_name}")
        print(f"👤 User has {len(user_favorite_dishes)} favorite dishes")

        hunger_raw = context_weights.get("hungerLevel")
        spice_raw = context_weights.get("spiceTolerance")

        context = RecommendationContext(
            hunger_level=_map_hunger_level(hunger_raw),
            craving_tags=context_weights.get("selectedCravings", []) or [],
            spice_preference=(spice_raw or 3) / 5.0,
            budget_min=None,
            budget_max=None,
            friend_selected_item_ids=[fs.get("id") for fs in friend_selections if fs.get("id")],
            restaurant_specific_signals={"name": restaurant_name},
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
            print(f"⚠️ No menu items found for {restaurant_name}")
            return {
                "restaurant": {
                    "place_id": restaurant_place_id,
                    "name": restaurant_name,
                },
                "recommendations": [],
                "total_count": 0,
                "message": f"No menu items available for {restaurant_name}. Try adding some menu items manually.",
            }

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
                "components": scored.components,
                "explanations": scored.explanations,
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
    except Exception as exc:  # pragma: no cover - debug logging
        import traceback

        print(f"❌ Smart recommendations error: {exc}")
        print(f"❌ Traceback: {traceback.format_exc()}")
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