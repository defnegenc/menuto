#!/usr/bin/env python3
"""
Script to check what tables exist in Supabase and identify which ones we need
"""

from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

def check_supabase_tables():
    """Check what tables exist in Supabase"""
    try:
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        
        # Get list of tables by trying to query them
        tables_to_check = [
            'dishes', 'restaurants', 'users', 'reviews', 'user_ratings',
            'reviewer_profiles', 'parsed_menus', 'parsed_dishes', 'user_profiles'
        ]
        
        existing_tables = []
        for table in tables_to_check:
            try:
                result = supabase.table(table).select('count').execute()
                existing_tables.append(table)
                print(f"✅ {table} - exists")
            except Exception as e:
                if 'does not exist' in str(e) or 'PGRST205' in str(e):
                    print(f"❌ {table} - does not exist")
                else:
                    print(f"⚠️  {table} - exists but error: {e}")
                    existing_tables.append(table)
        
        print(f"\n📊 Summary:")
        print(f"Total tables found: {len(existing_tables)}")
        print(f"Existing tables: {existing_tables}")
        
        print(f"\n🎯 Tables we actually need for Menuto:")
        needed_tables = ['parsed_menus', 'parsed_dishes', 'user_profiles', 'restaurants']
        unnecessary_tables = [t for t in existing_tables if t not in needed_tables]
        
        print(f"Essential: {needed_tables}")
        print(f"Could remove: {unnecessary_tables}")
        
        return existing_tables, needed_tables, unnecessary_tables
        
    except Exception as e:
        print(f"Error checking tables: {e}")
        return [], [], []

if __name__ == "__main__":
    print("🔍 Checking Supabase Tables")
    print("=" * 50)
    check_supabase_tables()