-- Menuto App - Supabase Database Schema (Missing Tables Only)
-- Run this in your Supabase SQL Editor

-- Only create tables that don't exist yet

-- Check if user_profiles exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
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
    END IF;
END $$;

-- Check if restaurants exists, if not create it  
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurants') THEN
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
    END IF;
END $$;

-- Check if parsed_menus exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_menus') THEN
        CREATE TABLE parsed_menus (
            id bigserial primary key,
            restaurant_name text not null,
            restaurant_url text not null default '',
            menu_url text not null default '',
            parsed_at timestamp with time zone default timezone('utc'::text, now()) not null,
            dish_count integer default 0
        );
    END IF;
END $$;

-- Check if parsed_dishes exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_dishes') THEN
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
    END IF;
END $$;

-- Update existing dishes table to remove price column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dishes' AND column_name='price') THEN
        ALTER TABLE dishes DROP COLUMN price;
    END IF;
END $$;

-- Add missing columns to dishes table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dishes' AND column_name='ingredients') THEN
        ALTER TABLE dishes ADD COLUMN ingredients jsonb default '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dishes' AND column_name='dietary_tags') THEN
        ALTER TABLE dishes ADD COLUMN dietary_tags jsonb default '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dishes' AND column_name='preparation_style') THEN
        ALTER TABLE dishes ADD COLUMN preparation_style jsonb default '[]';
    END IF;
END $$;

-- Enable Row Level Security on all tables
DO $$
BEGIN
    -- Enable RLS only if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_profiles' AND relrowsecurity = true) THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_menus') THEN
        ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_dishes') THEN
        ALTER TABLE parsed_dishes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
    END IF;
    
    ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
END $$;

-- Create policies (only if they don't exist)
DO $$
BEGIN
    -- User profiles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON user_profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    
    -- Public access policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Anyone can view restaurants') THEN
            CREATE POLICY "Anyone can view restaurants" ON restaurants
                FOR SELECT USING (true);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_menus') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parsed_menus' AND policyname = 'Anyone can view parsed menus') THEN
            CREATE POLICY "Anyone can view parsed menus" ON parsed_menus
                FOR SELECT USING (true);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_dishes') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parsed_dishes' AND policyname = 'Anyone can view parsed dishes') THEN
            CREATE POLICY "Anyone can view parsed dishes" ON parsed_dishes
                FOR SELECT USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parsed_dishes' AND policyname = 'Users can add own parsed dishes') THEN
            CREATE POLICY "Users can add own parsed dishes" ON parsed_dishes
                FOR INSERT WITH CHECK (added_by_user_id IS NULL OR auth.uid() = added_by_user_id);
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dishes' AND policyname = 'Anyone can view dishes') THEN
        CREATE POLICY "Anyone can view dishes" ON dishes
            FOR SELECT USING (true);
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_dishes') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parsed_dishes_menu_id') THEN
            CREATE INDEX idx_parsed_dishes_menu_id ON parsed_dishes(menu_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parsed_dishes_category') THEN
            CREATE INDEX idx_parsed_dishes_category ON parsed_dishes(category);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parsed_menus') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parsed_menus_restaurant_name') THEN
            CREATE INDEX idx_parsed_menus_restaurant_name ON parsed_menus(restaurant_name);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_restaurants_google_place_id') THEN
            CREATE INDEX idx_restaurants_google_place_id ON restaurants(google_place_id);
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dishes_restaurant_id') THEN
        CREATE INDEX idx_dishes_restaurant_id ON dishes(restaurant_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_id') THEN
            CREATE INDEX idx_user_profiles_id ON user_profiles(id);
        END IF;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Supabase schema setup completed successfully!';
END $$;