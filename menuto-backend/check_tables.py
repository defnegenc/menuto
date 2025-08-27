#!/usr/bin/env python3
"""
Check if the new database tables exist.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, inspect
from app.database import DATABASE_URL
from app.models import Base
from dotenv import load_dotenv

def check_tables():
    """Check if all required tables exist"""
    load_dotenv()
    
    print("🔍 Checking Database Tables")
    print("=" * 50)
    
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        # Get all table names
        existing_tables = inspector.get_table_names()
        print(f"Existing tables: {existing_tables}")
        
        # Check for required tables
        required_tables = [
            'parsed_menus',
            'parsed_dishes',
            'users',
            'dishes',
            'places',
            'reviews',
            'user_ratings',
            'reviewer_profiles'
        ]
        
        print("\n📋 Required Tables Check:")
        for table in required_tables:
            if table in existing_tables:
                print(f"✅ {table}")
            else:
                print(f"❌ {table} - MISSING")
        
        # Check parsed_menus table structure
        if 'parsed_menus' in existing_tables:
            print("\n📊 Parsed Menus Table Structure:")
            columns = inspector.get_columns('parsed_menus')
            for column in columns:
                print(f"  - {column['name']}: {column['type']}")
        
        # Check parsed_dishes table structure
        if 'parsed_dishes' in existing_tables:
            print("\n📊 Parsed Dishes Table Structure:")
            columns = inspector.get_columns('parsed_dishes')
            for column in columns:
                print(f"  - {column['name']}: {column['type']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

if __name__ == "__main__":
    check_tables()
