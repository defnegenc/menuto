#!/usr/bin/env python3

import os

def add_supabase_to_env():
    """Add Supabase credentials to .env file"""
    
    print("🚀 Setting up Supabase for Menuto...")
    print()
    print("Go to your Supabase dashboard:")
    print("1. Project Settings → API")
    print("2. Copy the URL and anon key")
    print()
    
    url = input("Enter your Supabase URL (https://xxx.supabase.co): ").strip()
    key = input("Enter your Supabase anon key: ").strip()
    
    if not url or not key:
        print("❌ Missing URL or key")
        return False
    
    # Add to .env file
    with open('.env', 'a') as f:
        f.write(f"\n\n# Supabase\n")
        f.write(f"SUPABASE_URL={url}\n")
        f.write(f"SUPABASE_KEY={key}\n")
    
    print("✅ Added Supabase credentials to .env")
    return True

def create_schema_file():
    """Create the SQL schema for Supabase"""
    
    schema_sql = """-- Menuto Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    preferred_cuisines JSONB DEFAULT '[]',
    dietary_restrictions JSONB DEFAULT '[]',
    spice_tolerance INTEGER DEFAULT 3,
    price_preference INTEGER DEFAULT 2,
    taste_vector JSONB,
    taste_cluster INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Places table (Google Places integration)
CREATE TABLE places (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    google_place_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    cuisine_type TEXT,
    price_level INTEGER,
    rating REAL,
    phone_number TEXT,
    website TEXT,
    location_lat REAL,
    location_lng REAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dishes table 
CREATE TABLE dishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    category TEXT CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage', 'starter')),
    ingredients JSONB DEFAULT '[]',
    dietary_tags JSONB DEFAULT '[]',
    preparation_style JSONB DEFAULT '[]',
    avg_rating REAL DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User ratings
CREATE TABLE user_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    rating REAL NOT NULL CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    saltiness INTEGER CHECK (saltiness >= 1 AND saltiness <= 5),
    spiciness INTEGER CHECK (spiciness >= 1 AND spiciness <= 5), 
    richness INTEGER CHECK (richness >= 1 AND richness <= 5),
    portion_size INTEGER CHECK (portion_size >= 1 AND portion_size <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, dish_id)
);

-- Reviews from external APIs (Google Places)
CREATE TABLE reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    reviewer_external_id TEXT,
    platform TEXT DEFAULT 'google',
    rating REAL,
    text TEXT,
    sentiment_score REAL,
    extracted_attributes JSONB DEFAULT '[]',
    preparation_feedback JSONB DEFAULT '{}',
    context_tags JSONB DEFAULT '[]',
    review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reviewer profiles for collaborative filtering
CREATE TABLE reviewer_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    external_id TEXT NOT NULL,
    platform TEXT DEFAULT 'google',
    total_reviews INTEGER DEFAULT 0,
    avg_rating_given REAL,
    taste_vector JSONB DEFAULT '{}',
    taste_cluster INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(external_id, platform)
);

-- Create indexes for performance
CREATE INDEX idx_places_google_id ON places(google_place_id);
CREATE INDEX idx_places_location ON places(location_lat, location_lng);
CREATE INDEX idx_dishes_place ON dishes(place_id);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_ratings_user ON user_ratings(user_id);
CREATE INDEX idx_ratings_dish ON user_ratings(dish_id);
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_platform ON reviews(platform, reviewer_external_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can see their own profile" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for places and dishes (restaurants are public)
CREATE POLICY "Anyone can read places" ON places
    FOR SELECT USING (true);

CREATE POLICY "Anyone can read dishes" ON dishes
    FOR SELECT USING (true);

CREATE POLICY "Anyone can read reviews" ON reviews
    FOR SELECT USING (true);

-- Insert some sample data for testing
INSERT INTO users (id, email, preferred_cuisines, spice_tolerance, price_preference) VALUES
    ('00000000-0000-0000-0000-000000000001', 'test@menuto.com', '["italian", "japanese"]', 3, 2);

INSERT INTO places (id, google_place_id, name, address, cuisine_type, price_level, rating) VALUES
    ('00000000-0000-0000-0000-000000000001', 'test_place_id_123', 'Test Italian Restaurant', '123 Main St, San Francisco, CA', 'italian', 2, 4.2);

INSERT INTO dishes (place_id, name, description, price, category, ingredients, dietary_tags) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Margherita Pizza', 'Fresh tomato, mozzarella, basil', 18.0, 'main', '["tomato", "mozzarella", "basil"]', '["vegetarian"]'),
    ('00000000-0000-0000-0000-000000000001', 'Spaghetti Carbonara', 'Eggs, cheese, pancetta, black pepper', 22.0, 'main', '["pasta", "eggs", "cheese", "pancetta"]', '[]'),
    ('00000000-0000-0000-0000-000000000001', 'Caesar Salad', 'Romaine, parmesan, croutons, caesar dressing', 14.0, 'starter', '["romaine", "parmesan", "croutons"]', '["vegetarian"]');

-- Success message
SELECT 'Menuto database schema created successfully! 🎉' as message;"""

    with open('supabase_schema.sql', 'w') as f:
        f.write(schema_sql)
    
    print("✅ Created supabase_schema.sql")
    return True

def test_connection():
    """Test Supabase connection"""
    try:
        from supabase import create_client
        from dotenv import load_dotenv
        
        load_dotenv()  # Reload .env with new credentials
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY") 
        
        if not url or not key:
            print("❌ Missing Supabase credentials in .env")
            return False
            
        supabase = create_client(url, key)
        
        # Test query
        result = supabase.table("places").select("*").limit(1).execute()
        print("✅ Supabase connection successful!")
        print(f"   Found {len(result.data)} test places")
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        print("Make sure you ran the SQL schema in your Supabase dashboard first!")
        return False

if __name__ == "__main__":
    print("🚀 SUPABASE SETUP FOR MENUTO")
    print("="*40)
    
    # Step 1: Add credentials
    if add_supabase_to_env():
        print()
        
        # Step 2: Create schema file
        if create_schema_file():
            print()
            print("📋 NEXT STEPS:")
            print("1. Go to your Supabase dashboard")  
            print("2. Click 'SQL Editor'")
            print("3. Copy/paste the contents of 'supabase_schema.sql'")
            print("4. Click 'Run' to create the tables")
            print("5. Then run: python setup_supabase.py --test")
            print()
            
            # Ask if they want to test now
            test_now = input("Did you already run the SQL? Test connection now? (y/n): ").strip().lower()
            if test_now in ['y', 'yes']:
                test_connection()
    
    # Test mode
    if "--test" in os.sys.argv:
        test_connection()