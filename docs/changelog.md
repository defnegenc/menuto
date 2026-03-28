# Changelog

## 2026-03-27 — Major Cleanup Plan Created
- Created CLAUDE.md with project overview and references
- Created docs/algorithm.md documenting the recommendation engine
- Created docs/ux.md documenting design system and UX priorities
- Created docs/mistakes.md capturing internalized lessons
- Created 5-phase cleanup design spec at docs/superpowers/specs/

## Pre-Cleanup State (as of 2026-03-27)
Issues identified before cleanup began:

- **Security:** API keys (OpenAI, Google Places, Supabase, Clerk) committed to git in .env files
- **Dead code:** 2 duplicate SignInScreen files, 2 unused recommendation engines, stale package-lock
- **Debug noise:** 60+ print() statements in backend, console.logs in frontend
- **Code quality:** Bare except clauses, 9,000+ `any` types, inconsistent router registration
- **Architecture:** 3+ auth screens (Clerk migration incomplete), screens over 1,500 lines
- **Git state:** 209 staged deletions from incomplete restructuring

## Historical Changes (from git log)
- `e360ede` — Added comprehensive debugging for MenuDataService menu fetching
- `960b471` — Improved menu item fetching with better error handling
- `dece3b8` — Fixed router exports in __init__.py
- `052af2d` — MenuDataService now fetches menu items from Supabase
- `6004f82` — Fixed backend PORT binding for Render deployment
- `f36fdf3..ab62e25` — Major UI revamp (tabs, styling, components)
- `d21d23d` — Simplified menu parser to LLM-first approach
