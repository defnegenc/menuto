# Menuto

Restaurant dish recommendation app. React Native/Expo frontend + FastAPI/Supabase backend + Gemini AI.

## Stack

- **Frontend:** React Native 0.79 + Expo 53, TypeScript, Zustand, React Navigation
- **Backend:** FastAPI (Python), Supabase (Postgres + Auth), Google Gemini 2.5 Flash
- **Auth:** Supabase Auth (HS256 JWT, verified in `require_user.py`) + Google OAuth
- **APIs:** Google Places (restaurant search + reviews), Gemini (parsing + recommendations + enrichment)
- **Deploy:** Backend on Render, frontend via Expo/EAS Build

## Commands

```bash
# Backend (dev mode — accepts unverified JWTs with real user IDs)
cd menuto-backend && API_ENV=dev uvicorn app.main:app --reload --port 8080

# Frontend — Expo Go (no OAuth support)
cd menuto-app && npx expo start

# Frontend — Dev build (required for Google OAuth, custom URL scheme)
cd menuto-app && npx expo prebuild --clean && npx expo run:ios

# Check if backend is alive
curl -s http://127.0.0.1:8080/docs | head -1
```

## Auth

- Google OAuth via Supabase (not direct) — app scheme `menuto://auth/callback`
- Supabase Dashboard: Google provider ON, redirect URL `menuto://auth/callback` in URL Configuration
- Google Cloud Console: Web application type, redirect `https://jakutukxbpbrwldpgybl.supabase.co/auth/v1/callback`
- Expo Go can't register custom URL schemes — must use dev build (`npx expo run:ios`)
- `require_user.py` dev mode: decodes JWT without verification, extracts real `sub` for actual user IDs

## Design System

- **Red:** #E9323D — accents, active states, CTAs
- **Near-black:** #1A1A1A — primary text, dark buttons
- **Body:** #444444, muted: #666666, light: #9CA3AF
- **Background:** #FFFFFF — white only, no cream
- **Dividers:** #E5E5E5 (1px) — no card backgrounds, editorial/journal style
- **Fonts:** PlayfairDisplay-Italic (headlines), DMSans-* (body/UI), IBMPlexMono-SemiBold (dish names)
- **Font files in:** `assets/fonts/` — loaded in `utils/fonts.ts`
- **Chips:** borderRadius 4, selected = red fill + white text
- **Headers:** `ScreenHeader` component — Playfair 48px, title black + accent red, two lines
- **Cards:** No backgrounds — divider-separated, typography-driven
- **Bottom tabs:** Rectangular segmented toggle (#1A1A1A active, gray inactive)
- `theme.tsx` exists but is legacy — screens use direct color values, don't add new `theme.*` refs

## Project Structure

```
menuto-app/
  App.tsx              # Entry, navigation, Supabase session listener
  screens/
    IntroScreen.tsx    # New user landing (map bg, animated pin)
    AuthScreen.tsx     # Sign in/up + Google OAuth
    MainTabScreen.tsx  # Tab container (My List / Choose Dish toggle + ProfileIcon)
    MyRestaurants.tsx  # Restaurant list with editorial cards
    ChooseDishLanding.tsx # 3-step flow: restaurant → menu → preferences
    DishRecommendations.tsx # Ranked dish picks with expandable reasons
    RestaurantDetailScreen.tsx # Menu browser per restaurant
    ProfileScreen.tsx  # Profile with inline editing
    PostMealFeedback.tsx # Star rating + tags after ordering
    profile/           # ProfileHeader, TastePreferencesCard, SavedRestaurantsList
    choosedish/        # DishScoringCard, PreferencesPanel
    onboarding/        # TastePreferencesScreen (3-step: dietary → cuisines → neighborhood), RestaurantSelectionScreen
  components/
    ScreenHeader.tsx   # Shared editorial header (Playfair title + red accent)
    ProfileIcon.tsx    # Avatar circle with red dot, top-right of tabs
    RestaurantCard.tsx # Divider-based card (Playfair name, no bg)
    SearchRestaurantCard.tsx / SearchRestaurantSelected.tsx # Search results
    MenuItemCard.tsx   # Dish card (Playfair name, expandable)
    SearchBar.tsx      # Shared search input (flipped icon, gray-50 bg)
    LoadingScreen.tsx  # Floating text + pulsing dots (no progress bar)
  constants/index.ts   # Cuisines (region-tabbed), dietary, cities, neighborhoods
  services/api.ts      # Backend API client (auto-attaches Supabase JWT)
  services/supabase.ts # Supabase client with SecureStore session persistence
  store/useStore.ts    # Zustand (user, session, loading, error states)
  types/index.ts       # TypeScript interfaces
  theme.tsx            # LEGACY — colors, typography (screens use direct values now)
  utils/fonts.ts       # Font loading (DM Sans, Playfair Display, IBM Plex Mono)
  assets/fonts/        # PlayfairDisplay-Italic.ttf, IBMPlexMono-*.ttf, DMSans-*.ttf

menuto-backend/
  app/main.py          # FastAPI app, router registration, CORS
  app/require_user.py  # Supabase JWT auth middleware (HS256, dev mode passthrough)
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
    smart_recommendation_algorithm.py  # 8-component scoring engine + Thompson Sampling
    recommendation_engine.py           # Legacy taste profiler (fallback only)
    recommendation_types.py            # Dataclasses: ItemFeatures, ScoredItem, etc.
    menu_data_service.py               # Supabase menu item source
    menu_parser.py                     # Gemini-powered URL/PDF/image parser
    screenshot_menu_parser.py          # Gemini Vision for menu photos
    menu_parsing_utils.py              # Dish name normalization, price parsing
    review_ingestion.py                # Google reviews + Gemini dish extraction + cache
  migrations/                          # SQL migrations for Supabase
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

1. **Drinks menu support** — Client-side filtering works but backend should return category-aware recommendations
2. **Loading skeletons** — Replace spinners with skeleton placeholders for perceived performance
3. **Fix JWT secret** — Google OAuth JWTs fail signature verification, dev mode workaround in place

## Gotchas

- Backend dies silently in dev — always check `curl localhost:8080/docs` before debugging app errors
- Gemini free tier: 20 req/day for 2.5-flash, lower for 2.0-flash — enable billing for real usage
- `react-native-svg` imports crash without native rebuild — use text characters for icons instead
- Linter/formatter may revert edits — verify changes stuck after saving
- `npx expo prebuild --clean` needed after adding new native font files
- Profile icon (`ProfileIcon` component) lives in top-right of MainTabScreen, not in tab bar
- `theme.tsx` still exports but screens use direct values — don't mix approaches

## Rules

- Never commit .env files — use .env.example for documenting required vars
- Backend logging uses Python `logging` module, not `print()`
- Keep screens under 500 lines — extract to `screens/<feature>/` sub-components
- All AI uses Gemini 2.5 Flash — no OpenAI dependency
- Supabase is the only database — no SQLAlchemy
- `smart_recommendation_algorithm.py` is the active engine — `recommendation_engine.py` is fallback only
- Screens use direct color/font values, not `theme.*` imports
- Design follows editorial/journal aesthetic — no card backgrounds, divider-based, typography-driven
