-- Menuto App - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Users table (Supabase auth handles this automatically)
-- We'll extend with a user_profiles table

CREATE TABLE user_profiles (
    id uuid references auth.users on delete cascade,
    preferred_cuisines jsonb default '[]',
    dietary_restrictions jsonb default '[]',
    spice_tolerance integer default 3,
    price_preference integer default 2,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (id)
);

CREATE TABLE restaurants (
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

CREATE TABLE parsed_menus (
    id bigserial primary key,
    restaurant_name text not null,
    restaurant_url text not null default '',
    menu_url text not null default '',
    parsed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    dish_count integer default 0
);

CREATE TABLE parsed_dishes (
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

CREATE TABLE dishes (
    id bigserial primary key,
    restaurant_id bigint references restaurants(id) on delete cascade,
    name text not null,
    description text,
    category text,
    ingredients jsonb default '[]',
    dietary_tags jsonb default '[]',
    preparation_style jsonb default '[]',
    avg_rating real,
    total_reviews integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
    
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Public read access for restaurants and menus (with optional user-specific data)
CREATE POLICY "Anyone can view restaurants" ON restaurants
    FOR SELECT USING (true);
    
CREATE POLICY "Anyone can view parsed menus" ON parsed_menus
    FOR SELECT USING (true);
    
CREATE POLICY "Anyone can view parsed dishes" ON parsed_dishes
    FOR SELECT USING (true);
    
CREATE POLICY "Anyone can view dishes" ON dishes
    FOR SELECT USING (true);

-- Users can add their own dishes
CREATE POLICY "Users can add own parsed dishes" ON parsed_dishes
    FOR INSERT WITH CHECK (added_by_user_id IS NULL OR auth.uid() = added_by_user_id);

-- Create indexes for better performance
CREATE INDEX idx_parsed_dishes_menu_id ON parsed_dishes(menu_id);
CREATE INDEX idx_parsed_dishes_category ON parsed_dishes(category);
CREATE INDEX idx_parsed_menus_restaurant_name ON parsed_menus(restaurant_name);
CREATE INDEX idx_restaurants_google_place_id ON restaurants(google_place_id);
CREATE INDEX idx_dishes_restaurant_id ON dishes(restaurant_id);
CREATE INDEX idx_user_profiles_id ON user_profiles(id);