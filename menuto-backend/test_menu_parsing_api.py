#!/usr/bin/env python3
"""
Test the menu parsing API endpoints.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json

# Test the menu parsing API
def test_menu_parsing_api():
    """Test the menu parsing API endpoints"""
    print("🧪 Testing Menu Parsing API")
    print("=" * 50)
    
    base_url = "http://localhost:8080"
    
    # Test 1: Get restaurant menu (should return 404 for non-existent restaurant)
    print("\n1. Testing GET /menu-parsing/restaurant/{restaurant_name}")
    try:
        response = requests.get(f"{base_url}/menu-parsing/restaurant/Test%20Restaurant")
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            print("✅ Expected 404 for non-existent restaurant")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Parse menu from text
    print("\n2. Testing POST /menu-parsing/parse-text")
    try:
        test_menu_text = """
        BREAKFAST
        Grapefruit and Yogurt 15
        grapefruit and mint, lebanese yogurt, granola and honey
        Rosewater Waffle 19
        topped with lebanese yogurt, mixed berries and honey syrup
        """
        
        data = {
            'menu_text': test_menu_text,
            'restaurant_name': 'Test Restaurant',
            'restaurant_url': ''
        }
        
        response = requests.post(f"{base_url}/menu-parsing/parse-text", data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Parsed {result.get('count', 0)} dishes")
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Get restaurant menu again (should now return the parsed menu)
    print("\n3. Testing GET /menu-parsing/restaurant/{restaurant_name} (after parsing)")
    try:
        response = requests.get(f"{base_url}/menu-parsing/restaurant/Test%20Restaurant")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Found menu with {result.get('total_dishes', 0)} dishes")
            print(f"Categories: {list(result.get('categories', {}).keys())}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_menu_parsing_api()
