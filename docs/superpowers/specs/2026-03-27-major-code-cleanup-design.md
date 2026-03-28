# Menuto Major Code Cleanup — Design Spec

**Date:** 2026-03-27
**Goal:** Make the Menuto codebase production-ready through a 5-phase cleanup
**Stack:** FastAPI (Python) + React Native/Expo (TypeScript) + Supabase + Google Gemini

---

## Context

Menuto is a restaurant recommendation app. The codebase has accumulated technical debt across 63 commits on a single `main` branch. Key problems: exposed secrets, excessive debug logging, dead code, 3+ redundant auth screens, 3 recommendation engines (only 1 active), and oversized components.

**Current deployment:** Backend on Render (`render.yaml`), frontend via Expo/EAS Build.

---

## Phase 1: Baseline & Security

**Goal:** Establish a clean git baseline and eliminate all secret exposure.

### 1.1 Commit current state
- Stage all current files (the 209 "deleted" + 15 untracked are from an incomplete restructuring)
- Commit as "chore: baseline snapshot before major cleanup"

### 1.2 Secure secrets
- Add `.env`, `.env.*`, `.env.local` to `.gitignore` (both root and menuto-backend/)
- Remove `.env` and `.env.dev` and `.env.prod` from git tracking (`git rm --cached`)
- Create `.env.example` files with placeholder values for both backend and frontend
- **User action required:** Rotate all exposed keys after this commit:
  - OpenAI API key (`sk-proj-8Fp...`)
  - Google Places API key (`AIzaSyAC...`)
  - Supabase URL + service role key
  - Clerk secret key
  - Google Gemini API key

### 1.3 Deliverable
- Clean commit with secrets removed from tracking
- `.env.example` files documenting required variables
- Checklist of keys for user to rotate

---

## Phase 2: Dead Code Removal

**Goal:** Remove all files and code paths that are not in use.

### 2.1 Delete duplicate/unused files
- `menuto-app/screens/SignInScreen 3.tsx` — unused duplicate
- `menuto-app/screens/SignInScreen 4.tsx` — unused duplicate
- `menuto-app/package-lock 2.json` — stale lockfile duplicate

### 2.2 Remove unused recommendation engines
- Delete `menuto-backend/app/services/recommendation_engine.py` (old engine)
- Delete `menuto-backend/app/services/enhanced_recommendation_algorithm.py` (intermediate iteration)
- Keep `menuto-backend/app/services/smart_recommendation_algorithm.py` (active)
- Remove any imports/references to the deleted engines from routers and `__init__.py`

### 2.3 Audit auth screens
- Identify which auth screen is actually wired into navigation (likely `ClerkAuthScreen.tsx`)
- Mark unused auth screens for removal (will be fully replaced in Phase 4)
- For now, keep the active Clerk screen — it gets replaced during auth migration

### 2.4 Remove dead imports
- Scan all Python files for unused imports
- Scan all TypeScript files for unused imports

### 2.5 Deliverable
- Commit: "chore: remove dead code, duplicate files, and unused recommendation engines"

---

## Phase 3: Bug Fixes & Debug Cleanup

**Goal:** Remove all debug artifacts and fix known code quality issues.

