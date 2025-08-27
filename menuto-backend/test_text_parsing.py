#!/usr/bin/env python3
"""
Test plain text parsing to debug the issue.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json

def test_text_parsing():
    """Test the text parsing endpoint"""
    print("🧪 Testing Text Parsing")
    print("=" * 50)
    
    base_url = "http://localhost:8080"
    
    # Test with simple menu text
    test_menu_text = """
    BREAKFAST
    Grapefruit and Yogurt 15
    grapefruit and mint, lebanese yogurt, granola and honey
    Rosewater Waffle 19
    topped with lebanese yogurt, mixed berries and honey syrup
    Madame Freda 25
    pressed sandwich with duck prosciutto, cheddar béchamel, gruyère & a sunny side up egg
    """
    
    data = {
        'menu_text': test_menu_text,
        'restaurant_name': 'Test Restaurant 2',
        'restaurant_url': ''
    }
    
    print(f"Menu text length: {len(test_menu_text)} characters")
    print(f"Restaurant: {data['restaurant_name']}")
    
    try:
        print("\nMaking API call...")
        response = requests.post(f"{base_url}/menu-parsing/parse-text", data=data)
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Parsed {result.get('count', 0)} dishes")
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_text_parsing()
