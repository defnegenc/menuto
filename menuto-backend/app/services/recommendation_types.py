from __future__ import annotations

"""
menuto-backend/app/services/recommendation_types.py

What this is:
- Shared dataclasses/enums for recommendation and menu-item feature extraction.

Why we keep it:
- Used across /smart-recommendations and related services to keep types consistent.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class HungerLevel(str, Enum):
    LIGHT = "light"
    NORMAL = "normal"
    STARVING = "starving"


@dataclass
class RecommendationContext:
    hunger_level: HungerLevel = HungerLevel.NORMAL
    craving_tags: List[str] = field(default_factory=list)
    spice_preference: float = 0.5
    friend_selected_item_ids: List[str] = field(default_factory=list)
    restaurant_specific_signals: Dict[str, Any] = field(default_factory=dict)
    user_dish_ratings: Dict[str, float] = field(default_factory=dict)  # {dish_name: rating 1-5}
    user_behavioral_signals: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    # Maps dish_name -> {"views": 3, "orders": 1, "favorited": True}


@dataclass
class ItemFeatures:
    item_id: str
    name: str
    description: str
    price: Optional[float]
    cuisine: Optional[str]
    spice_level: Optional[float]
    richness: Optional[float]
    textures: List[str]
    protein: Optional[str]
    is_shareable: bool
    course: Optional[str]
    sentiment_score: Optional[float]
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UserTasteProfile:
    cuisine_preferences: List[str]
    flavor_profile: str
    dish_types: List[str]
    dietary_patterns: List[str]
    spice_tolerance_label: str
    spice_tolerance: float

    @classmethod
    def from_legacy(cls, raw: Dict[str, Any]) -> "UserTasteProfile":
        label = (raw.get("spice_tolerance") or "medium").lower()
        mapping = {"low": 0.2, "medium": 0.5, "high": 0.9}
        return cls(
            cuisine_preferences=raw.get("cuisine_preferences", []),
            flavor_profile=raw.get("flavor_profile", ""),
            dish_types=raw.get("dish_types", []),
            dietary_patterns=raw.get("dietary_patterns", []),
            spice_tolerance_label=label,
            spice_tolerance=mapping.get(label, 0.5),
        )


@dataclass
class ScoredItem:
    item: ItemFeatures
    components: Dict[str, float]
    score: float
    explanations: List[str] = field(default_factory=list)
    reasoning: str = ""  # Detailed reasoning for debugging

