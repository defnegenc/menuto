# Recommendation Algorithm

The active engine is `SmartRecommendationAlgorithm` in `menuto-backend/app/services/smart_recommendation_algorithm.py`.

## Pipeline

```
Menu Items → Candidate Generation → Scoring & Ranking → Diversification → Explanations → Top N
```

### Stage 1: Candidate Generation

Filters the full menu down to ~40 candidates:

- **Dietary filtering** — Hard filter based on user constraints (vegetarian, vegan). Uses keyword matching against dish name + description for meat/dairy terms.
- **Dessert suppression** — Unless user explicitly craves "sweet"/"dessert", dessert items are penalized (-0.18) and non-dessert items preferred.
- **Drink suppression** — Beverages penalized (-0.10) unless user craves "cocktail"/"drinks".
- **Seed scoring** — Each item scored by `0.6 * personal_taste + 0.4 * sentiment`, then top 40 kept.

### Stage 2: Scoring & Ranking

Each candidate gets a weighted composite score from 7 components:

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| `personal_taste` | 0.40 | Match to user's cuisine prefs, flavor profile, dish types |
| `sentiment` | 0.20 | Review sentiment / popularity score (default 0.65 if unknown) |
| `craving` | 0.15 | Keyword match against user's current craving tags |
| `hunger` | 0.05 | Course appropriateness for hunger level (light/normal/starving) |
| `spice` | 0.10 | Alignment between dish spice level and user tolerance |
| `friend` | 0.05 | Boost if a friend selected this item |
| `restaurant` | 0.05 | Bonus if dish matches user's general flavor profile keywords |

**Weights sum to ~1.0.** All component scores are clamped to [0, 1].

### Stage 3: Diversification

Prevents monotonous results:
- Buckets items by `(course, protein)` tuple
- Max 2 items per bucket
- Backfills with remaining items if needed

### Stage 4: Explanations

Generates human-readable "why recommended" bullets (max 3 per dish):
1. Craving match ("Perfect for your pasta craving")
2. Hunger fit ("Perfect lighter option")
3. Sentiment ("Highly praised by other diners")
4. Taste match ("Matches your love for Italian cuisine")
5. Spice alignment
6. Friend boost
7. Fallback: "Great choice based on your preferences"

## Key Types

Defined in `recommendation_types.py`:

- `ItemFeatures` — Extracted dish features (name, price, cuisine, spice, protein, course, sentiment)
- `UserTasteProfile` — User's preferences (cuisines, flavor profile, dish types, spice tolerance)
- `RecommendationContext` — Session context (hunger level, cravings, budget, friend picks)
- `ScoredItem` — Final output (item + component scores + explanations)
- `HungerLevel` — Enum: LIGHT / NORMAL / STARVING

## Fallback Path

If candidate generation returns empty (e.g., all items filtered by dietary constraints), falls back to `RecommendationEngine.generate_recommendations()` which uses a simpler similarity-based approach.

## Known Limitations

- Dietary filtering is keyword-based, not ingredient-aware (e.g., "Caesar salad" with anchovy won't be caught for vegetarian)
- Spice level is often `None` for menu items, falling back to a neutral 0.5
- Sentiment scores default to 0.65 when no review data exists
- No learning from user feedback yet (ratings stored but not fed back into scoring)

## Top 3 Algorithm Improvements

1. **Feed user ratings back into scoring** — UserRatings exist in DB but aren't used by the algorithm
2. **Better dietary filtering** — Use LLM to classify dishes instead of keyword matching
3. **Learned weights** — Replace hand-tuned component weights with per-user learned weights based on rating history
