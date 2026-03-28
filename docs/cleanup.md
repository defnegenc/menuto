# Cleanup History

Full record of the major cleanup performed on 2026-03-27/28.

## What Was Removed

### Dead Code (Files Deleted)
| File | Why removed |
|------|-------------|
| `screens/AuthScreen.tsx` | Unused, no imports |
| `screens/ClerkSignInScreen.tsx` | Unused, no imports |
| `screens/SignInScreen.tsx` | Unused, no imports |
| `screens/SignInScreen 3.tsx` | Duplicate iteration file |
| `screens/SignInScreen 4.tsx` | Duplicate iteration file |
| `screens/ClerkAuthScreen.tsx` | Replaced by new AuthScreen.tsx (Supabase Auth) |
| `services/mockRecommendations.ts` | Imported but never called |
| `clerkTokenCache.ts` | Clerk dependency removed |
| `app/database.py` | SQLAlchemy removed, Supabase is sole DB |
| `app/models_behavior.py` | SQLAlchemy models for tables now accessed via Supabase client |
| `app/routers/restaurants.py` | Used non-existent SQLAlchemy `restaurants` table |
| `app/routers/dishes.py` | Used non-existent SQLAlchemy `dishes`/`user_ratings` tables |

### Dependencies Removed
| Package | Why |
|---------|-----|
| `@clerk/clerk-expo` | Replaced with Supabase Auth |
| OpenAI (never installed) | All AI uses Gemini. OPENAI_API_KEY was vestigial config |

### Debug Artifacts Removed
- ~90 `print()` statements across backend (menu_data_service, users, smart_recommendations)
- File-based debug logging (`.cursor/debug.log` blocks)
- 2 bare `except:` clauses fixed in users.py
- HTTPException swallowing bug fixed in smart_recommendations.py

## What Was Migrated

| From | To | Why |
|------|----|-----|
| Clerk Auth | Supabase Auth | Free, already in stack |
| `gemini-2.0-flash-exp` | `gemini-2.5-flash` | Old model deprecated (404) |
| SQLAlchemy ORM | Supabase client | All tables are in Supabase, not a separate DB |
| Hardcoded constants in screens | `constants/index.ts` | Single source of truth |

## What Was Restructured

| Change | Before | After |
|--------|--------|-------|
| ProfileScreen | 1,570 lines | 476 lines + 3 sub-components in `screens/profile/` |
| ChooseDishLanding | 1,569 lines | 542 lines + 2 sub-components in `screens/choosedish/` |
| Auth flow | 6 screens (3 unused) | 1 screen (AuthScreen.tsx with Supabase) |
| Backend models | 8 SQLAlchemy models | 2 (ParsedMenu, ParsedDish) |
| Backend routers | 10 routers | 8 routers (removed dead ones) |
| Scoring components | 7 | 8 (added rating_history) |

## What Was Added

| Addition | Purpose |
|----------|---------|
| Review ingestion pipeline | Fetch Google reviews → Gemini extracts dish mentions → cache in Supabase |
| Rating history scoring | User's past dish ratings feed into recommendation algorithm |
| `review_cache` table | 14-day TTL cache for Google Places reviews |
| `.env.example` files | Document required env vars without exposing secrets |
| `constants/index.ts` | Centralized cuisines, dietary restrictions, cities |
| `migrations/` directory | SQL migrations for Supabase schema changes |

## Commit History

| Commit | Summary |
|--------|---------|
| `d42ef85` | Phases 1-3: baseline, security, dead code, debug cleanup |
| `9c389a6` | Phase 4-5: Clerk → Supabase Auth, constants extraction, store typing |
| `355c054` | Doc updates |
| `317c0fb` | Remove OpenAI references, update render.yaml |
| `8ac411a` | Review ingestion pipeline with Supabase caching |
| `b78a41b` | Kill SQLAlchemy legacy, upgrade Gemini to 2.5-flash |
| `7b92ce4` | Feed ratings into algo, decompose screens, delete database.py |
