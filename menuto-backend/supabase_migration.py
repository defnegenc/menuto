#!/usr/bin/env python3
"""
Migration script to move data from SQLite to Supabase and set up the schema.
"""

import sqlite3
import json
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def create_supabase_client() -> Client:
    """Create and return Supabase client"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def create_supabase_tables(supabase: Client):
    """Create tables in Supabase using SQL"""
    
    # Note: These would typically be run as Supabase SQL migrations
    # For now, we'll document the schema that needs to be created in Supabase Dashboard
    
    sql_schema = """
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
    """
    
    print("Schema SQL for Supabase:")
    print(sql_schema)
    return sql_schema

def migrate_sqlite_to_supabase():
    """Migrate data from SQLite to Supabase"""
    
    # Connect to SQLite
    sqlite_db = sqlite3.connect('menuto.db')
    sqlite_db.row_factory = sqlite3.Row
    cursor = sqlite_db.cursor()
    
    # Connect to Supabase
    supabase = create_supabase_client()
    
    print("Starting migration...")
    
    # Clear existing data first
    print("Clearing existing Supabase data...")
    try:
        supabase.table('parsed_dishes').delete().neq('id', 0).execute()
        supabase.table('parsed_menus').delete().neq('id', 0).execute() 
        supabase.table('restaurants').delete().neq('id', 0).execute()
        print("✅ Cleared existing data")
    except Exception as e:
        print(f"⚠️  Warning: Could not clear existing data: {e}")
    
    try:
        # Migrate parsed_menus
        print("Migrating parsed_menus...")
        cursor.execute("SELECT * FROM parsed_menus")
        menus = cursor.fetchall()
        
        for menu in menus:
            menu_data = {
                'id': menu['id'],
                'restaurant_name': menu['restaurant_name'],
                'restaurant_url': menu['restaurant_url'] or '',
                'menu_url': menu['menu_url'] or '',
                'parsed_at': menu['parsed_at'],
                'dish_count': menu['dish_count']
            }
            
            result = supabase.table('parsed_menus').insert(menu_data).execute()
            print(f"Migrated menu: {menu['restaurant_name']}")
        
        # Migrate parsed_dishes
        print("Migrating parsed_dishes...")
        cursor.execute("SELECT * FROM parsed_dishes")
        dishes = cursor.fetchall()
        
        for dish in dishes:
            dish_data = {
                'id': dish['id'],
                'menu_id': dish['menu_id'],
                'name': dish['name'],
                'description': dish['description'],
                'category': dish['category'],
                'ingredients': json.loads(dish['ingredients']) if dish['ingredients'] else [],
                'dietary_tags': json.loads(dish['dietary_tags']) if dish['dietary_tags'] else [],
                'preparation_style': json.loads(dish['preparation_style']) if dish['preparation_style'] else [],
                'is_user_added': bool(dish['is_user_added']),
                'added_at': dish['added_at']
            }
            
            result = supabase.table('parsed_dishes').insert(dish_data).execute()
            
        print(f"Migrated {len(dishes)} dishes")
        
        # Migrate restaurants if they exist
        try:
            cursor.execute("SELECT * FROM restaurants")
            restaurants = cursor.fetchall()
            
            if restaurants:
                print("Migrating restaurants...")
                for restaurant in restaurants:
                    restaurant_data = {
                        'id': restaurant['id'],
                        'name': restaurant['name'],
                        'address': restaurant['address'],
                        'cuisine_type': restaurant['cuisine_type'],
                        'google_place_id': restaurant['google_place_id'],
                        'yelp_business_id': restaurant['yelp_business_id'],
                        'avg_rating': restaurant['avg_rating'],
                        'price_level': restaurant['price_level'],
                        'created_at': restaurant['created_at']
                    }
                    
                    result = supabase.table('restaurants').insert(restaurant_data).execute()
                    
                print(f"Migrated {len(restaurants)} restaurants")
        except sqlite3.OperationalError:
            print("No restaurants table found, skipping...")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        sqlite_db.close()

def test_supabase_connection():
    """Test connection to Supabase"""
    try:
        supabase = create_supabase_client()
        
        # Test a simple query
        result = supabase.table('parsed_menus').select('count').execute()
        print(f"✅ Supabase connection successful")
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Supabase Migration Tool")
    print("=" * 50)
    
    # Check if Supabase credentials are configured
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing Supabase credentials in .env file")
        exit(1)
    
    print(f"Supabase URL: {SUPABASE_URL}")
    
    # Test connection
    if not test_supabase_connection():
        print("Please create the tables in Supabase first!")
        print("\n1. Go to your Supabase Dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Run the schema SQL that will be printed below:")
        print()
        create_supabase_tables(None)
        exit(1)
    
    # Run migration
    migrate_sqlite_to_supabase()