# Recommendation Algorithm

The active engine is `SmartRecommendationAlgorithm` in `menuto-backend/app/services/smart_recommendation_algorithm.py`.

## Pipeline

```
Menu Items → Candidate Generation → Scoring & Ranking → Diversification → Explanations → Top N
```

### Stage 1: Candidate Generation

Filters the full menu down to ~40 candidates:

- **Dietary filtering** — Hard filter based on user constraints (vegetarian, vegan). Keyword matching against dish name + description.
- **Dessert suppression** — Penalized (-0.18) unless user craves "sweet"/"dessert".
- **Drink suppression** — Penalized (-0.10) unless user craves "cocktail"/"drinks".
- **Seed scoring** — `0.6 * personal_taste + 0.4 * sentiment`, top 40 kept.

### Stage 2: Scoring & Ranking

Each candidate gets a weighted composite score from **8 components**:

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| `personal_taste` | 0.30 | Match to user's cuisine prefs, flavor profile, dish types |
| `sentiment` | 0.20 | Review sentiment from Google reviews (default 0.65 if no data) |
| `craving` | 0.15 | Keyword match against user's current craving tags |
| `rating_history` | 0.10 | User's past ratings of similar dishes (4-5★ = boost, 1-2★ = suppress) |
| `spice` | 0.10 | Alignment between dish spice level and user tolerance |
| `hunger` | 0.05 | Course appropriateness for hunger level (light/normal/starving) |
| `friend` | 0.05 | Boost if a friend selected this item |
| `restaurant` | 0.05 | Bonus if dish matches user's general flavor profile keywords |

**Weights sum to ~1.0.** All component scores are clamped to [0, 1].

### Stage 3: Diversification

- Buckets items by `(course, protein)` tuple
- Max 2 items per bucket
- Backfills with remaining items if needed

### Stage 4: Explanations

Human-readable bullets (max 3 per dish), priority order:
1. Craving match → "Perfect for your pasta craving"
2. Hunger fit → "Perfect lighter option"
3. Rating history → "You've rated similar dishes highly"
4. Sentiment → "Highly praised by other diners"
5. Taste match → "Matches your love for Italian cuisine"
6. Spice alignment
7. Friend boost
8. Fallback → "Great choice based on your preferences"

## Review-Based Sentiment Pipeline

Reviews from Google Places API enrich the `sentiment` scoring component.

```
Recommendation request → get_dish_sentiment_scores(place_id)
  → Check Supabase review_cache (14-day TTL)
  → Cache miss? Fetch 5 reviews from Google Places API (1,000 free calls/month)
  → Single Gemini batch call extracts dish mentions + sentiment
  → Cache in Supabase → Return {dish_name: score} mapping
  → Fuzzy-match to menu items → Override default 0.65 sentiment_score
```

- **Cache table:** `review_cache` (place_id TEXT PK, reviews JSONB, fetched_at TIMESTAMPTZ)
- **Sentiment blend:** `0.6 * (rating/5) + 0.4 * ((llm_sentiment + 1) / 2)`
- **API:** `GET /reviews/{place_id}/reviews`, `GET /reviews/{place_id}/dish-sentiments`

## Rating History Component

User's past dish ratings (from `dish_ratings` table) feed into recommendations:

- Fetched via Supabase FK join: `dish_ratings → parsed_dishes(name)`
- Fuzzy substring matching between rated dish names and menu items
- Rating mapping: 5★ → 1.0, 4★ → 0.8, 3★ → 0.5, 2★ → 0.2, 1★ → 0.1
- No match → 0.5 (neutral, doesn't penalize or boost)
- Explanation: "You've rated similar dishes highly" or "Similar dishes didn't match your taste before"

## Key Types (`recommendation_types.py`)

- `ItemFeatures` — Dish features (name, price, cuisine, spice, protein, course, sentiment)
- `UserTasteProfile` — User's preferences (cuisines, flavor profile, dish types, spice)
- `RecommendationContext` — Session context (hunger, cravings, budget, friend picks, **user_dish_ratings**)
- `ScoredItem` — Output (item + component scores + explanations + reasoning)
- `HungerLevel` — Enum: LIGHT / NORMAL / STARVING

## Known Limitations

- Dietary filtering is keyword-based (e.g., Caesar salad with anchovy isn't caught for vegetarian)
- Spice level often `None`, defaults to neutral 0.5
- Google Places returns max 5 reviews per restaurant
- Dish name matching is fuzzy substring — may miss non-obvious matches
- Rating history only matches dishes the user rated at the SAME restaurant chain — cross-restaurant learning not yet implemented

## Top 3 Algorithm Improvements

1. **LLM dietary classification** — At menu parse time, use Gemini to tag each dish's dietary compatibility instead of keyword matching
2. **Learned per-user weights** — Replace hand-tuned 0.30/0.20/0.15/... with weights learned from each user's rating patterns
3. **Cross-restaurant dish similarity** — If user rated "Margherita Pizza" 5★ at restaurant A, boost similar pizzas at restaurant B
