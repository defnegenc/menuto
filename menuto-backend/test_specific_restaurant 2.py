#!/usr/bin/env python3
"""
Test the specific restaurant endpoint that's causing the 404 error.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json

def test_specific_restaurant():
    """Test the specific restaurant endpoint"""
    print("🧪 Testing Specific Restaurant Endpoint")
    print("=" * 50)
    
    base_url = "http://localhost:8080"
    
    # Test with a restaurant that exists in the database
    test_restaurant = "Test Restaurant"
    
    print(f"Testing restaurant: {test_restaurant}")
    
    try:
        print("\nMaking API call to menu-parsing endpoint...")
        response = requests.get(f"{base_url}/menu-parsing/restaurant/{test_restaurant}")
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Found menu with {result.get('total_dishes', 0)} dishes")
            print(f"Categories: {list(result.get('categories', {}).keys())}")
        elif response.status_code == 404:
            print("❌ 404 - No menu found")
            print(f"Response: {response.text}")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_specific_restaurant()
