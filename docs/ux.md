# UX Language & Design

## Design System

### Colors (from `menuto-app/theme.tsx`)
- **Primary:** `#D8131F` (red) — brand color, CTAs, active states
- **Background:** `#FFFEF4` (warm cream) — app background
- **Surface:** `#FFFFFF` (white) — cards and elevated surfaces
- **Accent green:** `#CCDCB6` — chips, tags, secondary elements
- **Dark red:** `#881219` — borders, emphasis
- **Gold:** `#FFD700` — star ratings

### Typography
- **Font family:** DM Sans (Regular, Medium, SemiBold, Bold) + Artifact (display)
- **Scale:** xs(10) sm(12) md(14) lg(16) xl(18) xxl(20) title(24) heading(30) display(32)

### Spacing
- Base unit: 4px grid
- Card padding: 16px
- Section spacing: 24px
- Screen padding: 20px horizontal

## Core UX Principles

1. **Recommendation confidence** — Every dish recommendation shows a score (0-100) and human-readable explanation ("Matches your love for Italian"). Users should always understand *why* something was recommended.

2. **Progressive disclosure** — Don't overwhelm. Show 5 recommendations, not 20. Show the top explanation, let users tap for more detail.

3. **Preference learning** — The app should feel smarter over time. Ratings (1-5 stars) and favorites are the feedback signals. Currently stored but not yet fed back into the algorithm.

4. **Low-friction onboarding** — Cuisine preferences + spice tolerance + dietary restrictions. That's it. No lengthy questionnaires.

## User Flow

```
Sign In → Onboarding (preferences) → Main Tabs
                                       ├── My Restaurants (saved list)
                                       └── Add Restaurant (search)
                                            ↓
                                       Select Restaurant → Get Recommendations
                                            ↓
                                       Dish Detail → Rate → Feedback Loop
```

## Screen Purposes

| Screen | Purpose | Key UX Goal |
|--------|---------|-------------|
| ProfileScreen | View saved restaurants, edit preferences | Quick access to "what should I eat?" |
| RestaurantSearchScreen | Find new restaurants via Google Places | Fast search with location awareness |
| RecommendationsScreen | AI dish recommendations for a restaurant | Trust-building — show *why* each dish |
| DishDetailScreen | Dish info + rating | Collect feedback, build taste profile |
| ChooseDishLanding | Multi-dish scoring flow | Engaging comparison experience |
| PostMealFeedback | After-meal rating | Close the feedback loop |

## Component Patterns

- **RestaurantCard** — Name, cuisine, rating, visit count. Tap to get recommendations.
- **MenuItemCard** — Dish name, price, score badge, explanation snippet. Tap for detail.
- **Chip/DishChip** — Toggleable tags for cuisines, dietary restrictions, cravings.
- **SearchBar** — Debounced (300ms), location-aware, Google Places autocomplete.
- **UnifiedHeader** — Consistent header with back navigation across all screens.

## Current UX Problems

- ProfileScreen is 1,606 lines — UI logic and data fetching tangled together
- No loading skeletons — just spinners, which feel slow
- Error states show raw error messages, not user-friendly recovery options
- No empty states for "no restaurants saved" or "no recommendations found"
- Auth flow has 3+ screens (Clerk migration remnants) — confusing entry point

## Top 3 UX Improvements

1. **Loading skeletons** — Replace spinners with skeleton placeholders on recommendation and restaurant screens. Makes the app feel faster even when API is slow.
2. **Empty states with CTAs** — When no restaurants saved: show illustration + "Search for your first restaurant" button. When no recommendations: explain why and suggest actions.
3. **Streamlined auth** — Single auth screen with Supabase Auth (email + social). Remove the 3-screen Clerk flow.
