-- Menuto App - Simplified Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid references auth.users on delete cascade,
    name text,
    email text,
    preferred_cuisines jsonb default '[]',
    dietary_restrictions jsonb default '[]',
    spice_tolerance integer default 3,
    price_preference integer default 2,
    favorite_restaurants jsonb default '[]',
    top_3_restaurants jsonb default '[]',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (id)
);

-- Create restaurants table if it doesn't exist
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

-- Create user_favorite_dishes table for storing favorite dishes
CREATE TABLE IF NOT EXISTS user_favorite_dishes (
    id bigserial primary key,
    user_id uuid references auth.users(id) on delete cascade,
    restaurant_id text not null, -- Google Place ID
    dish_name text not null,
    dish_description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, restaurant_id, dish_name)
);

-- Create parsed_menus table if it doesn't exist
CREATE TABLE IF NOT EXISTS parsed_menus (
    id bigserial primary key,
    restaurant_name text not null,
    restaurant_url text not null default '',
    menu_url text not null default '',
    parsed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    dish_count integer default 0
);

-- Create parsed_dishes table if it doesn't exist
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

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_dishes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles (drop if exists first)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for user_favorite_dishes (drop if exists first)
DROP POLICY IF EXISTS "Users can view own favorite dishes" ON user_favorite_dishes;
CREATE POLICY "Users can view own favorite dishes" ON user_favorite_dishes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorite dishes" ON user_favorite_dishes;
CREATE POLICY "Users can insert own favorite dishes" ON user_favorite_dishes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own favorite dishes" ON user_favorite_dishes;
CREATE POLICY "Users can update own favorite dishes" ON user_favorite_dishes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorite dishes" ON user_favorite_dishes;
CREATE POLICY "Users can delete own favorite dishes" ON user_favorite_dishes
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for restaurants (public read access) - drop if exists first
DROP POLICY IF EXISTS "Anyone can view restaurants" ON restaurants;
CREATE POLICY "Anyone can view restaurants" ON restaurants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert restaurants" ON restaurants;
CREATE POLICY "Anyone can insert restaurants" ON restaurants
    FOR INSERT WITH CHECK (true);

-- Create policies for parsed_menus (public read access) - drop if exists first
DROP POLICY IF EXISTS "Anyone can view parsed menus" ON parsed_menus;
CREATE POLICY "Anyone can view parsed menus" ON parsed_menus
    FOR SELECT USING (true);

-- Create policies for parsed_dishes (public read access) - drop if exists first
DROP POLICY IF EXISTS "Anyone can view parsed dishes" ON parsed_dishes;
CREATE POLICY "Anyone can view parsed dishes" ON parsed_dishes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add own parsed dishes" ON parsed_dishes;
CREATE POLICY "Users can add own parsed dishes" ON parsed_dishes
    FOR INSERT WITH CHECK (added_by_user_id IS NULL OR auth.uid() = added_by_user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_dishes_user_id ON user_favorite_dishes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_dishes_restaurant_id ON user_favorite_dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_parsed_dishes_menu_id ON parsed_dishes(menu_id);
CREATE INDEX IF NOT EXISTS idx_parsed_menus_restaurant_name ON parsed_menus(restaurant_name);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Simplified Supabase schema setup completed successfully!';
END $$;