from __future__ import annotations

"""
menuto-backend/app/services/smart_recommendation_algorithm.py

Agent-first recommendation engine. Instead of 10 rigid scoring components,
this enriches candidates with raw signals and lets a Gemini agent reason
about what to recommend and why.

Pipeline:
  Menu items → Dietary filter → Enrich with signals → Agent picks 5
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
    """Agent-first recommendation engine."""

    def __init__(
        self,
        menu_data_service: Optional["MenuDataService"] = None,
        legacy_engine: Optional[RecommendationEngine] = None,
    ) -> None:
        self.menu_data_service = menu_data_service
        self.legacy_engine = legacy_engine or RecommendationEngine()

    # ------------------------------------------------------------------
    # Public entrypoint
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
        # 1. Build taste profile (Gemini call)
        raw_profile = self.legacy_engine.analyze_user_taste_profile(user_favorite_dishes)
        taste_profile = UserTasteProfile.from_legacy(raw_profile)

        # Refresh with recently rated dishes
        rated_dish_names = [
            name for name, rating in context.user_dish_ratings.items() if rating >= 4
        ]
        if rated_dish_names:
            enriched = list(user_favorite_dishes)
            for name in rated_dish_names:
                if not any(d.get("dish_name", "").lower() == name.lower() for d in enriched):
                    enriched.append({"dish_name": name, "restaurant_id": "rated"})
            if len(enriched) > len(user_favorite_dishes):
                raw_profile = self.legacy_engine.analyze_user_taste_profile(enriched)
                taste_profile = UserTasteProfile.from_legacy(raw_profile)

        # 2. Dietary filter (safety — keep this rigid)
        candidates = self._filter_dietary(menu_items, user_dietary_constraints)
        if not candidates:
            return self._fallback(
                restaurant_place_id, restaurant_name,
                user_favorite_dishes, user_dietary_constraints, limit,
            )

        # 3. Compute taste similarity via embeddings (2 Gemini API calls)
        similarity_scores = self._compute_taste_embeddings(candidates, taste_profile)

        # 4. Enrich candidates with raw signals (no scoring, just data)
        enriched_candidates = self._enrich_with_signals(
            candidates, taste_profile, context, similarity_scores,
        )

        # 5. Agent picks the best dishes
        agent_picks = self._agent_select(
            enriched_candidates, taste_profile, context,
            restaurant_name, limit,
        )

        if agent_picks:
            return agent_picks

        # Fallback: simple sort by taste similarity + popularity
        return self._simple_fallback(enriched_candidates, limit)

    # ------------------------------------------------------------------
    # Step 2: Dietary filter
    # ------------------------------------------------------------------

    def _filter_dietary(
        self,
        items: List[ItemFeatures],
        constraints: List[str],
    ) -> List[ItemFeatures]:
        if not constraints:
            return items

        constraint_set = {c.lower() for c in constraints}

        _MEAT_KEYWORDS = [
            "chicken", "beef", "pork", "lamb", "fish", "seafood", "shrimp",
            "prawn", "duck", "veal", "rib", "steak", "salmon", "tuna",
            "lobster", "crab", "scallop", "yellowtail", "anchovy", "bacon",
            "sausage", "ham", "turkey", "venison", "rabbit", "octopus",
            "squid", "calamari", "mussels", "clam", "oyster",
        ]
        _DAIRY_KEYWORDS = [
            "cheese", "cream", "butter", "egg", "milk", "honey",
            "yogurt", "parmesan", "mozzarella", "ricotta", "burrata",
            "gelato", "whey",
        ]

        def passes(item: ItemFeatures) -> bool:
            # LLM-generated dietary flags (best)
            flags = item.raw_metadata.get("dietary_flags", {})
            if flags:
                if "vegetarian" in constraint_set and not flags.get("is_vegetarian", True):
                    return False
                if "vegan" in constraint_set and not flags.get("is_vegan", True):
                    return False
                if "gluten-free" in constraint_set and not flags.get("is_gluten_free", True):
                    return False
                if "nut-free" in constraint_set and flags.get("contains_nuts", False):
                    return False
                return True

            # Keyword fallback (for menus parsed before LLM tagging)
            text = f"{item.name} {item.description}".lower()
            if "vegetarian" in constraint_set:
                if any(m in text for m in _MEAT_KEYWORDS):
                    return False
            if "vegan" in constraint_set:
                if any(m in text for m in _MEAT_KEYWORDS + _DAIRY_KEYWORDS):
                    return False
            return True

        return [item for item in items if passes(item)]

    # ------------------------------------------------------------------
    # Step 3: Embedding similarity
    # ------------------------------------------------------------------

    def _compute_taste_embeddings(
        self,
        candidates: List[ItemFeatures],
        taste_profile: UserTasteProfile,
    ) -> Dict[str, float]:
        """2 API calls: 1 for taste profile, 1 batch for all dishes."""
        try:
            from google import genai

            api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
            if not api_key:
                return {}

            client = genai.Client(api_key=api_key)

            taste_text = (
                f"I love {', '.join(taste_profile.cuisine_preferences)} cuisine. "
                f"My flavor preference is {taste_profile.flavor_profile}. "
                f"I enjoy {', '.join(taste_profile.dish_types)}."
            )
            taste_result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=taste_text,
            )
            taste_vec = taste_result.embeddings[0].values

            dish_texts = [f"{item.name}: {item.description}" for item in candidates]
            dish_result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=dish_texts,
            )

            scores = {}
            for item, emb in zip(candidates, dish_result.embeddings):
                sim = self._cosine_sim(taste_vec, emb.values)
                scores[item.item_id] = round(max(0, (sim - 0.3) / 0.5), 3)  # normalize 0.3-0.8 → 0-1

            return scores

        except Exception as e:
            logger.warning("Embedding computation failed: %s", e)
            return {}

    @staticmethod
    def _cosine_sim(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(x * x for x in b) ** 0.5
        return dot / (na * nb) if na and nb else 0.0

    # ------------------------------------------------------------------
    # Step 4: Enrich candidates with raw signals
    # ------------------------------------------------------------------

    def _enrich_with_signals(
        self,
        candidates: List[ItemFeatures],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
        similarity_scores: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Attach raw signals to each candidate — no scoring, just data."""
        enriched = []
        for item in candidates:
            name_lower = item.name.lower()

            # Taste similarity (0-1 from embeddings)
            taste_sim = similarity_scores.get(item.item_id, 0.5)

            # Popularity
            pop = 0.0
            for dish_name, pop_score in context.dish_popularity.items():
                if dish_name.lower() in name_lower or name_lower in dish_name.lower():
                    pop = pop_score
                    break

            # Review sentiment
            sentiment = item.sentiment_score or 0.0

            # User's past rating of this/similar dish
            past_rating = None
            for rated_name, rating in context.user_dish_ratings.items():
                if rated_name.lower() in name_lower or name_lower in rated_name.lower():
                    past_rating = rating
                    break

            # Behavioral signals
            behavior = None
            for dish_name, data in context.user_behavioral_signals.items():
                if dish_name.lower() in name_lower or name_lower in dish_name.lower():
                    behavior = data
                    break

            # Craving match
            craving_match = any(
                c.lower() in f"{item.name} {item.description}".lower()
                for c in context.craving_tags
            ) if context.craving_tags else False

            # Feedback keywords match
            text_lower = f"{item.name} {item.description}".lower()
            liked_match = [k for k in context.feedback_liked_keywords if k.lower() in text_lower]
            disliked_match = [k for k in context.feedback_disliked_keywords if k.lower() in text_lower]

            enriched.append({
                "item": item,
                "taste_similarity": taste_sim,
                "popularity": pop,
                "review_sentiment": sentiment,
                "past_rating": past_rating,
                "behavior": behavior,  # {"views": N, "orders": N, "favorited": bool} or None
                "craving_match": craving_match,
                "liked_keywords_found": liked_match,
                "disliked_keywords_found": disliked_match,
                "course": item.course or "unknown",
                "cuisine": item.cuisine or "unknown",
            })

        return enriched

    # ------------------------------------------------------------------
    # Step 5: Agent selection
    # ------------------------------------------------------------------

    def _agent_select(
        self,
        enriched: List[Dict[str, Any]],
        taste_profile: UserTasteProfile,
        context: RecommendationContext,
        restaurant_name: str,
        limit: int,
    ) -> List[ScoredItem] | None:
        """The agent sees all raw signals and reasons about what to recommend."""
        try:
            from google import genai

            api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
            if not api_key or not enriched:
                return None

            client = genai.Client(api_key=api_key)

            # --- Build candidate descriptions with signals ---
            dish_lines = []
            for i, e in enumerate(enriched[:25]):  # cap at 25 for prompt size
                item: ItemFeatures = e["item"]
                signals = []

                if e["taste_similarity"] >= 0.6:
                    signals.append("MATCHES YOUR TASTE")
                if e["popularity"] >= 0.5:
                    signals.append(f"POPULAR ({int(e['popularity']*100)}%)")
                if e["review_sentiment"] >= 0.7:
                    signals.append("WELL-REVIEWED")
                if e["craving_match"]:
                    signals.append("MATCHES CRAVING")
                if e["past_rating"] is not None:
                    if e["past_rating"] >= 4:
                        signals.append(f"YOU LOVED THIS ({e['past_rating']}★)")
                    elif e["past_rating"] <= 2:
                        signals.append(f"YOU DIDN'T LIKE THIS ({e['past_rating']}★)")
                if e["behavior"]:
                    b = e["behavior"]
                    if b.get("favorited"):
                        signals.append("YOUR FAVORITE")
                    elif b.get("orders", 0) >= 2:
                        signals.append("REORDERED MULTIPLE TIMES")
                    elif b.get("orders", 0) == 1:
                        signals.append("TRIED BEFORE")
                    elif b.get("views", 0) >= 3 and b.get("orders", 0) == 0:
                        signals.append("LOOKED AT BUT NEVER ORDERED")
                    elif b.get("views", 0) >= 1 and b.get("orders", 0) == 0:
                        signals.append("BROWSED ONCE")
                if e["liked_keywords_found"]:
                    signals.append(f"HAS FLAVORS YOU LIKE: {', '.join(e['liked_keywords_found'][:3])}")
                if e["disliked_keywords_found"]:
                    signals.append(f"⚠️ HAS THINGS YOU DISLIKED: {', '.join(e['disliked_keywords_found'][:3])}")

                signal_str = f" [{', '.join(signals)}]" if signals else ""
                dish_lines.append(
                    f"{i+1}. {item.name} — {item.description[:100]} "
                    f"(course: {item.course or '?'}){signal_str}"
                )

            # --- Build user narrative ---
            meal_period = context.restaurant_specific_signals.get("meal_period", "")
            cravings = ", ".join(context.craving_tags) if context.craving_tags else "nothing specific"
            hunger = context.hunger_level.value
            preference_level = context.restaurant_specific_signals.get("preference_level")
            occasion = context.dining_occasion or "not specified"
            party = context.party_size

            if preference_level is not None:
                if preference_level <= 2:
                    adventure = "very adventurous — push new things"
                elif preference_level >= 4:
                    adventure = "playing it safe — stick to crowd favorites"
                else:
                    adventure = "balanced — mix of familiar and new"
            else:
                adventure = "not specified"

            # History
            loved = []
            tried = []
            disliked = []
            for name, data in context.user_behavioral_signals.items():
                if data.get("orders", 0) >= 1:
                    r = context.user_dish_ratings.get(name)
                    if r and r >= 4: loved.append(f"{name} ({r}★)")
                    elif r and r <= 2: disliked.append(f"{name} ({r}★)")
                    else: tried.append(name)

            popular = sorted(context.dish_popularity.items(), key=lambda x: -x[1])[:5]
            popular_text = ", ".join(f"{n} ({int(s*100)}%)" for n, s in popular) if popular else "no data"

            prompt = f"""You are a personal food advisor for someone dining at {restaurant_name}. Pick the best {limit} dishes for them.

WHO THEY ARE:
- Cuisines they love: {', '.join(taste_profile.cuisine_preferences) or 'still discovering'}
- Flavor profile: {taste_profile.flavor_profile or 'varied'}
- Usual orders: {', '.join(taste_profile.dish_types) or 'varied'}
- Spice: {taste_profile.spice_tolerance_label}
{f'- Flavors they love (from past feedback): {", ".join(context.feedback_liked_keywords[:5])}' if context.feedback_liked_keywords else ''}
{f'- Flavors they avoid (from past feedback): {", ".join(context.feedback_disliked_keywords[:5])}' if context.feedback_disliked_keywords else ''}

RIGHT NOW:
- Hunger: {hunger}
- Craving: {cravings}
- Adventure level: {adventure}
- Dining: {occasion} (party of {party})
- Meal: {meal_period or 'not specified'}
{f'- In their own words: "{context.restaurant_specific_signals.get("free_text_mood")}"' if context.restaurant_specific_signals.get("free_text_mood") else ''}

HISTORY AT THIS RESTAURANT:
- Loved: {', '.join(loved) if loved else 'first visit or no ratings'}
- Tried: {', '.join(tried) if tried else 'none'}
- Didn't enjoy: {', '.join(disliked) if disliked else 'none'}

WHAT'S POPULAR HERE:
{popular_text}

MENU (with signals — read these carefully):
{chr(10).join(dish_lines)}

YOUR JOB:
Pick exactly {limit} dishes that make a great meal for this person right now.

RULES:
1. MEAL STRUCTURE: Think about what they'll actually order as a meal. Typically: 1 starter or shared plate + 2-3 mains + maybe 1 side. DON'T mix a pasta main and a dessert as if they're the same course — dessert is separate. If you include dessert, make it clear it's "for after." DON'T recommend 3 pasta dishes.
2. SIGNALS: Items marked MATCHES YOUR TASTE, POPULAR, WELL-REVIEWED are strong picks. LOOKED AT BUT NEVER ORDERED = probably rejected. DIDN'T LIKE = avoid.
3. ADVENTURE: If adventurous, push new proteins/preparations/courses. If safe, lean on POPULAR + past favorites.
4. CRAVINGS: At least 1 dish should match their craving.
5. DISCOVERY: Include 1 dish outside their usual picks with strong signals. Something they'd never pick themselves but would love.
6. EXPLANATIONS — THIS IS CRITICAL: Each explanation must be specific to THIS person and THIS dish. Bad: "A great dish that matches your preferences." Good: "You mentioned you're craving something rich — this truffle pasta has that indulgent depth, and it's the most reordered dish here." Reference their specific craving, taste profile, history, or the signal flags. Talk to them like a friend who knows what they like.

Return JSON array:
[
  {{"rank": 1, "number": 3, "explanation": "Specific, personal reason referencing their context", "is_discovery": false, "course_role": "starter"}},
  ...
]

course_role = how this fits in the meal: "starter", "main", "side", "dessert_for_after", "shared_plate"
number = dish number from the list (1-indexed). Return ONLY the JSON array."""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    temperature=0.4,
                    response_mime_type="application/json",
                ),
            )

            picks = json.loads(response.text)
            if not isinstance(picks, list) or len(picks) == 0:
                return None

            results: List[ScoredItem] = []
            for pick in picks[:limit]:
                idx = pick.get("number", 0) - 1
                if 0 <= idx < len(enriched):
                    e = enriched[idx]
                    item = e["item"]
                    explanation = pick.get("explanation", "")
                    is_discovery = pick.get("is_discovery", False)
                    results.append(
                        ScoredItem(
                            item=item,
                            components={
                                "taste_similarity": e["taste_similarity"],
                                "popularity": e["popularity"],
                                "review_sentiment": e["review_sentiment"],
                            },
                            score=e["taste_similarity"],  # for display ordering
                            explanations=[explanation] if explanation else [],
                            reasoning="",
                            is_discovery=is_discovery,
                        )
                    )

            if len(results) >= max(limit - 1, 1):
                logger.info("Agent selected %d dishes for %s", len(results), restaurant_name)
                return results

            return None

        except Exception as e:
            logger.warning("Agent selection failed: %s", e)
            return None

    # ------------------------------------------------------------------
    # Fallback (no Gemini / agent fails)
    # ------------------------------------------------------------------

    def _simple_fallback(
        self,
        enriched: List[Dict[str, Any]],
        limit: int,
    ) -> List[ScoredItem]:
        """Sort by taste similarity + popularity. No LLM needed."""
        scored = []
        for e in enriched:
            simple_score = 0.5 * e["taste_similarity"] + 0.3 * e["popularity"] + 0.2 * (e["review_sentiment"] or 0)
            scored.append((simple_score, e))

        scored.sort(key=lambda x: -x[0])

        results = []
        for score, e in scored[:limit]:
            item = e["item"]
            results.append(
                ScoredItem(
                    item=item,
                    components={
                        "taste_similarity": e["taste_similarity"],
                        "popularity": e["popularity"],
                        "review_sentiment": e["review_sentiment"] or 0,
                    },
                    score=round(score, 3),
                    explanations=["Recommended based on your taste and popularity"],
                )
            )
        return results

    def _fallback(
        self,
        restaurant_place_id: str,
        restaurant_name: str,
        user_favorite_dishes: List[Dict[str, Any]],
        user_dietary_constraints: List[str],
        limit: int,
    ) -> List[ScoredItem]:
        """Legacy fallback when no candidates survive dietary filtering."""
        legacy_results = self.legacy_engine.generate_recommendations(
            restaurant_place_id=restaurant_place_id,
            restaurant_name=restaurant_name,
            user_favorite_dishes=user_favorite_dishes,
            user_dietary_constraints=user_dietary_constraints,
        )
        return [
            ScoredItem(
                item=ItemFeatures(
                    item_id=d.get("id", "legacy"), name=d.get("name", "Dish"),
                    description=d.get("description", ""), price=d.get("price"),
                    cuisine=None, spice_level=None, richness=None, textures=[],
                    protein=None, is_shareable=False, course=d.get("category"),
                    sentiment_score=None, raw_metadata=d,
                ),
                components={"taste_similarity": d.get("similarity_score", 0.5)},
                score=d.get("similarity_score", 0.5),
                explanations=[d.get("recommendation_reason", "Popular favorite")],
            )
            for d in legacy_results[:limit]
        ]

    # ------------------------------------------------------------------
    # Thompson Sampling (kept for feedback loop — lightweight)
    # ------------------------------------------------------------------

    @staticmethod
    def update_weight_priors(
        user_id: str,
        component_scores: Dict[str, float],
        outcome: str,
    ) -> None:
        """Update per-user Beta priors from feedback. Kept for future use
        when we want to learn which signals matter most per user."""
        try:
            from supabase import create_client

            sb_url = os.getenv("SUPABASE_URL")
            sb_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not sb_url or not sb_key:
                return
            sb = create_client(sb_url, sb_key)

            for component, score in component_scores.items():
                if score <= 0.3:
                    continue
                existing = (
                    sb.table("user_weight_priors")
                    .select("alpha, beta")
                    .eq("user_id", user_id)
                    .eq("component", component)
                    .maybe_single()
                    .execute()
                )
                alpha = existing.data["alpha"] if existing.data else 2.0
                beta_val = existing.data["beta"] if existing.data else 2.0

                if outcome == "positive":
                    alpha += score
                else:
                    beta_val += score * 0.5

                sb.table("user_weight_priors").upsert(
                    {
                        "user_id": user_id,
                        "component": component,
                        "alpha": alpha,
                        "beta": beta_val,
                        "updated_at": "now()",
                    },
                    on_conflict="user_id,component",
                ).execute()
        except Exception as e:
            logger.warning("Failed to update weight priors: %s", e)
