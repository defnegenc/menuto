#!/usr/bin/env python3

"""
Migration script from SQLite to Supabase
Run this after setting up your Supabase project
"""

import os
from supabase import create_client, Client

def setup_supabase():
    """Setup Supabase connection and tables"""
    
    print("🚀 Setting up Supabase for Menuto...")
    
    # You'll get these from your Supabase dashboard
    supabase_url = input("Enter your Supabase URL: ")
    supabase_key = input("Enter your Supabase anon key: ")
    
    # Update .env file
    with open('.env', 'a') as f:
        f.write(f"\n\n# Supabase\n")
        f.write(f"SUPABASE_URL={supabase_url}\n")
        f.write(f"SUPABASE_KEY={supabase_key}\n")
    
    print("✅ Added Supabase credentials to .env")
    
    # Create SQL for tables
    sql_schema = """
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    preferred_cuisines JSONB,
    dietary_restrictions JSONB,
    spice_tolerance INTEGER,
    price_preference INTEGER,
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
    location POINT, -- For geographic queries
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dishes table 
CREATE TABLE dishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    category TEXT,
    ingredients JSONB,
    dietary_tags JSONB,
    preparation_style JSONB,
    avg_rating REAL,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User ratings
CREATE TABLE user_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    rating REAL NOT NULL,
    notes TEXT,
    saltiness INTEGER,
    spiciness INTEGER, 
    richness INTEGER,
    portion_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, dish_id)
);

-- Reviews from external APIs
CREATE TABLE reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    reviewer_external_id TEXT,
    platform TEXT, -- 'google' or 'yelp'
    rating REAL,
    text TEXT,
    sentiment_score REAL,
    extracted_attributes JSONB,
    preparation_feedback JSONB,
    context_tags JSONB,
    review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reviewer profiles for collaborative filtering
CREATE TABLE reviewer_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    external_id TEXT UNIQUE NOT NULL,
    platform TEXT,
    total_reviews INTEGER,
    avg_rating_given REAL,
    taste_vector JSONB,
    taste_cluster INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_places_google_id ON places(google_place_id);
CREATE INDEX idx_dishes_place ON dishes(place_id);
CREATE INDEX idx_ratings_user ON user_ratings(user_id);
CREATE INDEX idx_ratings_dish ON user_ratings(dish_id);
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_platform ON reviews(platform, reviewer_external_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY "Users can see their own profile" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);
"""
    
    # Save schema to file
    with open('supabase_schema.sql', 'w') as f:
        f.write(sql_schema)
    
    print("✅ Created supabase_schema.sql")
    print("\nNext steps:")
    print("1. Go to your Supabase dashboard")  
    print("2. Go to SQL Editor")
    print("3. Copy/paste the contents of supabase_schema.sql")
    print("4. Run the SQL to create tables")
    print("5. Run this script again to test connection")

def test_connection():
    """Test Supabase connection"""
    try:
        from supabase import create_client
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY") 
        
        if not url or not key:
            print("❌ Missing Supabase credentials in .env")
            return False
            
        supabase: Client = create_client(url, key)
        
        # Test query
        result = supabase.table("places").select("*").limit(1).execute()
        print("✅ Supabase connection successful!")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    if "--test" in os.sys.argv:
        test_connection()
    else:
        setup_supabase()