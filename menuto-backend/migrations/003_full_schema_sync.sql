-- Full schema sync migration
-- Run this in Supabase SQL Editor to ensure schema matches the cleaned-up codebase
-- Safe to run multiple times (all statements are idempotent)

-- ============================================================
-- 1. Review cache (for Google Places review pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.review_cache (
    place_id TEXT PRIMARY KEY,
    reviews JSONB NOT NULL DEFAULT '[]',
    review_count INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Drop redundant table (dish_favorites supersedes this)
-- ============================================================
DROP TABLE IF EXISTS public.user_favorite_dishes;

-- ============================================================
-- 3. Performance indexes
-- ============================================================

-- Review cache: TTL-based lookups
CREATE INDEX IF NOT EXISTS idx_review_cache_fetched_at ON review_cache (fetched_at);

-- Dish ratings: for feeding into recommendation algo
CREATE INDEX IF NOT EXISTS idx_dish_ratings_user_id ON dish_ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_dish_ratings_dish_id ON dish_ratings (dish_id);

-- Parsed data: faster lookups
CREATE INDEX IF NOT EXISTS idx_parsed_dishes_menu_id ON parsed_dishes (menu_id);
CREATE INDEX IF NOT EXISTS idx_parsed_menus_place_id ON parsed_menus (place_id);

-- Behavioral tracking
CREATE INDEX IF NOT EXISTS idx_dish_orders_user_id ON dish_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_dish_views_user_id ON dish_views (user_id);
CREATE INDEX IF NOT EXISTS idx_dish_favorites_user_id ON dish_favorites (user_id);

-- ============================================================
-- 4. Enable RLS on behavioral tables (if not already)
-- ============================================================
ALTER TABLE public.dish_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_favorites ENABLE ROW LEVEL SECURITY;

-- Service role policy (backend uses service_role key, bypasses RLS)
-- These are no-ops if policies already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dish_ratings' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON public.dish_ratings FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dish_orders' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON public.dish_orders FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dish_views' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON public.dish_views FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dish_favorites' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON public.dish_favorites FOR ALL USING (true);
    END IF;
END $$;
