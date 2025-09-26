import os
import requests
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import openai
from dotenv import load_dotenv
import time
from functools import lru_cache
import hashlib

load_dotenv()

# Simple in-memory cache for menu data
MENU_CACHE = {}
CACHE_DURATION = 3600  # 1 hour in seconds

class MenuDataService:
    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        self.yelp_api_key = os.getenv("YELP_API_KEY")
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Initialize Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if supabase_url and supabase_key:
            self.supabase: Client = create_client(supabase_url, supabase_key)
        else:
            self.supabase = None
            print("⚠️ Supabase not configured, will use external APIs only")
        
        if not self.google_api_key:
            raise ValueError("Google Places API key not found")
    
    def get_restaurant_details_from_google(self, place_id: str) -> Dict[str, Any]:
        """Get detailed restaurant info from Google Places API"""
        try:
            url = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                'place_id': place_id,
                'fields': 'name,formatted_address,formatted_phone_number,website,reviews,photos,types,price_level,rating',
                'key': self.google_api_key
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if 'result' in data:
                return data['result']
            
            return {}
            
        except Exception as e:
            print(f"❌ Google Places API error: {str(e)}")
            return {}
    
    def search_yelp_business(self, restaurant_name: str, location: str = None) -> Optional[str]:
        """Find restaurant on Yelp and return business ID"""
        if not self.yelp_api_key or self.yelp_api_key == "your_yelp_api_key_here":
            print("⚠️  Yelp API key not configured")
            return None
            
        try:
            headers = {
                'Authorization': f'Bearer {self.yelp_api_key}',
            }
            
            params = {
                'term': restaurant_name,
                'limit': 5
            }
            
            if location:
                params['location'] = location
            
            response = requests.get('https://api.yelp.com/v3/businesses/search', 
                                  headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Find best match
            businesses = data.get('businesses', [])
            for business in businesses:
                if restaurant_name.lower() in business['name'].lower():
                    return business['id']
            
            # Return first result if no exact match
            if businesses:
                return businesses[0]['id']
                
            return None
            
        except Exception as e:
            print(f"❌ Yelp search error: {str(e)}")
            return None
    
    def get_yelp_business_details(self, business_id: str) -> Dict[str, Any]:
        """Get detailed business info from Yelp including menu if available"""
        if not self.yelp_api_key or self.yelp_api_key == "your_yelp_api_key_here":
            return {}
            
        try:
            headers = {
                'Authorization': f'Bearer {self.yelp_api_key}',
            }
            
            response = requests.get(f'https://api.yelp.com/v3/businesses/{business_id}', 
                                  headers=headers)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            print(f"❌ Yelp business details error: {str(e)}")
            return {}
    
    def extract_menu_items_from_reviews(self, reviews: List[str], restaurant_name: str) -> List[Dict[str, Any]]:
        """Use LLM to extract actual menu items mentioned in reviews"""
        if not reviews:
            return []
            
        # Combine reviews, limit to avoid token limits
        combined_reviews = "\n---\n".join(reviews[:8])
        
        prompt = f"""
        Extract ACTUAL menu items from these customer reviews for "{restaurant_name}".
        Focus on specific dishes that customers ordered and mentioned by name.
        
        Reviews:
        {combined_reviews}
        
        Return JSON array of menu items:
        [
          {{
            "name": "Chicken Tikka Masala",
            "description": "Creamy tomato curry with tender chicken",
            "category": "main", // starter, main, dessert, beverage, side
            "price_mentions": ["$18", "$19"], // any prices mentioned, or empty array
            "customer_sentiment": "positive", // positive/negative/mixed
            "mention_frequency": 3 // how many reviews mentioned it
          }}
        ]
        
        Rules:
        - Only include items that are clearly menu dishes (not "food" or "meal")
        - Include appetizers, mains, desserts, drinks, sides
        - Extract descriptions from what customers say about the dish
        - Ignore generic terms like "food", "dinner", "lunch"
        - Maximum 8 items
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a menu extraction expert. Extract only specific menu items mentioned in reviews. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=800
            )
            
            import json
            import re
            
            content = response.choices[0].message.content
            # Extract JSON array
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                menu_items = json.loads(json_match.group())
                
                # Clean and validate
                cleaned_items = []
                for item in menu_items:
                    if item.get('name') and len(item['name'].strip()) > 2:
                        # Extract price if mentioned
                        price = None
                        price_mentions = item.get('price_mentions', [])
                        if price_mentions:
                            # Try to extract numeric price from first mention
                            price_text = price_mentions[0]
                            price_match = re.search(r'(\d+\.?\d*)', price_text)
                            if price_match:
                                price = float(price_match.group(1))
                        
                        cleaned_item = {
                            'name': item['name'].strip(),
                            'description': item.get('description', '').strip()[:200],  # Limit description
                            'category': item.get('category', 'main'),
                            'price': price,
                            'customer_sentiment': item.get('customer_sentiment', 'positive'),
                            'mention_frequency': item.get('mention_frequency', 1),
                            'source': 'reviews'
                        }
                        cleaned_items.append(cleaned_item)
                
                return cleaned_items[:15]  # Max 15 items
            
            return []
            
        except Exception as e:
            print(f"❌ Menu extraction from reviews failed: {str(e)}")
            return []
    
    def get_restaurant_menu(self, place_id: str, restaurant_name: str) -> List[Dict[str, Any]]:
        """
        Get restaurant menu from multiple sources with caching:
        1. Our database (user-contributed)
        2. Google Places reviews (cached)
        3. Yelp (if available, cached)
        """
        print(f"🍽️  Getting menu for {restaurant_name}")
        
        # Check cache key
        cache_key = f"menu_{place_id}_{hashlib.md5(restaurant_name.encode()).hexdigest()}"
        current_time = time.time()
        
        # Check Supabase first (always fresh)
        if self.supabase:
            try:
                # Look for restaurant by name in parsed_menus
                menu_result = self.supabase.table("parsed_menus") \
                    .select("*") \
                    .ilike("restaurant_name", f"%{restaurant_name}%") \
                    .order("parsed_at", desc=True) \
                    .limit(1) \
                    .execute()
                
                if menu_result.data:
                    menu = menu_result.data[0]
                    menu_id = menu["id"]
                    
                    # Get dishes for this menu
                    dishes_result = self.supabase.table("parsed_dishes") \
                        .select("*") \
                        .eq("menu_id", menu_id) \
                        .execute()
                    
                    if dishes_result.data:
                        print(f"📋 Found {len(dishes_result.data)} dishes in Supabase")
                        return [
                            {
                                'id': dish['id'],
                                'name': dish['name'],
                                'description': dish.get('description', ''),
                                'price': dish.get('price'),
                                'category': dish.get('category', 'main'),
                                'dietary_tags': dish.get('dietary_tags', []),
                                'ingredients': dish.get('ingredients', []),
                                'avg_rating': dish.get('avg_rating', 4.0),
                                'source': 'supabase'
                            }
                            for dish in dishes_result.data
                        ]
            except Exception as e:
                print(f"❌ Supabase query failed: {str(e)}")
                # Continue to external APIs
        
        # Check cache for extracted menu items
        if cache_key in MENU_CACHE:
            cached_data, timestamp = MENU_CACHE[cache_key]
            if current_time - timestamp < CACHE_DURATION:
                print(f"💾 Using cached menu data ({len(cached_data)} items)")
                return cached_data
        
        # Get from Google Places reviews
        google_details = self.get_restaurant_details_from_google(place_id)
        reviews = []
        if 'reviews' in google_details:
            reviews = [review['text'] for review in google_details['reviews'][:10]]
            print(f"📝 Found {len(reviews)} Google reviews")
        
        menu_items = []
        
        if reviews:
            # Extract menu items from reviews
            extracted_items = self.extract_menu_items_from_reviews(reviews, restaurant_name)
            menu_items.extend(extracted_items)
            print(f"🍽️  Extracted {len(extracted_items)} items from Google reviews")
        
        # Try Yelp as additional source
        yelp_business_id = self.search_yelp_business(restaurant_name)
        if yelp_business_id:
            yelp_details = self.get_yelp_business_details(yelp_business_id)
            # Yelp doesn't typically have menu items in their API, but we could extract from their reviews too
            print(f"🔍 Found restaurant on Yelp: {yelp_business_id}")
        
        # Add unique IDs and clean up
        for i, item in enumerate(menu_items):
            item['id'] = f"extracted-{i}"
        
        # Cache the results
        MENU_CACHE[cache_key] = (menu_items, current_time)
        print(f"✅ Total menu items found: {len(menu_items)} (cached for 1 hour)")
        return menu_items
    
    def add_user_contributed_dish(
        self, 
        place_id: str, 
        restaurant_name: str, 
        dish_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Allow users to add missing menu items to Supabase"""
        if not self.supabase:
            return {
                'success': False,
                'message': 'Supabase not configured'
            }
        
        try:
            # For now, just return success - user contributions can be added later
            # This would require creating a user_contributions table in Supabase
            return {
                'success': True,
                'message': 'User contribution feature coming soon',
                'dish': {
                    'name': dish_data['name'],
                    'description': dish_data.get('description', ''),
                    'price': dish_data.get('price'),
                    'category': dish_data.get('category', 'main')
                }
            }
            
        except Exception as e:
            print(f"❌ Failed to add user-contributed dish: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to add dish: {str(e)}'
            }