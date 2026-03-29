# Recommendation Algorithm

Agent-first architecture. A Gemini agent sees all raw signals about the user and menu, then reasons about what to recommend and why. No rigid scoring formulas.

## Pipeline

```
Menu → Dietary filter → Enrich with signals → Agent picks 5 → User feedback → Agent learns
```

## Stage 1: Data Gathering

Before the agent sees anything, we assemble context from 8 sources:

| Source | What it provides | Cost |
|--------|-----------------|------|
| `parsed_dishes` (Supabase) | Menu items with name, description, course, ingredients | Free (cached) |
| Google Places reviews | 5 reviews per restaurant → dish mentions + sentiment | Free (1,000/mo, 14-day cache) |
| Review mention frequency | Which dishes appear in most reviews = popularity proxy | Free (derived from cached reviews) |
| `dish_orders` (Supabase) | Cross-user order counts per dish | Free (app data) |
| `dish_ratings` (Supabase) | User's past ratings, cross-restaurant | Free (app data) |
| Behavioral signals | Views, orders, favorites per dish per user | Free (app data) |
| `taste_signals` (Supabase) | Gemini-extracted keywords from past feedback text | Cached on write |
| Gemini embeddings | Taste profile → dish cosine similarity | 2 API calls per request |

## Stage 2: Taste Profile (Gemini)

User's favorite dishes + recently 4-5★ rated dishes → Gemini returns:
```json
{
  "cuisine_preferences": ["Italian", "Japanese"],
  "flavor_profile": "rich, umami, slightly spicy",
  "dish_types": ["pasta", "ramen", "grilled"],
  "spice_tolerance": "medium"
}
```

Profile refreshes automatically as user rates more dishes.

## Stage 3: Dietary Filter (Rigid — Safety)

The only rigid step. Filters candidates using:
1. **LLM-generated dietary flags** (best): `is_vegetarian`, `is_vegan`, `is_gluten_free`, `contains_nuts`, `contains_dairy`, `contains_alcohol` — generated at menu parse time with instructions to catch hidden ingredients (anchovy in Caesar, fish sauce in Pad Thai)
2. **Keyword fallback** (for old menus): 30+ meat keywords, 13+ dairy keywords

## Stage 4: Signal Enrichment

Each surviving candidate gets raw signals attached (NOT scores — just facts):

```
3. Cavatelli — truffle sabayon, sweet corn (course: Pasta)
   [MATCHES YOUR TASTE, MATCHES CRAVING, POPULAR (60%), WELL-REVIEWED]
```

Signals include:
- `MATCHES YOUR TASTE` — embedding cosine similarity ≥ 0.6
- `POPULAR (N%)` — ordered by N% of users or mentioned in N% of reviews
- `WELL-REVIEWED` — review sentiment ≥ 0.7
- `MATCHES CRAVING` — craving keyword found in dish text
- `YOU LOVED THIS (N★)` / `YOU DIDN'T LIKE THIS (N★)` — past rating
- `YOUR FAVORITE` / `REORDERED` / `TRIED BEFORE` — behavioral signals
- `LOOKED AT BUT NEVER ORDERED` — implicit negative (viewed, rejected)
- `HAS FLAVORS YOU LIKE: creamy, rich` — from past feedback analysis
- `⚠️ HAS THINGS YOU DISLIKED: too spicy` — from past feedback analysis

## Stage 5: Agent Selection (Gemini)

The agent receives:
1. **Who they are** — taste profile, spice tolerance, learned flavor preferences
2. **Right now** — hunger level, cravings, adventure slider (1=explore, 5=safe), dining occasion (solo/date/friends/family/business), free-text mood ("celebrating tonight")
3. **History** — loved/tried/disliked dishes at this restaurant
4. **What's popular** — cross-user order counts
5. **Enriched menu** — all candidates with signal flags

The agent reasons about meal composition, honors cravings, respects adventure level, and writes personal explanations ("You're craving something rich, and this Polenta is...").

Includes 1 discovery pick — something outside the user's usual picks that has strong signals.

**Fallback:** If Gemini fails, simple sort by `0.5 × taste_similarity + 0.3 × popularity + 0.2 × sentiment`.

## Stage 6: Feedback Loop

```
User rates dish → Quick tags (positive/negative) → "Would order again?" → Free-text notes
  → Stored in dish_ratings
  → Gemini extracts taste_signals (liked/disliked keywords, spice/portion feedback)
  → Thompson Sampling weight priors updated (for future learning)
  → Next recommendation uses learned preferences
```

The feedback text is semantically analyzed: "loved the cream sauce" → next visit, dishes with "cream" or "creamy" get the signal `HAS FLAVORS YOU LIKE: cream`.

## Cold Start Strategy

New users (no ratings, no behavioral data, no favorites):
- Agent leans on **popularity** and **review sentiment** (crowd wisdom)
- Embedding similarity still works from onboarding cuisine preferences
- Free-text mood input gives the agent rich context even for first-time users

## What Improves with More Data

| Data milestone | What unlocks |
|----------------|-------------|
| First rating | Rating-based signals appear on similar dishes |
| 3+ ratings | Taste profile refreshes from actual preferences |
| 5+ ratings | Thompson Sampling priors start learning per-user signal importance |
| 10+ ratings | Learned flavor preferences (feedback keywords) become reliable |
| Friends feature | Friend favorites priority, social signals |
| 100+ users | Collaborative filtering becomes viable |

## Future Improvements (When New Features Roll In)

### Friends Feature
- Friend favorites surface as `FRIEND'S FAVORITE` signal
- Agent prioritizes friend-approved dishes over generic popularity
- Group dining: aggregate preferences of N diners into one recommendation set
- "Your friend Sarah loved the Carbonara here" as explanation text

### Collaborative Filtering (100+ Users)
- Cluster users by rating patterns (the `user_weight_priors` table has the infrastructure)
- "People with similar taste to you ordered..." signal
- Cold-start users get bootstrapped from their nearest cluster

### Menu Intelligence
- Track which dishes get ordered most after recommendations → learn which recommendations "convert"
- Detect seasonal menu changes (parsed menu dish count drops → likely menu refresh)
- Auto-re-parse stale menus (currently flags `menu_stale` but doesn't auto-refresh)

### Richer Context
- Weather-aware: soup on cold days, salad on hot days
- Previous visit awareness: "Last time you had pasta — try something different?"
- Photo-based mood: user takes a photo of the restaurant ambiance → agent infers formality level
