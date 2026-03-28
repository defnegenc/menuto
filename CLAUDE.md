# Menuto

Restaurant dish recommendation app. React Native/Expo frontend + FastAPI/Supabase backend.

## Stack

- **Frontend:** React Native 0.79 + Expo 53, TypeScript, Zustand, React Navigation
- **Backend:** FastAPI (Python), Supabase (Postgres), Google Gemini 2.0 Flash (menu parsing)
- **Auth:** Clerk (migrating to Supabase Auth)
- **APIs:** Google Places (restaurant search), Supabase (data + auth)
- **Deploy:** Backend on Render, frontend via Expo/EAS Build

## Project Structure

```
menuto-app/          # React Native mobile app
  App.tsx            # Entry point, navigation, auth flow
  screens/           # All screens (ProfileScreen, RestaurantSearch, etc.)
  components/        # Reusable UI components
  services/api.ts    # Backend API client
  store/useStore.ts  # Zustand global state
  types/index.ts     # TypeScript interfaces
  theme.tsx          # Colors, typography, spacing

menuto-backend/      # FastAPI Python backend
  app/main.py        # App entry, router registration
  app/routers/       # API endpoints (restaurants, dishes, users, menus, etc.)
  app/services/      # Business logic (recommendations, menu parsing)
  app/models.py      # SQLAlchemy models
  app/require_user.py # Auth middleware (Clerk JWT)
```

## Key Commands

```bash
# Backend
cd menuto-backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8080

# Frontend
cd menuto-app && npm install && npx expo start
```

## Reference Docs

- [docs/algorithm.md](docs/algorithm.md) — How the recommendation algorithm works
- [docs/ux.md](docs/ux.md) — UX language, design system, and priorities
- [docs/changelog.md](docs/changelog.md) — What's been fixed and changed
- [docs/mistakes.md](docs/mistakes.md) — Internalized mistakes to never repeat

## Top 3 Things to Improve (Rolling)

1. **Auth migration** — Replace Clerk with Supabase Auth (free, already in stack)
2. **Debug logging cleanup** — 60+ print() statements in backend, console.logs in frontend
3. **Screen decomposition** — ProfileScreen (1,606 lines) and ChooseDishLanding (1,569 lines) need splitting

## Rules

- Never commit .env files — use .env.example for documenting required vars
- Backend logging uses Python `logging` module, not `print()`
- All API responses should have consistent error shapes
- Keep screens under 500 lines — extract sub-components
- The active recommendation engine is `smart_recommendation_algorithm.py` — the others are dead code
