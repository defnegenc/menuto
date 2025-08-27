-- Menuto App - Simple Supabase Schema Setup
-- Run this in your Supabase SQL Editor

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid references auth.users on delete cascade,
    preferred_cuisines jsonb default '[]',
    dietary_restrictions jsonb default '[]',
    spice_tolerance integer default 3,
    price_preference integer default 2,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (id)
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id bigserial primary key,
    name text not null,
    address text,
    cuisine_type text,
    google_place_id text unique,
    yelp_business_id text unique,
    avg_rating real,
    price_level integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create parsed_menus table
CREATE TABLE IF NOT EXISTS parsed_menus (
    id bigserial primary key,
    restaurant_name text not null,
    restaurant_url text not null default '',
    menu_url text not null default '',
    parsed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    dish_count integer default 0
);

-- Create parsed_dishes table
CREATE TABLE IF NOT EXISTS parsed_dishes (
    id bigserial primary key,
    menu_id bigint references parsed_menus(id) on delete cascade,
    name text not null,
    description text,
    category text not null,
    ingredients jsonb default '[]',
    dietary_tags jsonb default '[]',
    preparation_style jsonb default '[]',
    is_user_added boolean default false,
    added_by_user_id uuid references auth.users(id),
    added_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Remove price column from dishes table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dishes' AND column_name='price') THEN
        ALTER TABLE dishes DROP COLUMN price;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
    
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for public tables
DROP POLICY IF EXISTS "Anyone can view restaurants" ON restaurants;
CREATE POLICY "Anyone can view restaurants" ON restaurants
    FOR SELECT USING (true);
    
DROP POLICY IF EXISTS "Anyone can view parsed menus" ON parsed_menus;
CREATE POLICY "Anyone can view parsed menus" ON parsed_menus
    FOR SELECT USING (true);
    
DROP POLICY IF EXISTS "Anyone can view parsed dishes" ON parsed_dishes;
CREATE POLICY "Anyone can view parsed dishes" ON parsed_dishes
    FOR SELECT USING (true);
    
DROP POLICY IF EXISTS "Anyone can view dishes" ON dishes;
CREATE POLICY "Anyone can view dishes" ON dishes
    FOR SELECT USING (true);

-- Create policy for users to add dishes
DROP POLICY IF EXISTS "Users can add own parsed dishes" ON parsed_dishes;
CREATE POLICY "Users can add own parsed dishes" ON parsed_dishes
    FOR INSERT WITH CHECK (added_by_user_id IS NULL OR auth.uid() = added_by_user_id);

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_parsed_dishes_menu_id ON parsed_dishes(menu_id);
CREATE INDEX IF NOT EXISTS idx_parsed_dishes_category ON parsed_dishes(category);
CREATE INDEX IF NOT EXISTS idx_parsed_menus_restaurant_name ON parsed_menus(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- Success message
SELECT 'Supabase schema setup completed successfully!' as result;