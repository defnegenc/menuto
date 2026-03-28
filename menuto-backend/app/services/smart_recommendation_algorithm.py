from __future__ import annotations

"""
menuto-backend/app/services/smart_recommendation_algorithm.py

What this is:
- The scoring/ranking algorithm behind /smart-recommendations/generate.

Why we keep it:
- Imported by routers/smart_recommendations.py to score ItemFeatures into ranked dish recommendations.
"""

from typing import Any, Dict, List, Optional
import json
import logging
import os

from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_types import (
    HungerLevel,
    ItemFeatures,
    RecommendationContext,
    ScoredItem,
    UserTasteProfile,
)

logger = logging.getLogger(__name__)

if False:  # type-checking helper without runtime import cycles
    from app.services.menu_data_service import MenuDataService


class SmartRecommendationAlgorithm:
    """Two-stage recommendation orchestrator (candidate generation + ranking)."""

    def __init__(
        self,
        menu_data_service: Optional["MenuDataService"] = None,
        legacy_engine: Optional[RecommendationEngine] = None,
    ) -> None:
        self.menu_data_service = menu_data_service
        self.legacy_engine = legacy_engine or RecommendationEngine()
        # Hand-tuned weights (sum ~= 1.0). Replace with learned weights later.
        self.component_weights: Dict[str, float] = {
            "personal_taste": 0.30,
            "sentiment": 0.17,
            "craving": 0.10,
            "rating_history": 0.10,
            "spice": 0.10,
            "behavioral": 0.08,
            "hunger": 0.05,
            "friend": 0.05,
            "restaurant": 0.05,
        }

    # ------------------------------------------------------------------
    # Public entrypoints
    # ------------------------------------------------------------------

    def generate_recommendations_from_payload(
        self,
        menu_items: List[ItemFeatures],
        restaurant_place_id: str,
        restaurant_name: str,
        user_favorite_dishes: List[Dict[str, Any]],
        user_dietary_constraints: List[str],
        context: RecommendationContext,
        limit: int = 5,
    ) -> List[ScoredItem]:
        raw_profile = self.legacy_engine.analyze_user_taste_profile(user_favorite_dishes)
        taste_profile = UserTasteProfile.from_legacy(raw_profile)

        candidates = self.get_candidates_with_dietary_constraints(
            menu_items,
            taste_profile,
            context,
            user_dietary_constraints,
        )

        if not candidates:
            return self._fallback_to_legacy_engine_from_payload(
                restaurant_place_id,
                restaurant_name,
                user_favorite_dishes,
                user_dietary_constraints,
                limit,
            )

        scored = self.score_and_rank(candidates, taste_profile, context)

        # LLM reranker: send top candidates to Gemini for meal-aware reranking
        # Falls back to template-based explanations if LLM fails
        reranked = self._llm_rerank(scored[:15], taste_profile, context, limit)
        if reranked:
            # LLM provided reranked results — apply serendipity slot
            diversified = self.diversify(reranked, limit, taste_profile)
            return diversified[:limit]

        # Fallback: traditional diversify + template explanations
        diversified = self.diversify(scored, limit, taste_profile)
        enriched = self.add_explanations(diversified, taste_profile, context)
        return enriched[:limit]

    # ------------------------------------------------------------------
    # Candidate generation
    # ------------------------------------------------------------------

    def get_candidates_with_dietary_constraints(
        self,
        items: List[ItemFeatures],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
        user_dietary_constraints: List[str],
        max_candidates: int = 40,
    ) -> List[ItemFeatures]:
        base_candidates = self.get_candidates(items, taste_profile, context, max_candidates=9999)
        if not user_dietary_constraints:
            return base_candidates[:max_candidates]

        constraints = {c.lower() for c in user_dietary_constraints}

        def passes(item: ItemFeatures) -> bool:
            # Prefer LLM-generated dietary flags if available
            flags = item.raw_metadata.get("dietary_flags", {})
            if flags:
                if "vegetarian" in constraints and not flags.get("is_vegetarian", True):
                    return False
                if "vegan" in constraints and not flags.get("is_vegan", True):
                    return False
                if "gluten-free" in constraints and not flags.get("is_gluten_free", True):
                    return False
                if "nut-free" in constraints and flags.get("contains_nuts", False):
                    return False
                return True
            # Fallback to keyword matching (for menus parsed before dietary_flags existed)
            text = f"{item.name} {item.description}".lower()
            if "vegetarian" in constraints:
                if any(m in text for m in ["chicken", "beef", "pork", "lamb", "fish", "seafood"]):
                    return False
            if "vegan" in constraints:
                if any(
                    m in text
                    for m in ["cheese", "cream", "butter", "egg", "milk", "chicken", "beef", "pork", "fish", "seafood"]
                ):
                    return False
            return True

        filtered = [item for item in base_candidates if passes(item)]
        return filtered[:max_candidates]

    def get_candidates(
        self,
        items: List[ItemFeatures],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
        max_candidates: int = 40,
    ) -> List[ItemFeatures]:
        wants_sweet = any(
            tag.lower() in {"sweet", "dessert", "chocolate", "sugar"}
            or "sweet" in tag.lower()
            for tag in (context.craving_tags or [])
        )

        # Prefer to avoid dessert entirely unless the user asked for sweet.
        # If we don't have enough non-dessert items, we allow desserts back in as a fallback.
        non_dessert_items = [i for i in items if (i.course or "").lower() != "dessert"]
        dessert_items = [i for i in items if (i.course or "").lower() == "dessert"]
        source_items: List[ItemFeatures]
        if wants_sweet:
            source_items = items
        else:
            source_items = non_dessert_items if len(non_dessert_items) >= 5 else (non_dessert_items + dessert_items)

        scored: List[tuple[float, ItemFeatures]] = []
        for item in source_items:
            personal = self._personal_taste_seed(item, taste_profile)
            sentiment = item.sentiment_score or 0.65

            # Candidate seed score: prefer "on-theme" items early so ranking has better inputs.
            base = 0.6 * personal + 0.4 * sentiment

            # Avoid weird "dessert-first" recommendations unless the user explicitly wants sweet.
            course = (item.course or "").lower()
            if course == "dessert" and not wants_sweet:
                base -= 0.18

            # Drinks can dominate by sentiment; keep them from crowding out food unless requested.
            if course in {"drink", "beverage"} and not any(
                t.lower() in {"drink", "drinks", "cocktail", "cocktails"} for t in (context.craving_tags or [])
            ):
                base -= 0.10

            scored.append((base, item))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item for _, item in scored[:max_candidates]]

    # ------------------------------------------------------------------
    # Ranking
    # ------------------------------------------------------------------

    def score_and_rank(
        self,
        candidates: List[ItemFeatures],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
    ) -> List[ScoredItem]:
        ranked: List[ScoredItem] = []
        for item in candidates:
            components = self._compute_components(item, taste_profile, context)
            score = sum(
                components.get(name, 0.0) * weight
                for name, weight in self.component_weights.items()
            )
            ranked.append(
                ScoredItem(
                    item=item,
                    components={k: round(v, 3) for k, v in components.items()},
                    score=round(score, 3),
                )
            )

        ranked.sort(key=lambda rec: rec.score, reverse=True)
        return ranked

    def diversify(
        self,
        scored_items: List[ScoredItem],
        limit: int,
        taste_profile: Optional[UserTasteProfile] = None,
    ) -> List[ScoredItem]:
        """Diversify results with a serendipity slot.

        Reserves 1 slot (the last) for a "discovery pick" — a dish from a
        cuisine or dish-type the user has never tried, as long as it meets a
        minimum quality threshold.  This is epsilon-greedy exploration (ε=1/limit)
        constrained to items that still score well.
        (Ref: SERAL, Feb 2025 — serendipity improves engagement.)
        """
        # --- Identify user's familiar cuisines/dish-types ---
        familiar_cuisines: set[str] = set()
        familiar_types: set[str] = set()
        if taste_profile:
            familiar_cuisines = {c.lower() for c in taste_profile.cuisine_preferences}
            familiar_types = {d.lower() for d in taste_profile.dish_types}

        def _is_novel(item: ItemFeatures) -> bool:
            """True if the item's cuisine and dish-type are outside the user's history."""
            cuisine = (item.cuisine or "").lower()
            course = (item.course or "").lower()
            desc_lower = item.description.lower()
            # Novel if cuisine doesn't overlap AND no dish-type keyword matches
            cuisine_novel = not cuisine or cuisine not in familiar_cuisines
            type_novel = not any(dt in desc_lower or dt in item.name.lower() for dt in familiar_types)
            return cuisine_novel and type_novel

        # --- Standard diversification (course+protein buckets) for limit-1 slots ---
        main_limit = max(limit - 1, 1)
        bucket_counts: Dict[tuple[str, str], int] = {}
        diversified: List[ScoredItem] = []

        for scored in scored_items:
            key = ((scored.item.course or "unknown"), (scored.item.protein or "none"))
            if bucket_counts.get(key, 0) >= 2:
                continue
            diversified.append(scored)
            bucket_counts[key] = bucket_counts.get(key, 0) + 1
            if len(diversified) >= main_limit:
                break

        # Backfill main slots if needed
        if len(diversified) < main_limit:
            for scored in scored_items:
                if scored in diversified:
                    continue
                diversified.append(scored)
                if len(diversified) >= main_limit:
                    break

        # --- Serendipity slot: best novel item above quality floor ---
        if limit >= 3 and taste_profile and familiar_cuisines:
            min_score = 0.35  # quality floor — must still be a decent dish
            already_ids = {s.item.item_id for s in diversified}
            best_novel: ScoredItem | None = None

            for scored in scored_items:
                if scored.item.item_id in already_ids:
                    continue
                if scored.score < min_score:
                    continue
                if _is_novel(scored.item):
                    best_novel = scored
                    break  # scored_items is sorted, so first match is best

            if best_novel:
                discovery = ScoredItem(
                    item=best_novel.item,
                    components=best_novel.components,
                    score=best_novel.score,
                    explanations=best_novel.explanations,
                    reasoning=best_novel.reasoning,
                    is_discovery=True,
                )
                diversified.append(discovery)
                logger.info(
                    "Serendipity pick: '%s' (score=%.3f, cuisine=%s)",
                    discovery.item.name, discovery.score, discovery.item.cuisine,
                )

        # If no discovery pick found (or limit < 3), fill remaining slots normally
        if len(diversified) < limit:
            already_ids = {s.item.item_id for s in diversified}
            for scored in scored_items:
                if scored.item.item_id in already_ids:
                    continue
                diversified.append(scored)
                if len(diversified) >= limit:
                    break

        return diversified[:limit]

    def add_explanations(
        self,
        scored_items: List[ScoredItem],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
    ) -> List[ScoredItem]:
        debug_enabled = logger.isEnabledFor(logging.DEBUG)
        explained: List[ScoredItem] = []
        for scored in scored_items:
            reasoning = ""
            if debug_enabled:
                # Build detailed reasoning only when DEBUG logging is active
                reasoning_parts = []
                components = scored.components
                reasoning_parts.append(
                    f"Component scores: personal_taste={components.get('personal_taste', 0):.2f}, "
                    f"sentiment={components.get('sentiment', 0):.2f}, "
                    f"craving={components.get('craving', 0):.2f}, "
                    f"hunger={components.get('hunger', 0):.2f}, "
                    f"spice={components.get('spice', 0):.2f}, "
                    f"friend={components.get('friend', 0):.2f}, "
                    f"restaurant={components.get('restaurant', 0):.2f}, "
                    f"rating_history={components.get('rating_history', 0):.2f}, "
                    f"behavioral={components.get('behavioral', 0):.2f}"
                )
                hunger_score = components.get("hunger", 0)
                course = (scored.item.course or "main").lower()
                if context.hunger_level == HungerLevel.LIGHT:
                    reasoning_parts.append(f"Hunger=LIGHT: course '{course}' scored {hunger_score:.2f}")
                elif context.hunger_level == HungerLevel.STARVING:
                    reasoning_parts.append(f"Hunger=STARVING: course '{course}' scored {hunger_score:.2f}")
                else:
                    reasoning_parts.append(f"Hunger=NORMAL: course '{course}' scored {hunger_score:.2f}")
                if context.craving_tags:
                    craving_score = components.get("craving", 0)
                    item_text = f"{scored.item.name} {scored.item.description}".lower()
                    matched_cravings = [c for c in context.craving_tags if c.lower() in item_text]
                    reasoning_parts.append(f"Craving match: {context.craving_tags} -> matched: {matched_cravings}, score: {craving_score:.2f}")
                reasoning_parts.append(f"Final score: {scored.score:.3f}")
                reasoning = " | ".join(reasoning_parts)
                logger.debug("Reasoning for '%s': %s", scored.item.name, reasoning)

            bullets: List[str] = []
            components = scored.components
            
            # Priority order for explanations (diversity is key - avoid duplicates)
            # 1. Current mood/cravings (most relevant)
            craving_score = components.get("craving", 0)
            if craving_score >= 0.5 and context.craving_tags:
                craving_text = " and ".join(context.craving_tags)
                bullets.append(f"Perfect for your {craving_text} craving")
            
            # 2. Hunger level (context-specific)
            hunger_score = components.get("hunger", 0)
            if hunger_score >= 0.7:
                if context.hunger_level == HungerLevel.STARVING:
                    bullets.append("Great for when you're really hungry")
                elif context.hunger_level == HungerLevel.LIGHT:
                    bullets.append("Perfect lighter option")
            
            # 3. Sentiment (popularity - different from preferences)
            if components.get("sentiment", 0) >= 0.7:
                bullets.append("Highly praised by other diners")
            
            # 4. Personal taste (only if we can be specific, otherwise skip to avoid generic "preferences")
            personal_taste_score = components.get("personal_taste", 0)
            if personal_taste_score >= 0.6:
                item_text = f"{scored.item.name} {scored.item.description}".lower()
                matched_prefs = []
                
                # Check cuisine preferences
                for cuisine in taste_profile.cuisine_preferences:
                    if cuisine.lower() in item_text:
                        matched_prefs.append(f"your love for {cuisine} cuisine")
                        break
                
                # Check dish types
                for dish_type in taste_profile.dish_types:
                    if dish_type.lower() in item_text:
                        matched_prefs.append(f"the {dish_type} dishes you enjoy")
                        break
                
                # Check flavor profile
                if taste_profile.flavor_profile:
                    flavor_lower = taste_profile.flavor_profile.lower()
                    if any(word in item_text for word in ["creamy", "cream"]) and "creamy" in flavor_lower:
                        matched_prefs.append("your preference for creamy dishes")
                    elif any(word in item_text for word in ["spicy", "hot"]) and "spicy" in flavor_lower:
                        matched_prefs.append("your preference for spicy flavors")
                
                # Only add if we found something specific (avoid generic "preferences")
                if matched_prefs:
                    bullets.append(f"Matches {matched_prefs[0]}")
            
            # 5. Spice alignment (only if we don't already have a preference match)
            if components.get("spice", 0) >= 0.5 and len(bullets) < 2:
                bullets.append("Matches your spice preference")
            
            # 6. Rating history
            rating_hist = components.get("rating_history", 0.5)
            if rating_hist >= 0.7:
                bullets.append("You've rated similar dishes highly")
            elif rating_hist <= 0.25 and len(bullets) < 2:
                bullets.append("Similar dishes didn't match your taste before")

            # 7. Behavioral signals
            behavioral_score = components.get("behavioral", 0.5)
            if behavioral_score >= 0.95:
                bullets.append("One of your saved favorites")
            elif behavioral_score >= 0.85:
                bullets.append("You've ordered this before and came back for more")
            elif behavioral_score >= 0.7:
                bullets.append("You've tried this before")

            # 8. Friend boost
            if components.get("friend", 0) >= 0.5:
                bullets.append("Friend-approved pick")
            
            # 9. Discovery pick
            if scored.is_discovery:
                bullets.insert(0, "Something new to try — outside your usual picks")

            # Default fallback (only if we have nothing)
            if not bullets:
                bullets.append("Great choice based on your preferences")

            explained.append(
                ScoredItem(
                    item=scored.item,
                    components=scored.components,
                    score=scored.score,
                    explanations=bullets[:3],
                    reasoning=reasoning,
                )
            )
        return explained

    # ------------------------------------------------------------------
    # LLM reranker (RecAI pattern: traditional scoring → LLM rerank)
    # ------------------------------------------------------------------

    def _llm_rerank(
        self,
        candidates: List[ScoredItem],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
        limit: int,
    ) -> List[ScoredItem] | None:
        """Use Gemini to rerank the top candidates considering meal composition.

        Returns reranked ScoredItems with LLM-generated explanations, or None
        if the LLM call fails (caller falls back to template explanations).

        Ref: Microsoft RecAI (ACM Web Conference 2024) — "LLM-as-brain,
        traditional-models-as-tools" pattern.
        """
        try:
            from google import genai

            api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
            if not api_key or not candidates:
                return None

            client = genai.Client(api_key=api_key)

            # Build candidate summaries for the prompt
            dish_lines = []
            for i, s in enumerate(candidates[:15]):
                dish_lines.append(
                    f"{i+1}. {s.item.name} — {s.item.description[:80]} "
                    f"(category: {s.item.course or 'unknown'}, score: {s.score:.2f})"
                )

            meal_period = context.restaurant_specific_signals.get("meal_period", "")
            cravings = ", ".join(context.craving_tags) if context.craving_tags else "none specified"
            hunger = context.hunger_level.value

            prompt = f"""You are a personal dining advisor. Given these scored menu candidates and the diner's profile, pick the best {limit} dishes that form a well-balanced meal.

DINER PROFILE:
- Favorite cuisines: {', '.join(taste_profile.cuisine_preferences) or 'varied'}
- Flavor preference: {taste_profile.flavor_profile or 'varied'}
- Current craving: {cravings}
- Hunger level: {hunger}
- Meal: {meal_period or 'not specified'}

CANDIDATES (pre-scored by algorithm):
{chr(10).join(dish_lines)}

Pick the best {limit} dishes considering:
1. Meal balance — variety of textures, weights, and flavors (not all heavy or all light)
2. Course variety — mix starters/mains/sides when possible, don't pick 3 of the same category
3. Honor the craving — at least one dish should match if a craving was specified
4. Respect the scores — prefer higher-scored dishes but override when meal balance demands it

Return JSON array of exactly {limit} objects:
[
  {{"rank": 1, "candidate_number": 3, "explanation": "One compelling sentence about why this dish is perfect for this diner right now"}},
  ...
]

Rules:
- candidate_number matches the numbered list above (1-indexed)
- explanation should be personal and specific, not generic
- Return ONLY the JSON array"""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    temperature=0.3,  # slightly creative for explanations
                    response_mime_type="application/json",
                ),
            )

            picks = json.loads(response.text)
            if not isinstance(picks, list) or len(picks) == 0:
                return None

            # Map LLM picks back to ScoredItems
            reranked: List[ScoredItem] = []
            for pick in picks[:limit]:
                idx = pick.get("candidate_number", 0) - 1  # 1-indexed → 0-indexed
                if 0 <= idx < len(candidates):
                    original = candidates[idx]
                    explanation = pick.get("explanation", "")
                    reranked.append(
                        ScoredItem(
                            item=original.item,
                            components=original.components,
                            score=original.score,
                            explanations=[explanation] if explanation else original.explanations,
                            reasoning=original.reasoning,
                            is_discovery=original.is_discovery,
                        )
                    )

            if len(reranked) >= max(limit - 1, 1):
                logger.info("LLM reranker selected %d dishes", len(reranked))
                return reranked

            return None  # not enough valid picks, fall back

        except Exception as e:
            logger.warning("LLM reranker failed, using template explanations: %s", e)
            return None

    # ------------------------------------------------------------------
    # Component helpers
    # ------------------------------------------------------------------

    def _compute_components(
        self,
        item: ItemFeatures,
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
    ) -> Dict[str, float]:
        return {
            "personal_taste": self._personal_taste_match(item, taste_profile),
            "sentiment": self._clamp(item.sentiment_score or 0.65),
            "craving": self._craving_match(item, context),
            "hunger": self._hunger_match(item, context),
            "spice": self._spice_alignment(item, taste_profile, context),
            "friend": self._friend_boost(item, context),
            "restaurant": self._restaurant_bonus(item, taste_profile),
            "rating_history": self._rating_history_match(item, context),
            "behavioral": self._behavioral_match(item, context),
        }

    def _personal_taste_seed(self, item: ItemFeatures, taste_profile: UserTasteProfile) -> float:
        legacy_profile = {
            "cuisine_preferences": taste_profile.cuisine_preferences,
            "flavor_profile": taste_profile.flavor_profile,
            "dish_types": taste_profile.dish_types,
            "dietary_patterns": taste_profile.dietary_patterns,
            "spice_tolerance": taste_profile.spice_tolerance_label,
        }
        dish_payload = {
            "name": item.name,
            "description": item.description,
            "popularity_score": item.raw_metadata.get("raw_popularity_score", 1),
        }
        return self._clamp(
            self.legacy_engine.calculate_dish_similarity(legacy_profile, dish_payload)
        )

    def _personal_taste_match(self, item: ItemFeatures, taste_profile: UserTasteProfile) -> float:
        score = self._personal_taste_seed(item, taste_profile)
        if item.cuisine and item.cuisine.lower() in [c.lower() for c in taste_profile.cuisine_preferences]:
            score += 0.1
        if any(tag.lower() in item.description.lower() for tag in taste_profile.dish_types):
            score += 0.1
        return self._clamp(score)

    def _craving_match(self, item: ItemFeatures, context: RecommendationContext) -> float:
        if not context.craving_tags:
            return 0.3
        text = f"{item.name} {item.description}".lower()
        matches = sum(1 for craving in context.craving_tags if craving.lower() in text)
        return self._clamp(matches / max(len(context.craving_tags), 1))

    def _hunger_match(self, item: ItemFeatures, context: RecommendationContext) -> float:
        course = (item.course or "main").lower()
        if context.hunger_level == HungerLevel.STARVING:
            return 0.8 if course in {"main", "entree", "entrée"} else 0.4
        if context.hunger_level == HungerLevel.LIGHT:
            # LIGHT should strongly favor smaller plates; dessert is OK but shouldn't be "the default."
            if course in {"starter", "side"}:
                return 0.8
            if course == "dessert":
                return 0.55
            return 0.4
        if context.hunger_level == HungerLevel.NORMAL:
            # Slightly downweight dessert for a normal meal.
            return 0.45 if course == "dessert" else 0.5
        return 0.5

    def _spice_alignment(
        self,
        item: ItemFeatures,
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
    ) -> float:
        preference = context.spice_preference or taste_profile.spice_tolerance
        if item.spice_level is None:
            return self._clamp(0.5 + (preference - 0.5) * 0.2)
        diff = abs(preference - item.spice_level)
        return self._clamp(1.0 - diff)

    def _friend_boost(self, item: ItemFeatures, context: RecommendationContext) -> float:
        if context.friend_selected_item_ids and item.item_id in context.friend_selected_item_ids:
            return 0.8
        return 0.0

    def _rating_history_match(self, item: ItemFeatures, context: RecommendationContext) -> float:
        """Score based on the user's past dish ratings (1-5 stars).

        Uses simple substring matching between the current item name and
        previously-rated dish names.  Returns 0.5 (neutral) when no match is
        found so the component neither helps nor hurts.
        """
        user_ratings = context.user_dish_ratings
        if not user_ratings:
            return 0.5

        item_name_lower = item.name.lower()
        best_rating: float | None = None

        for rated_name, rating in user_ratings.items():
            rated_lower = rated_name.lower()
            # Fuzzy-ish: either name contains the other
            if rated_lower in item_name_lower or item_name_lower in rated_lower:
                # If multiple matches, keep the one with the highest rating
                if best_rating is None or rating > best_rating:
                    best_rating = rating

        if best_rating is None:
            return 0.5

        # Map 1-5 star rating to a 0-1 score
        # 1 -> 0.0, 2 -> 0.2, 3 -> 0.5, 4 -> 0.8, 5 -> 1.0
        if best_rating >= 4:
            return self._clamp(0.6 + (best_rating - 4) * 0.2)  # 4->0.8, 5->1.0
        if best_rating <= 2:
            return self._clamp(best_rating * 0.1)  # 1->0.1, 2->0.2
        # 3 stars -> neutral-ish
        return 0.5

    def _behavioral_match(self, item: ItemFeatures, context: RecommendationContext) -> float:
        """Score based on the user's behavioral signals (views, orders, favorites).

        Key insight (Hu et al., Yahoo Research): viewing without ordering is an
        implicit *negative* signal — the user considered and rejected the item.
        Confidence in the negative grows with repeated views.
        """
        signals = context.user_behavioral_signals
        if not signals:
            return 0.5  # neutral — no data

        item_name_lower = item.name.lower()
        for dish_name, data in signals.items():
            if dish_name.lower() in item_name_lower or item_name_lower in dish_name.lower():
                views = data.get("views", 0)
                orders = data.get("orders", 0)
                favorited = data.get("favorited", False)

                # Explicit positive signals (ordered or saved)
                if favorited:
                    return 0.95
                if orders >= 2:
                    return 0.85  # repeat order — strong positive
                if orders == 1:
                    return 0.70  # tried once — positive

                # Implicit negative: viewed but never ordered = considered and rejected
                if views >= 3 and orders == 0:
                    return 0.30  # strong implicit negative
                if views >= 1 and orders == 0:
                    return 0.40  # mild implicit negative

        return 0.5  # no match — neutral

    def _restaurant_bonus(self, item: ItemFeatures, taste_profile: UserTasteProfile) -> float:
        rest_pattern = taste_profile.flavor_profile.lower()
        text = f"{item.name} {item.description}".lower()
        if rest_pattern and any(keyword in text for keyword in rest_pattern.split()):
            return 0.6
        return 0.4

    # ------------------------------------------------------------------
    # Fallback path
    # ------------------------------------------------------------------

    def _fallback_to_legacy_engine_from_payload(
        self,
        restaurant_place_id: str,
        restaurant_name: str,
        user_favorite_dishes: List[Dict[str, Any]],
        user_dietary_constraints: List[str],
        limit: int,
    ) -> List[ScoredItem]:
        legacy_results = self.legacy_engine.generate_recommendations(
            restaurant_place_id=restaurant_place_id,
            restaurant_name=restaurant_name,
            user_favorite_dishes=user_favorite_dishes,
            user_dietary_constraints=user_dietary_constraints,
        )

        scored: List[ScoredItem] = []
        for dish in legacy_results[:limit]:
            item = ItemFeatures(
                item_id=dish.get("id", "legacy"),
                name=dish.get("name", "Dish"),
                description=dish.get("description", ""),
                price=dish.get("price"),
                cuisine=None,
                spice_level=None,
                richness=None,
                textures=[],
                protein=None,
                is_shareable=False,
                course=dish.get("category"),
                sentiment_score=None,
                raw_metadata=dish,
            )
            components = {
                "personal_taste": dish.get("similarity_score", 0.5),
                "sentiment": 0.7,
                "craving": 0.4,
                "hunger": 0.4,
                "spice": 0.4,
                "friend": 0.0,
                "restaurant": 0.4,
                "behavioral": 0.5,
            }
            scored.append(
                ScoredItem(
                    item=item,
                    components=components,
                    score=round(components["personal_taste"], 3),
                    explanations=[dish.get("recommendation_reason", "Popular favorite")],
                )
            )
        return scored

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    @staticmethod
    def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
        return max(lo, min(hi, value))