### 3.1 Backend: Replace print() with logging
- `menuto-backend/app/services/menu_data_service.py` — remove ~60 `print(f"...")` statements
- `menuto-backend/app/routers/users.py` — remove debug print statements
- `menuto-backend/app/routers/smart_recommendations.py` — remove debug logging
- Add `import logging` and `logger = logging.getLogger(__name__)` to each module
- Convert critical operational messages to `logger.info()` / `logger.error()`
- Remove emoji-prefixed debug messages entirely (they're noise)

### 3.2 Backend: Fix bare except clauses
- `menuto-backend/app/routers/users.py` — replace `except:` with `except Exception as e:`
- Audit all other Python files for bare except patterns
- Ensure exceptions are logged, not silently swallowed

### 3.3 Frontend: Remove debug console.log
- `menuto-app/screens/MyRestaurants.tsx` (lines ~424-426) — remove debug logs
- Scan all screens/components for `console.log` that should be removed
- Keep only error-level logging (`console.error` for caught exceptions)

### 3.4 Backend: Standardize router registration
- In `menuto-backend/app/main.py`, ensure all routers use explicit `prefix=` in `include_router()`
- Document the URL structure in a comment block

### 3.5 Deliverable
- Commit: "fix: remove debug logging, fix bare except clauses, standardize routers"

---

## Phase 4: Auth Migration (Clerk -> Supabase Auth)

**Goal:** Replace Clerk with Supabase Auth across backend and frontend.

### 4.1 Why Supabase Auth
- Already using Supabase for the database — zero new infrastructure
- Free tier (50k MAUs) is more than sufficient
- Native React Native support via `@supabase/supabase-js`
- JWT-based, compatible with existing backend auth pattern

### 4.2 Backend changes
- Replace `menuto-backend/app/require_user.py` (Clerk JWT verification) with Supabase JWT verification
  - Supabase JWTs use the project's JWT secret (already available via `SUPABASE_SERVICE_ROLE_KEY`)
  - Verify tokens using `python-jose` or `PyJWT` against Supabase's JWT secret
- Remove Clerk-specific environment variables (`CLERK_ISSUER`)
- Update all router endpoints that depend on `require_user` dependency
- User ID format will change (Clerk `user_xxx` -> Supabase UUID) — need migration path for existing user data

### 4.3 Frontend changes
- Remove `@clerk/clerk-expo` dependency
- Remove `menuto-app/clerkTokenCache.ts`
- Replace all auth screens with a single `AuthScreen.tsx` using Supabase Auth:
  - Email/password sign-up and sign-in
  - Session management via `supabase.auth.onAuthStateChange()`
- Update `menuto-app/services/api.ts` to use Supabase session token instead of Clerk token
- Update `menuto-app/App.tsx`:
  - Remove Clerk provider wrapping
  - Replace with Supabase auth state listener
  - Simplify the auth flow (currently ~100 lines of Clerk-specific logic)

### 4.4 Data migration
- Map existing Clerk user IDs to new Supabase Auth UUIDs
- Update `user_preferences`, `user_ratings`, and any user-linked tables
- This is a one-time migration script

### 4.5 Auth screens consolidation
- Delete: `AuthScreen.tsx`, `ClerkAuthScreen.tsx`, `ClerkSignInScreen.tsx`, `SignInScreen.tsx`
- Create: Single `AuthScreen.tsx` with Supabase Auth (email/password + social optional)

### 4.6 Deliverable
- Commit: "feat: migrate auth from Clerk to Supabase Auth"
- Migration script committed as `menuto-backend/scripts/migrate_clerk_to_supabase.py`

---

## Phase 5: Code Organization

**Goal:** Improve code structure for maintainability.

### 5.1 Split large screen components
Each screen over 800 lines gets broken into focused sub-components:

**ProfileScreen.tsx (1,606 lines):**
- `ProfileHeader.tsx` — user info display
- `TastePreferencesEditor.tsx` — preference editing UI
- `SavedRestaurantsList.tsx` — restaurant list with actions
- `ProfileScreen.tsx` — composition of above + navigation logic

**ChooseDishLanding.tsx (1,569 lines):**
- `DishScoringCard.tsx` — individual dish scoring UI
- `ScoringProgressBar.tsx` — progress indicator
- `ChooseDishLanding.tsx` — orchestration + navigation

**RestaurantDetailScreen.tsx (1,354 lines):**
- `MenuSection.tsx` — menu display
- `RestaurantHeader.tsx` — restaurant info + image
- `RestaurantDetailScreen.tsx` — composition

### 5.2 Extract hardcoded constants
- Move cuisine list, dietary restrictions, and city list from `App.tsx` to `menuto-app/constants/index.ts`

### 5.3 Improve Zustand store
- Add loading/error states to the store
- Define proper TypeScript interface (replace `any` in key paths)
- Add `clearError()` and `setLoading()` actions

### 5.4 Type safety improvements (targeted)
- Replace `any` with proper types in:
  - `App.tsx` (userData, navigation params)
  - `services/api.ts` (response types)
  - `store/useStore.ts` (state shape)
- NOT a full 9,000-`any` cleanup — just the critical paths

### 5.5 Deliverable
- Commit: "refactor: split large screens, extract constants, improve store typing"

---

## Out of Scope

These are real issues but not part of this cleanup:
- Full TypeScript strictness migration (9,000+ `any` types)
- React error boundaries (important but additive, not cleanup)
- Request ID tracing (backend observability enhancement)
- Deployment platform evaluation (Render vs Vercel vs others)
- Test coverage (no tests exist; adding tests is a separate initiative)
- Performance optimization

---

## Execution Order

```
Phase 1 (Baseline & Security)
    ↓
Phase 2 (Dead Code Removal)
    ↓
Phase 3 (Bug Fixes & Debug Cleanup)
    ↓
Phase 4 (Auth Migration)
    ↓
Phase 5 (Code Organization)
```

Each phase produces a working, committable state. If any phase needs to be deferred, phases 1-3 can be done independently. Phase 4 (auth migration) is the highest-risk phase and could be deferred. Phase 5 depends on Phase 2 (dead code must be gone before reorganizing).

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Auth migration breaks user sessions | Migration script + test with dev account first |
| Removing "dead" code that's actually used | Grep for all references before deletion |
| Backend debug removal hides real errors | Replace critical prints with proper logging, not just deletion |
| Large component split introduces regressions | Verify navigation and state still works after each split |
