# Menuto

Restaurant dish recommendation app. React Native/Expo frontend + FastAPI/Supabase backend + Gemini AI.

## Stack

- **Frontend:** React Native 0.79 + Expo 53, TypeScript, Zustand, React Navigation
- **Backend:** FastAPI (Python), Supabase (Postgres + Auth), Google Gemini 2.5 Flash
- **Auth:** Supabase Auth (HS256 JWT, verified in `require_user.py`)
- **APIs:** Google Places (restaurant search + reviews), Gemini (parsing + recommendations + enrichment)
- **Deploy:** Backend on Render, frontend via Expo/EAS Build

## Project Structure

```
menuto-app/
  App.tsx              # Entry, navigation, Supabase session listener
  screens/             # Screen components
    profile/           # ProfileHeader, TastePreferencesCard, SavedRestaurantsList
    choosedish/        # DishScoringCard, PreferencesPanel
    onboarding/        # TastePreferencesScreen, RestaurantSelectionScreen
  components/          # Reusable UI (RestaurantCard, SearchBar, MenuItemCard, etc.)
  constants/index.ts   # Cuisines, dietary restrictions, cities
  services/api.ts      # Backend API client (auto-attaches Supabase JWT)
  services/supabase.ts # Supabase client with SecureStore session persistence
  store/useStore.ts    # Zustand (user, session, loading, error states)
  types/index.ts       # TypeScript interfaces
  theme.tsx            # Colors, typography, spacing

menuto-backend/
  app/main.py          # FastAPI app, router registration, CORS
  app/require_user.py  # Supabase JWT auth middleware (HS256)
  app/models.py        # ParsedMenu + ParsedDish (only remaining models)
  app/routers/
    smart_recommendations.py  # AI recommendation endpoint
    behavioral_tracking.py    # dish_ratings, dish_views, dish_orders, dish_favorites
    menu_api.py               # Menu CRUD, ingest orchestration
    menu_parser_api.py        # URL/image parsing endpoints
    menu_parsing.py           # Parse-and-store, screenshot parsing
    reviews.py                # Google review fetching + dish sentiments
    users.py                  # User profile CRUD
    places.py                 # Google Places proxy
  app/services/
    smart_recommendation_algorithm.py  # 8-component scoring engine
    recommendation_engine.py           # Legacy taste profiler (used as fallback)
    recommendation_types.py            # Dataclasses: ItemFeatures, ScoredItem, etc.
    menu_data_service.py               # Supabase menu item source
    menu_parser.py                     # Gemini-powered URL/PDF/image parser
    screenshot_menu_parser.py          # Gemini Vision for menu photos
    menu_parsing_utils.py              # Dish name normalization, price parsing
    review_ingestion.py                # Google reviews + Gemini dish extraction + cache
  migrations/                          # SQL migrations for Supabase
```

## Commands

```bash
cd menuto-backend && uvicorn app.main:app --reload --port 8080
cd menuto-app && npx expo start
```

## Reference Docs

| Doc | What it covers |
|-----|---------------|
| [docs/algorithm.md](docs/algorithm.md) | Recommendation scoring pipeline, 8 components, review sentiment, rating history |
| [docs/ux.md](docs/ux.md) | Design system, screen purposes, UX priorities |
| [docs/cleanup.md](docs/cleanup.md) | Full cleanup history, what was removed, why |
| [docs/mistakes.md](docs/mistakes.md) | Internalized mistakes to never repeat |
| [docs/changelog.md](docs/changelog.md) | Chronological change log |

## Top 3 Things to Improve (Rolling)

1. **LLM dietary filtering** — Replace keyword matching with Gemini classification at parse time
2. **Loading skeletons** — Replace spinners with skeleton placeholders for perceived performance
3. **Learned per-user weights** — Replace hand-tuned scoring weights with weights learned from user's rating history

## Rules

- Never commit .env files — use .env.example for documenting required vars
- Backend logging uses Python `logging` module, not `print()`
- Keep screens under 500 lines — extract to `screens/<feature>/` sub-components
- All AI uses Gemini 2.5 Flash — no OpenAI dependency
- Supabase is the only database — no SQLAlchemy
- `smart_recommendation_algorithm.py` is the active engine — `recommendation_engine.py` is fallback only
