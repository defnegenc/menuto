from __future__ import annotations

"""
menuto-backend/app/services/menu_data_service.py

What this is:
- A thin "menu item source" used by smart recommendations.

Why we keep it:
- /smart-recommendations/generate uses MenuDataService to produce normalized menu items (ItemFeatures).
- Today it falls back to extracting popular dishes from reviews when no parsed menu is available.
"""

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import ItemFeatures

logger = logging.getLogger(__name__)

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
        parsed_items = self._get_parsed_menu_items(restaurant_place_id, restaurant_name)

        if not parsed_items or len(parsed_items) < 3:
            parsed_items = self._get_pseudo_menu_from_reviews(
                restaurant_place_id, restaurant_name
            )

        if not parsed_items:
            return []

        features: List[ItemFeatures] = []
        for parsed in parsed_items:
            try:
                feature = self._build_item_features(parsed, restaurant_name)
                features.append(feature)
            except Exception as e:
                logger.error("Error building features for item %s: %s", parsed.name if parsed else "unknown", e)
                continue

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
        if not supabase:
            logger.warning("Supabase client not initialized in MenuDataService")
            return []

        menu = None

        try:
            # 1) Try to find menu by place_id (preferred)
            menus_response = supabase.table("parsed_menus") \
                .select("*") \
                .eq("place_id", restaurant_place_id) \
                .order("parsed_at", desc=True) \
                .limit(1) \
                .execute()

            if menus_response.data and len(menus_response.data) > 0:
                menu = menus_response.data[0]
                logger.info("Menu found by place_id for %s (menu_id=%s)", restaurant_name, menu.get("id"))
            else:
                # 2) Fallback: legacy rows where place_id was stored in restaurant_url
                menus_response = supabase.table("parsed_menus") \
                    .select("*") \
                    .eq("restaurant_url", restaurant_place_id) \
                    .order("parsed_at", desc=True) \
                    .limit(1) \
                    .execute()

                if menus_response.data and len(menus_response.data) > 0:
                    menu = menus_response.data[0]
                    logger.info("Menu found by restaurant_url for %s (menu_id=%s)", restaurant_name, menu.get("id"))
                else:
                    # 3) Fallback by name (ilike)
                    menus_response = supabase.table("parsed_menus") \
                        .select("*") \
                        .ilike("restaurant_name", f"%{restaurant_name}%") \
                        .order("parsed_at", desc=True) \
                        .limit(1) \
                        .execute()

                    if menus_response.data and len(menus_response.data) > 0:
                        menu = menus_response.data[0]
                        logger.info("Menu found by name for %s (menu_id=%s)", restaurant_name, menu.get("id"))
        except Exception as e:
            logger.error("Error fetching menu for %s: %s", restaurant_name, e)
            return []

        if not menu:
            logger.warning("No menu found for %s (%s) after all attempts", restaurant_name, restaurant_place_id)
            return []

        # Fetch dishes for this menu
        menu_id = menu.get("id")
        if not menu_id:
            logger.error("Menu found but has no ID for %s", restaurant_name)
            return []

        try:
            dishes_response = supabase.table("parsed_dishes") \
                .select("*") \
                .eq("menu_id", menu_id) \
                .execute()

            dishes = dishes_response.data if dishes_response.data else []
            logger.info("Found %d dishes for menu_id=%s (%s)", len(dishes), menu_id, restaurant_name)
        except Exception as e:
            logger.error("Error fetching dishes for menu_id=%s of %s: %s", menu_id, restaurant_name, e)
            return []

        if not dishes:
            logger.warning("No dishes found for menu_id=%s of %s", menu_id, restaurant_name)
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
                            "dietary_flags": dish.get("dietary_flags") or {},
                        },
                    )
                )
            except Exception as e:
                logger.error("Error converting dish to ParsedMenuItem: %s", e)
                continue

        logger.info("Returning %d parsed menu items for %s", len(parsed_items), restaurant_name)
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
