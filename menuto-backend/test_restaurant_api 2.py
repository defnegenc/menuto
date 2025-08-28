#!/usr/bin/env python3
"""
Test the restaurant API endpoint to see if it's working correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json

def test_restaurant_api():
    """Test the restaurant API endpoint"""
    print("🧪 Testing Restaurant API")
    print("=" * 50)
    
    base_url = "http://localhost:8080"
    
    # Test with a restaurant that doesn't exist
    test_restaurant = "Non Existent Restaurant 12345"
    
    print(f"Testing restaurant: {test_restaurant}")
    
    try:
        print("\nMaking API call...")
        response = requests.get(f"{base_url}/menu-parsing/restaurant/{test_restaurant}")
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 404:
            print("✅ Expected 404 for non-existent restaurant")
        elif response.status_code == 200:
            result = response.json()
            print(f"✅ Got 200 response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_restaurant_api()
