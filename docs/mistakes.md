# Internalized Mistakes

Lessons learned from this codebase. Don't repeat these.

## 1. Never commit .env files
**What happened:** OpenAI, Google Places, Supabase, and Clerk API keys were committed to the git repo in plain .env files. Even after removal, they persist in git history.
**Rule:** Always add `.env*` to `.gitignore` before the first commit. Use `.env.example` with placeholder values. Rotate any key that touches git.

## 2. Don't use print() for debugging in Python backends
**What happened:** 60+ emoji-prefixed `print(f"...")` statements accumulated in menu_data_service.py and routers. They can't be filtered by level, don't include timestamps, and leak sensitive data (user IDs, queries) to stdout.
**Rule:** Use `logging.getLogger(__name__)` from day one. Use `logger.debug()` for dev, `logger.info()` for operational, `logger.error()` for failures. Never print user data.

## 3. Don't create "iteration" files — replace in place
**What happened:** SignInScreen.tsx, SignInScreen 3.tsx, SignInScreen 4.tsx, ClerkSignInScreen.tsx all exist. Three recommendation engines exist (only one is active). Makes it impossible to know which code is live.
**Rule:** One source of truth per concern. When iterating, modify the existing file or use git branches. Delete dead code immediately.

## 4. Don't let screens grow past 500 lines
**What happened:** ProfileScreen.tsx (1,606 lines), ChooseDishLanding.tsx (1,569 lines). These files mix data fetching, business logic, UI rendering, and inline styles. Impossible to review, test, or modify safely.
**Rule:** Extract sub-components at 300 lines. By 500 lines, something is definitely doing too much.

## 5. Don't use bare except: in Python
**What happened:** `except:` catches everything including SystemExit and KeyboardInterrupt. Silent failures masked real bugs.
**Rule:** Always specify the exception type: `except (ValueError, KeyError) as e:`. Log the exception.

## 6. Don't hardcode configuration in component files
**What happened:** 50+ cuisines, dietary restrictions, and city lists hardcoded in App.tsx. Changing them requires editing the main app file.
**Rule:** Extract to a constants file or fetch from API. Configuration should be easy to find and change.

## 7. Don't use `any` as a type escape hatch
**What happened:** 9,000+ `any` types across the frontend. TypeScript provides zero safety — bugs that types would catch only surface at runtime.
**Rule:** Define interfaces in types/index.ts. Use `unknown` when truly unknown, then narrow with type guards.

## 8. Commit restructuring atomically
**What happened:** A major directory restructuring left 209 files staged as deletions with 15 untracked replacements. The repo was in a broken state for an unknown period.
**Rule:** Restructure in a single commit. Use `git mv` so git tracks the rename. Never leave the repo in a half-restructured state.

## 9. Don't use two ORMs for the same database
**What happened:** Backend had both SQLAlchemy models AND Supabase client calls. The SQLAlchemy models referenced tables that didn't exist in Supabase. Three routers (restaurants, dishes, reviews) silently failed.
**Rule:** One data access layer. If using Supabase, use the Supabase client everywhere. Don't maintain SQLAlchemy models alongside.

## 10. Pin your LLM model versions
**What happened:** `gemini-2.0-flash-exp` was deprecated with no warning. The entire parsing and recommendation pipeline broke with a 404 error.
**Rule:** Use stable model names (e.g., `gemini-2.5-flash`) not experimental ones. When an LLM model is updated, test before deploying.
