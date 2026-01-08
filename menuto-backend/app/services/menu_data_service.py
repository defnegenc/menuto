from __future__ import annotations

"""
menuto-backend/app/services/menu_data_service.py

What this is:
- A thin "menu item source" used by smart recommendations.

Why we keep it:
- /smart-recommendations/generate uses MenuDataService to produce normalized menu items (ItemFeatures).
- Today it falls back to extracting popular dishes from reviews when no parsed menu is available.
"""

import os
import time
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import ItemFeatures

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


@dataclass
class ParsedMenuItem:
    """Intermediate normalized representation of a menu item."""

    id: str
    name: str
    description: str
    price: Optional[float]
    category: Optional[str]
    sentiment_score: Optional[float]
    metadata: Dict[str, Any]


class MenuDataService:
    """
    Responsible for sourcing menu data for a restaurant. Priority order:

    1. Parsed menu items persisted in Supabase / database
    2. Fallback: synthesize dishes from Google reviews via RecommendationEngine
    """

    def __init__(self, recommendation_engine: RecommendationEngine) -> None:
        self.recommendation_engine = recommendation_engine

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------

    def get_menu_items_with_features(
        self,
        restaurant_place_id: str,
        restaurant_name: str,
    ) -> List[ItemFeatures]:
        import logging
        logger = logging.getLogger(__name__)
        
        # #region agent log
        log_path = '/Users/defnegenc/Desktop/menuto-clean/.cursor/debug.log'
        print(f"🔍 [DEBUG] get_menu_items_with_features ENTRY: {restaurant_name} ({restaurant_place_id})", flush=True)
        print(f"🔍 [DEBUG] Supabase initialized: {supabase is not None}", flush=True)
        print(f"🔍 [DEBUG] SUPABASE_URL set: {bool(SUPABASE_URL)}, SUPABASE_KEY set: {bool(SUPABASE_KEY)}", flush=True)
        try:
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            log_entry = {
                'timestamp': time.time(),
                'location': 'menu_data_service.py:get_menu_items_with_features:entry',
                'message': 'Entry: get_menu_items_with_features',
                'data': {
                    'restaurant_place_id': restaurant_place_id,
                    'restaurant_name': restaurant_name,
                    'supabase_initialized': supabase is not None
                },
                'hypothesisId': 'H1,H2'
            }
            with open(log_path, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            print(f"✅ [DEBUG] Log written successfully", flush=True)
        except Exception as e:
            print(f"❌ DEBUG LOG ERROR (entry): {e}", flush=True)
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}", flush=True)
        # #endregion
        
        parsed_items = self._get_parsed_menu_items(restaurant_place_id, restaurant_name)
        print(f"🔍 [DEBUG] After _get_parsed_menu_items: {len(parsed_items) if parsed_items else 0} items", flush=True)
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({
                    'timestamp': time.time(),
                    'location': 'menu_data_service.py:get_menu_items_with_features:after_parsed',
                    'message': 'After _get_parsed_menu_items',
                    'data': {
                        'parsed_items_count': len(parsed_items) if parsed_items else 0,
                        'parsed_items': [{'id': p.id, 'name': p.name} for p in parsed_items[:3]] if parsed_items else []
                    },
                    'hypothesisId': 'H2,H4'
                }) + '\n')
        except Exception as e:
            print(f"DEBUG LOG ERROR: {e}", flush=True)
        # #endregion

        if not parsed_items or len(parsed_items) < 3:
            parsed_items = self._get_pseudo_menu_from_reviews(
                restaurant_place_id, restaurant_name
            )
            
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:get_menu_items_with_features:after_reviews',
                        'message': 'After _get_pseudo_menu_from_reviews',
                        'data': {
                            'parsed_items_count': len(parsed_items) if parsed_items else 0
                        },
                        'hypothesisId': 'H2'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion

        if not parsed_items:
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:get_menu_items_with_features:empty',
                        'message': 'No parsed items found, returning empty',
                        'data': {},
                        'hypothesisId': 'H2,H4'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            return []

        features: List[ItemFeatures] = []
        for idx, parsed in enumerate(parsed_items):
            try:
                feature = self._build_item_features(parsed, restaurant_name)
                features.append(feature)
                # #region agent log
                if idx < 3:
                    try:
                        with open(log_path, 'a') as f:
                            f.write(json.dumps({
                                'timestamp': time.time(),
                                'location': 'menu_data_service.py:get_menu_items_with_features:feature_built',
                                'message': f'Feature built for item {idx}',
                                'data': {
                                    'item_id': feature.item_id,
                                    'item_name': feature.name,
                                    'success': True
                                },
                                'hypothesisId': 'H5'
                            }) + '\n')
                    except Exception as e:
                        print(f"DEBUG LOG ERROR: {e}", flush=True)
                        # #endregion
            except Exception as e:
                # #region agent log
                try:
                    with open(log_path, 'a') as f:
                        f.write(json.dumps({
                            'timestamp': time.time(),
                            'location': 'menu_data_service.py:get_menu_items_with_features:feature_error',
                            'message': f'Error building feature for item {idx}',
                            'data': {
                                'error': str(e),
                                'item_name': parsed.name if parsed else None
                            },
                            'hypothesisId': 'H5'
                        }) + '\n')
                except Exception as e:
                    print(f"DEBUG LOG ERROR: {e}", flush=True)
                    # #endregion
                logger.error(f"Error building features for item {parsed.name if parsed else 'unknown'}: {e}")
                continue
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({
                    'timestamp': time.time(),
                    'location': 'menu_data_service.py:get_menu_items_with_features:exit',
                    'message': 'Exit: get_menu_items_with_features',
                    'data': {
                        'features_count': len(features)
                    },
                    'hypothesisId': 'H1,H2,H4,H5'
                }) + '\n')
        except Exception as e:
            print(f"DEBUG LOG ERROR: {e}", flush=True)
        # #endregion
        
        return features

    # ---------------------------------------------------------------------
    # Source 1: Parsed menu from Supabase / DB
    # ---------------------------------------------------------------------

    def _get_parsed_menu_items(
        self,
        restaurant_place_id: str,
        restaurant_name: str,
    ) -> List[ParsedMenuItem]:
        """
        Fetch parsed menu items from Supabase.
        Uses the same strategy as menu_api: try place_id first, then fallback to name.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        print(f"=== MenuDataService._get_parsed_menu_items CALLED ===", flush=True)
        print(f"Restaurant: {restaurant_name}, Place ID: {restaurant_place_id}", flush=True)
        print(f"Supabase client is None: {supabase is None}", flush=True)
        
        if not supabase:
            logger.warning("Supabase client not initialized in MenuDataService")
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:supabase_none',
                        'message': 'Supabase client is None',
                        'data': {},
                        'hypothesisId': 'H1'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            return []

        menu = None
        
        try:
            # 1) Try to find menu by place_id (preferred)
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:before_query1',
                        'message': 'Before query 1: place_id',
                        'data': {
                            'place_id': restaurant_place_id
                        },
                        'hypothesisId': 'H2,H3'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR (before_query1): {e}", flush=True)
            # #endregion
            
            print(f"🔍 [DEBUG] About to query Supabase for place_id: {restaurant_place_id}", flush=True)
            menus_response = supabase.table("parsed_menus") \
                .select("*") \
                .eq("place_id", restaurant_place_id) \
                .order("parsed_at", desc=True) \
                .limit(1) \
                .execute()
            
            print(f"🔍 [DEBUG] Query executed - response type: {type(menus_response)}, has_data attr: {hasattr(menus_response, 'data')}", flush=True)
            print(f"🔍 [DEBUG] menus_response.data: {menus_response.data}", flush=True)
            print(f"🔍 [DEBUG] After query 1 - has_data: {menus_response.data is not None}, length: {len(menus_response.data) if menus_response.data else 0}", flush=True)
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:after_query1',
                        'message': 'After query 1: place_id',
                        'data': {
                            'has_data': menus_response.data is not None,
                            'data_length': len(menus_response.data) if menus_response.data else 0,
                            'menu_id': menus_response.data[0].get('id') if menus_response.data and len(menus_response.data) > 0 else None
                        },
                        'hypothesisId': 'H2'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            
            print(f"🔍 [DEBUG] Query 1 result - has_data: {menus_response.data is not None}, count: {len(menus_response.data) if menus_response.data else 0}", flush=True)
            if menus_response.data and len(menus_response.data) > 0:
                menu = menus_response.data[0]
                print(f"✅ [DEBUG] Menu found by place_id! Menu ID: {menu.get('id')}", flush=True)
                logger.info(f"✅ Menu found by place_id for {restaurant_name}. Menu ID: {menu.get('id')}")
            else:
                print(f"⚠️ [DEBUG] Query 1 returned empty, trying restaurant_url fallback", flush=True)
                # 2) Fallback: legacy rows where place_id was stored in restaurant_url
                logger.info(f"Menu not found by place_id, trying restaurant_url for {restaurant_name}")
                menus_response = supabase.table("parsed_menus") \
                    .select("*") \
                    .eq("restaurant_url", restaurant_place_id) \
                    .order("parsed_at", desc=True) \
                    .limit(1) \
                    .execute()
                
                if menus_response.data and len(menus_response.data) > 0:
                    menu = menus_response.data[0]
                    logger.info(f"✅ Menu found by restaurant_url for {restaurant_name}. Menu ID: {menu.get('id')}")
                else:
                    # 3) Fallback by name (ilike)
                    logger.info(f"Menu not found by restaurant_url, trying name match for {restaurant_name}")
                    menus_response = supabase.table("parsed_menus") \
                        .select("*") \
                        .ilike("restaurant_name", f"%{restaurant_name}%") \
                        .order("parsed_at", desc=True) \
                        .limit(1) \
                        .execute()
                    
                    if menus_response.data and len(menus_response.data) > 0:
                        menu = menus_response.data[0]
                        logger.info(f"✅ Menu found by name for {restaurant_name}. Menu ID: {menu.get('id')}")
        except Exception as e:
            logger.error(f"❌ Error fetching menu for {restaurant_name}: {e}")
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:exception',
                        'message': 'Exception in menu query',
                        'data': {
                            'error_type': type(e).__name__,
                            'error_message': str(e),
                            'error_repr': repr(e)
                        },
                        'hypothesisId': 'H3'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            return []

        print(f"🔍 [DEBUG] Menu search complete - menu found: {menu is not None}", flush=True)
        if not menu:
            logger.warning(f"⚠️ No menu found for {restaurant_name} ({restaurant_place_id}) after all attempts")
            print(f"❌ [DEBUG] FAILED to find menu for {restaurant_name} - all queries returned empty", flush=True)
            return []

        # Fetch dishes for this menu
        menu_id = menu.get("id")
        if not menu_id:
            logger.error(f"❌ Menu found but has no ID for {restaurant_name}")
            return []
            
        try:
            logger.info(f"🔍 Fetching dishes for menu_id={menu_id} (restaurant: {restaurant_name})")
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:before_dishes_query',
                        'message': 'Before dishes query',
                        'data': {
                            'menu_id': menu_id,
                            'menu_id_type': type(menu_id).__name__
                        },
                        'hypothesisId': 'H4'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            
            dishes_response = supabase.table("parsed_dishes") \
                .select("*") \
                .eq("menu_id", menu_id) \
                .execute()
            
            dishes = dishes_response.data if dishes_response.data else []
            
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:after_dishes_query',
                        'message': 'After dishes query',
                        'data': {
                            'has_data': dishes_response.data is not None,
                            'dishes_count': len(dishes),
                            'first_dish': {'id': dishes[0].get('id'), 'name': dishes[0].get('name')} if dishes and len(dishes) > 0 else None
                        },
                        'hypothesisId': 'H4'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            
            logger.info(f"✅ Found {len(dishes)} dishes for menu_id={menu_id}")
        except Exception as e:
            logger.error(f"❌ Error fetching dishes for menu_id={menu_id} of {restaurant_name}: {e}")
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'location': 'menu_data_service.py:_get_parsed_menu_items:dishes_exception',
                        'message': 'Exception in dishes query',
                        'data': {
                            'error_type': type(e).__name__,
                            'error_message': str(e),
                            'menu_id': menu_id
                        },
                        'hypothesisId': 'H3,H4'
                    }) + '\n')
            except Exception as e:
                print(f"DEBUG LOG ERROR: {e}", flush=True)
            # #endregion
            return []

        if not dishes:
            logger.warning(f"⚠️ No dishes found for menu_id={menu_id} of {restaurant_name}")
            return []

        # Convert Supabase dish format to ParsedMenuItem
        parsed_items: List[ParsedMenuItem] = []
        for dish in dishes:
            try:
                parsed_items.append(
                    ParsedMenuItem(
                        id=str(dish.get("id", "")),
                        name=dish.get("name", ""),
                        description=dish.get("description", "") or "",
                        price=self._normalize_price(dish.get("price")),
                        category=dish.get("category") or "main",
                        sentiment_score=None,  # Not stored in parsed_dishes table
                        metadata={
                            "source": "parsed_menu",
                            "menu_id": menu_id,
                            "ingredients": dish.get("ingredients") or [],
                            "dietary_tags": dish.get("dietary_tags") or [],
                        },
                    )
                )
            except Exception as e:
                logger.error(f"❌ Error converting dish to ParsedMenuItem: {e}")
                continue

        logger.info(f"✅ Returning {len(parsed_items)} parsed menu items for {restaurant_name}")
        return parsed_items

    # ---------------------------------------------------------------------
    # Source 2: Pseudo-menu from Google reviews
    # ---------------------------------------------------------------------

    def _get_pseudo_menu_from_reviews(
        self,
        restaurant_place_id: str,
        restaurant_name: str,
    ) -> List[ParsedMenuItem]:
        reviews = self.recommendation_engine.get_restaurant_reviews(
            restaurant_place_id, restaurant_name
        )
        popular_dishes = self.recommendation_engine.extract_popular_dishes_from_reviews(
            reviews, restaurant_name
        )

        parsed: List[ParsedMenuItem] = []
        for idx, dish in enumerate(popular_dishes):
            parsed.append(
                ParsedMenuItem(
                    id=f"reviews-{idx}",
                    name=dish.get("name", f"Dish {idx + 1}"),
                    description=dish.get("description", ""),
                    price=self._normalize_price(dish.get("price")),
                    category=dish.get("category", "main"),
                    sentiment_score=self._normalize_popularity_to_sentiment(
                        dish.get("popularity_score", 1)
                    ),
                    metadata={
                        "source": "google_reviews",
                        "raw_popularity_score": dish.get("popularity_score", 1),
                    },
                )
            )

        return parsed

    # ---------------------------------------------------------------------
    # Feature extraction helpers
    # ---------------------------------------------------------------------

    def _build_item_features(
        self,
        parsed: ParsedMenuItem,
        restaurant_name: str,
    ) -> ItemFeatures:
        cuisine = self._guess_cuisine(parsed, restaurant_name)
        protein = self._guess_protein(parsed)
        textures = self._guess_textures(parsed)
        spice_level = self._guess_spice(parsed)
        richness = self._guess_richness(parsed)
        is_shareable = self._guess_is_shareable(parsed)
        course = self._normalize_course(parsed.category)

        return ItemFeatures(
            item_id=parsed.id,
            name=parsed.name,
            description=parsed.description,
            price=parsed.price,
            cuisine=cuisine,
            spice_level=spice_level,
            richness=richness,
            textures=textures,
            protein=protein,
            is_shareable=is_shareable,
            course=course,
            sentiment_score=parsed.sentiment_score,
            raw_metadata=parsed.metadata,
        )

    def _normalize_price(self, price: Any) -> Optional[float]:
        if price is None:
            return None
        try:
            value = float(price)
        except (TypeError, ValueError):
            return None
        if value <= 0 or value > 500:
            return None
        return value

    def _normalize_popularity_to_sentiment(self, popularity_score: int) -> float:
        if popularity_score <= 1:
            return 0.6
        if popularity_score == 2:
            return 0.75
        if popularity_score >= 3:
            return 0.9
        return 0.7

    # ---------------------------------------------------------------------
    # Heuristic feature extraction
    # ---------------------------------------------------------------------

    def _normalize_course(self, category: Optional[str]) -> Optional[str]:
        if not category:
            return None
        c = category.lower()
        if any(k in c for k in ["starter", "app", "small", "mezze"]):
            return "starter"
        if any(k in c for k in ["main", "entrée", "large", "entree"]):
            return "main"
        if "dessert" in c or "sweet" in c:
            return "dessert"
        if "side" in c:
            return "side"
        if any(k in c for k in ["drink", "beverage", "cocktail"]):
            return "drink"
        return c

    def _guess_cuisine(self, item: ParsedMenuItem, restaurant_name: str) -> Optional[str]:
        txt = f"{item.name} {item.description} {restaurant_name}".lower()
        for tag in [
            "italian",
            "japanese",
            "thai",
            "mexican",
            "korean",
            "indian",
            "turkish",
            "chinese",
            "french",
            "spanish",
        ]:
            if tag in txt:
                return tag
        return None

    def _guess_protein(self, item: ParsedMenuItem) -> Optional[str]:
        txt = f"{item.name} {item.description}".lower()
        mapping = {
            "chicken": "chicken",
            "beef": "beef",
            "steak": "beef",
            "pork": "pork",
            "lamb": "lamb",
            "salmon": "salmon",
            "fish": "fish",
            "shrimp": "shrimp",
            "prawn": "shrimp",
            "tofu": "tofu",
            "tempeh": "tempeh",
        }
        for key, value in mapping.items():
            if key in txt:
                return value
        return None

    def _guess_textures(self, item: ParsedMenuItem) -> List[str]:
        txt = f"{item.name} {item.description}".lower()
        textures: List[str] = []
        if "crispy" in txt or "crunchy" in txt:
            textures.append("crispy")
        if any(k in txt for k in ["creamy", "sauce", "saucy", "velvety"]):
            textures.append("saucy")
        if "broth" in txt or "soup" in txt:
            textures.append("soupy")
        return textures

    def _guess_spice(self, item: ParsedMenuItem) -> Optional[float]:
        txt = f"{item.name} {item.description}".lower()
        if any(k in txt for k in ["extra spicy", "very spicy", "fiery"]):
            return 0.9
        if any(k in txt for k in ["spicy", "chili", "chilli", "jalapeño", "pepper"]):
            return 0.7
        return 0.2

    def _guess_richness(self, item: ParsedMenuItem) -> Optional[float]:
        txt = f"{item.name} {item.description}".lower()
        if any(k in txt for k in ["cream", "butter", "alfredo", "cheese", "cheesy"]):
            return 0.8
        if any(k in txt for k in ["fried", "tempura", "crispy"]):
            return 0.7
        if any(k in txt for k in ["salad", "steamed", "grilled", "fresh"]):
            return 0.3
        return 0.5

    def _guess_is_shareable(self, item: ParsedMenuItem) -> bool:
        txt = f"{item.name} {item.description}".lower()
        if any(
            k in txt
            for k in ["platter", "for two", "to share", "family style", "mezze", "meze", "shareable"]
        ):
            return True
        return False