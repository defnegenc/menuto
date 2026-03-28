-- Schema cleanup migration (run after review_cache_table.sql)
-- Removes redundant table and adds performance indexes

-- Drop redundant table (dish_favorites supersedes this with better schema)
DROP TABLE IF EXISTS public.user_favorite_dishes;

-- Review cache: faster TTL lookups
CREATE INDEX IF NOT EXISTS idx_review_cache_fetched_at ON review_cache (fetched_at);

-- Dish ratings: needed for feeding ratings back into algo
CREATE INDEX IF NOT EXISTS idx_dish_ratings_user_id ON dish_ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_dish_ratings_dish_id ON dish_ratings (dish_id);

-- Parsed dishes: faster menu item lookups
CREATE INDEX IF NOT EXISTS idx_parsed_dishes_menu_id ON parsed_dishes (menu_id);

-- Parsed menus: fast restaurant → menu lookup
CREATE INDEX IF NOT EXISTS idx_parsed_menus_place_id ON parsed_menus (place_id);

-- Dish orders: for behavioral analysis
CREATE INDEX IF NOT EXISTS idx_dish_orders_user_id ON dish_orders (user_id);

-- Dish views: for implicit signal tracking
CREATE INDEX IF NOT EXISTS idx_dish_views_user_id ON dish_views (user_id);
