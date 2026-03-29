"""
menuto-backend/app/services/review_ingestion.py

Review ingestion pipeline:
1. Check Supabase cache (reviews < 14 days old)
2. If stale/missing, fetch from Google Places API (5 reviews per restaurant, free tier)
3. Extract dish mentions + sentiment via Gemini
4. Cache everything in Supabase for reuse
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from google import genai
import httpx
from supabase import Client, create_client

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
CACHE_TTL_DAYS = 14

# Supabase client
_sb: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    _sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Gemini client
_gemini_client = None
gemini_key = os.getenv("GOOGLE_GEMINI_API_KEY")
if gemini_key:
    _gemini_client = genai.Client(api_key=gemini_key)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_reviews_for_restaurant(place_id: str) -> List[Dict[str, Any]]:
    """
    Get reviews for a restaurant. Uses Supabase cache if fresh,
    otherwise fetches from Google Places API and caches.

    Returns list of review dicts with: platform, rating, text, author,
    review_date, sentiment_score, dish_mentions.
    """
    cached = _get_cached_reviews(place_id)
    if cached is not None:
        logger.info("Cache hit for %s (%d reviews)", place_id, len(cached))
        return cached

    logger.info("Cache miss for %s, fetching from Google", place_id)
    raw_reviews = _fetch_google_reviews(place_id)
    if not raw_reviews:
        return []

    # Extract dish mentions + sentiment via LLM
    enriched = _enrich_reviews_batch(raw_reviews, place_id)

    # Cache in Supabase
    _cache_reviews(place_id, enriched)

    return enriched


def get_dish_sentiment_scores(place_id: str) -> Dict[str, float]:
    """
    Get aggregated sentiment scores per dish name mentioned in reviews.
    Returns {"Margherita Pizza": 0.85, "Caesar Salad": 0.62, ...}

    Scores are 0.0-1.0 (normalized from review ratings + sentiment).
    """
    reviews = get_reviews_for_restaurant(place_id)
    dish_scores: Dict[str, List[float]] = {}

    for review in reviews:
        mentions = review.get("dish_mentions", [])
        base_score = review.get("rating", 3.0) / 5.0  # normalize to 0-1
        sentiment = review.get("sentiment_score")
        if sentiment is not None:
            # Blend rating + sentiment (sentiment is -1 to 1, normalize to 0-1)
            score = 0.6 * base_score + 0.4 * ((sentiment + 1) / 2)
        else:
            score = base_score

        for dish_name in mentions:
            normalized = dish_name.strip().title()
            if normalized not in dish_scores:
                dish_scores[normalized] = []
            dish_scores[normalized].append(score)

    # Average scores per dish
    return {
        name: round(sum(scores) / len(scores), 3)
        for name, scores in dish_scores.items()
        if scores
    }


def get_review_based_popularity(place_id: str) -> Dict[str, float]:
    """Estimate dish popularity from review mention frequency.

    If 4 out of 5 reviews mention "Margherita Pizza", it's probably the
    most popular dish. Returns {dish_name: 0.0-1.0} where 1.0 = mentioned
    in every review.

    This is a FREE popularity signal — no extra API calls beyond the
    reviews we already fetch and cache.
    """
    reviews = get_reviews_for_restaurant(place_id)
    if not reviews:
        return {}

    mention_counts: Dict[str, int] = {}
    total_reviews = len(reviews)

    for review in reviews:
        # Count each dish only once per review (even if mentioned multiple times)
        seen_in_review: set[str] = set()
        for dish_name in review.get("dish_mentions", []):
            normalized = dish_name.strip().title()
            if normalized not in seen_in_review:
                seen_in_review.add(normalized)
                mention_counts[normalized] = mention_counts.get(normalized, 0) + 1

    if not mention_counts:
        return {}

    # Normalize: mentioned in N out of total_reviews → N/total_reviews
    return {
        name: round(count / total_reviews, 3)
        for name, count in mention_counts.items()
    }


def get_dish_attributes(place_id: str) -> Dict[str, List[str]]:
    """Get aggregated attributes per dish from reviews.

    Returns {"Margherita Pizza": ["thin crust", "fresh basil", ...]}
    """
    reviews = get_reviews_for_restaurant(place_id)
    attributes: Dict[str, List[str]] = {}
    for review in reviews:
        for dish_name, attrs in review.get("dish_attributes", {}).items():
            normalized = dish_name.strip().title()
            if normalized not in attributes:
                attributes[normalized] = []
            attributes[normalized].extend(attrs)
    # Deduplicate
    return {name: list(set(attrs)) for name, attrs in attributes.items()}


# ---------------------------------------------------------------------------
# Google Places API
# ---------------------------------------------------------------------------

def _fetch_google_reviews(place_id: str) -> List[Dict[str, Any]]:
    """Fetch up to 5 reviews from Google Places API (free Enterprise tier)."""
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_PLACES_API_KEY not set, skipping review fetch")
        return []

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "reviews,name,rating",
        "key": GOOGLE_API_KEY,
    }

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") != "OK":
            logger.error("Google Places API error: %s", data.get("status"))
            return []

        result = data.get("result", {})
        raw_reviews = result.get("reviews", [])
        logger.info("Fetched %d Google reviews for %s", len(raw_reviews), place_id)

        reviews = []
        for review in raw_reviews:
            reviews.append({
                "platform": "google",
                "author": review.get("author_name", "Anonymous"),
                "rating": float(review.get("rating", 0)),
                "text": review.get("text", ""),
                "review_date": review.get("time"),  # Unix timestamp
                "language": review.get("language", "en"),
            })

        return reviews

    except Exception as e:
        logger.error("Failed to fetch Google reviews for %s: %s", place_id, e)
        return []


# ---------------------------------------------------------------------------
# LLM Enrichment (Gemini)
# ---------------------------------------------------------------------------

def _enrich_reviews_batch(reviews: List[Dict], place_id: str) -> List[Dict]:
    """
    Use Gemini to extract dish mentions and sentiment from all reviews at once.
    Single LLM call for all reviews (cheaper than per-review calls).
    """
    if not _gemini_client or not reviews:
        # No LLM available — return reviews with empty dish_mentions
        for r in reviews:
            r["dish_mentions"] = []
            r["sentiment_score"] = None
            r["dish_attributes"] = {}
        return reviews

    # Build a single prompt with all review texts
    review_texts = []
    for i, r in enumerate(reviews):
        text = r.get("text", "").strip()
        if text:
            rating = r.get("rating", "?")
            review_texts.append(f"Review {i+1} ({rating}/5): {text}")

    if not review_texts:
        for r in reviews:
            r["dish_mentions"] = []
            r["sentiment_score"] = None
            r["dish_attributes"] = {}
        return reviews

    prompt = f"""Analyze these restaurant reviews. For each review, extract:
