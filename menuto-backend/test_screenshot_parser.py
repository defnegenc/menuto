#!/usr/bin/env python3
"""
Test script for screenshot menu parser
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.screenshot_menu_parser import ScreenshotMenuParser

def test_screenshot_parser():
    """Test the screenshot parser with a sample image"""
    
    # Initialize parser
    parser = ScreenshotMenuParser()
    
    # Test with a sample image (you'll need to provide one)
    test_image_path = "test_menu.jpg"  # Replace with actual test image
    
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        print("Please provide a test menu image named 'test_menu.jpg'")
        return
    
    print("🧪 Testing screenshot menu parser...")
    print(f"📸 Using test image: {test_image_path}")
    
    try:
        # Parse the image
        result = parser.parse_menu_screenshot(test_image_path, "Test Restaurant")
        
        if result["success"]:
            print(f"✅ Successfully parsed {result['count']} dishes!")
            print(f"📋 Restaurant: {result['restaurant']}")
            print(f"💬 Message: {result['message']}")
            
            # Show first few dishes
            print("\n🍽️  Sample dishes:")
            for i, dish in enumerate(result['dishes'][:5]):
                print(f"  {i+1}. {dish['name']} - {dish['category']}")
                if dish.get('description'):
                    print(f"     {dish['description'][:50]}...")
            
            if len(result['dishes']) > 5:
                print(f"  ... and {len(result['dishes']) - 5} more dishes")
                
        else:
            print(f"❌ Parsing failed: {result['message']}")
            
    except Exception as e:
        print(f"❌ Error during parsing: {e}")

if __name__ == "__main__":
    test_screenshot_parser()
