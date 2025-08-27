#!/usr/bin/env python3
"""
Check what data is actually stored in the database.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL
from dotenv import load_dotenv

def check_supabase_data():
    """Check what data is actually stored in the database"""
    load_dotenv()
    
    print("🔍 Checking Supabase Data")
    print("=" * 50)
    
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Check parsed_menus table
            print("\n📋 Parsed Menus:")
            result = conn.execute(text("SELECT * FROM parsed_menus"))
            menus = result.fetchall()
            if menus:
                for menu in menus:
                    print(f"  - {menu.restaurant_name} ({menu.dish_count} dishes, parsed: {menu.parsed_at})")
            else:
                print("  No menus found")
            
            # Check parsed_dishes table
            print("\n🍽️ Parsed Dishes:")
            result = conn.execute(text("SELECT * FROM parsed_dishes"))
            dishes = result.fetchall()
            if dishes:
                print(f"  Total dishes: {len(dishes)}")
                for dish in dishes[:10]:  # Show first 10
                    print(f"  - {dish.name} (${dish.price}, {dish.category})")
                if len(dishes) > 10:
                    print(f"  ... and {len(dishes) - 10} more dishes")
            else:
                print("  No dishes found")
            
            # Check users table
            print("\n👥 Users:")
            result = conn.execute(text("SELECT * FROM users"))
            users = result.fetchall()
            if users:
                for user in users:
                    print(f"  - {user.email} (ID: {user.id})")
            else:
                print("  No users found")
            
            # Check if there are any restaurants in the places table
            print("\n🏪 Places/Restaurants:")
            try:
                result = conn.execute(text("SELECT * FROM places"))
                places = result.fetchall()
                if places:
                    for place in places[:5]:  # Show first 5
                        print(f"  - {place.name} ({place.cuisine_type})")
                    if len(places) > 5:
                        print(f"  ... and {len(places) - 5} more places")
                else:
                    print("  No places found")
            except Exception as e:
                print(f"  Places table error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking data: {e}")
        return False

if __name__ == "__main__":
    check_supabase_data()
