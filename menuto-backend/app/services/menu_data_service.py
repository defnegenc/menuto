from __future__ import annotations

"""
menuto-backend/app/services/menu_data_service.py

What this is:
- A thin “menu item source” used by smart recommendations.

Why we keep it:
- /smart-recommendations/generate uses MenuDataService to produce normalized menu items (ItemFeatures).
- Today it falls back to extracting popular dishes from reviews when no parsed menu is available.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import ItemFeatures


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
            features.append(self._build_item_features(parsed, restaurant_name))

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
        TODO: Replace with actual Supabase / database lookup once available.
        Currently returns an empty list so the system falls back to review extraction.
        """

        _ = (restaurant_place_id, restaurant_name)
        return []

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