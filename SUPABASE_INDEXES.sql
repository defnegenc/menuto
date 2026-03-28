-- Recommended indexes for behavioral tracking tables
-- These indexes are already defined in the SQLAlchemy models, but if you need to add them manually:

-- Indexes for dish_orders (already in models_behavior.py)
CREATE INDEX IF NOT EXISTS idx_dish_orders_dish ON dish_orders(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_orders_user ON dish_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_orders_restaurant ON dish_orders(restaurant_place_id);
CREATE INDEX IF NOT EXISTS idx_dish_orders_date ON dish_orders(ordered_at);

-- Indexes for dish_views (already in models_behavior.py)
CREATE INDEX IF NOT EXISTS idx_dish_views_dish ON dish_views(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_views_user ON dish_views(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_views_date ON dish_views(viewed_at);

-- Indexes for dish_ratings (already in models_behavior.py)
CREATE INDEX IF NOT EXISTS idx_dish_ratings_dish ON dish_ratings(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_ratings_user ON dish_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_ratings_rating ON dish_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_dish_ratings_date ON dish_ratings(rated_at);

-- Indexes for dish_favorites (already in models_behavior.py)
CREATE INDEX IF NOT EXISTS idx_dish_favorites_user ON dish_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_favorites_dish ON dish_favorites(dish_id);

-- Additional useful indexes for parsed_menus
CREATE INDEX IF NOT EXISTS idx_parsed_menus_place_id ON parsed_menus(place_id);
CREATE INDEX IF NOT EXISTS idx_parsed_dishes_menu_id ON parsed_dishes(menu_id);