1. Any specific dish/food items mentioned by name
2. A sentiment score from -1.0 (very negative) to 1.0 (very positive)
3. For each dish mentioned, extract descriptive attributes (taste, texture, portion, preparation style)

{chr(10).join(review_texts)}

Return JSON array with one object per review, in order:
[
  {{"review_index": 1, "dish_mentions": ["Margherita Pizza", "Tiramisu"], "sentiment_score": 0.8, "dish_attributes": {{"Margherita Pizza": ["thin crust", "fresh basil", "perfectly charred"], "Tiramisu": ["creamy", "generous portion"]}}}},
  {{"review_index": 2, "dish_mentions": [], "sentiment_score": -0.3, "dish_attributes": {{}}}}
]

Rules:
- Only extract actual dish/food names, not generic terms like "food" or "appetizer"
- Include drinks if specifically named (e.g., "Espresso Martini")
- Use the dish name as written in the review, capitalized properly
- If no dishes mentioned, return empty array for dish_mentions and empty object for dish_attributes
- dish_attributes should contain short descriptive phrases from the review (e.g., "thin crust", "well seasoned", "generous portion")
- Return ONLY the JSON array, no other text"""

    try:
        response = _gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        enrichments = json.loads(response.text)
        logger.info("LLM extracted dish mentions for %s: %d reviews processed", place_id, len(enrichments))

        # Map enrichments back to reviews
        enrichment_map = {e["review_index"]: e for e in enrichments}
        for i, review in enumerate(reviews):
            e = enrichment_map.get(i + 1, {})
            review["dish_mentions"] = e.get("dish_mentions", [])
            review["sentiment_score"] = e.get("sentiment_score")
            review["dish_attributes"] = e.get("dish_attributes", {})

    except Exception as e:
        logger.error("LLM enrichment failed for %s: %s", place_id, e)
        for r in reviews:
            r["dish_mentions"] = []
            r["sentiment_score"] = None
            r["dish_attributes"] = {}

    return reviews


# ---------------------------------------------------------------------------
# Supabase Cache
# ---------------------------------------------------------------------------

def _get_cached_reviews(place_id: str) -> Optional[List[Dict]]:
    """Check Supabase for cached reviews within TTL."""
    if not _sb:
        return None

    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=CACHE_TTL_DAYS)).isoformat()
        result = (
            _sb.table("review_cache")
            .select("reviews, fetched_at")
            .eq("place_id", place_id)
            .gte("fetched_at", cutoff)
            .maybe_single()
            .execute()
        )
        if result.data:
            return result.data["reviews"]
        return None
    except Exception as e:
        logger.warning("Cache read failed for %s: %s", place_id, e)
        return None


def _cache_reviews(place_id: str, reviews: List[Dict]) -> None:
    """Upsert reviews into Supabase cache."""
    if not _sb:
        return

    try:
        _sb.table("review_cache").upsert(
            {
                "place_id": place_id,
                "reviews": reviews,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "review_count": len(reviews),
            },
            on_conflict="place_id",
        ).execute()
        logger.info("Cached %d reviews for %s", len(reviews), place_id)
    except Exception as e:
        logger.warning("Cache write failed for %s: %s", place_id, e)
