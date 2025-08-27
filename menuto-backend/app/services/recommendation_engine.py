import openai
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Restaurant, Dish
import requests
from dotenv import load_dotenv

load_dotenv()

class RecommendationEngine:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        google_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        
        if not api_key:
            raise ValueError("OpenAI API key not found")
        if not google_api_key:
            raise ValueError("Google Places API key not found")
            
        self.client = openai.OpenAI(api_key=api_key)
        self.google_api_key = google_api_key
    
    def analyze_user_taste_profile(self, favorite_dishes: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Use LLM to analyze user's favorite dishes and create a taste profile
        """
        if not favorite_dishes:
            return {"cuisine_preferences": [], "flavor_profile": "", "dish_types": []}
            
        dishes_text = "\n".join([
            f"- {dish['dish_name']} from {dish.get('restaurant_name', 'unknown restaurant')}"
            for dish in favorite_dishes
        ])
        
        prompt = f"""
        Analyze these favorite dishes to understand this person's taste preferences:
        
        {dishes_text}
        
        Return a JSON object with:
        {{
          "cuisine_preferences": ["italian", "japanese"], // preferred cuisines
          "flavor_profile": "loves rich, creamy sauces and umami flavors", // brief description
          "dish_types": ["pasta", "seafood", "grilled_meats"], // types of dishes they like
          "dietary_patterns": ["prefers_cooked_over_raw", "enjoys_cheese"], // patterns observed
          "spice_tolerance": "medium" // low/medium/high based on dishes
        }}
        
        Be concise and focus on clear patterns.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a food taste analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=300
            )
            
            import json
            import re
            
            response_content = response.choices[0].message.content
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # Fallback
                return {"cuisine_preferences": [], "flavor_profile": "varied tastes", "dish_types": []}
                
        except Exception as e:
            print(f"❌ Taste analysis failed: {str(e)}")
            return {"cuisine_preferences": [], "flavor_profile": "varied tastes", "dish_types": []}
    
    def get_restaurant_reviews(self, place_id: str, restaurant_name: str) -> List[str]:
        """
        Get restaurant reviews from Google Places API
        """
        try:
            # Get place details with reviews
            url = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                'place_id': place_id,
                'fields': 'reviews,name,types',
                'key': self.google_api_key
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if 'result' in data and 'reviews' in data['result']:
                # Extract review texts, focusing on recent ones
                reviews = []
                for review in data['result']['reviews'][:10]:  # Get up to 10 reviews
                    if len(review['text']) > 50:  # Only meaningful reviews
                        reviews.append(review['text'])
                return reviews
            
            return []
            
        except Exception as e:
            print(f"❌ Failed to get reviews for {restaurant_name}: {str(e)}")
            return []
    
    def extract_popular_dishes_from_reviews(self, reviews: List[str], restaurant_name: str) -> List[Dict[str, Any]]:
        """
        Use LLM to extract mentioned dishes from restaurant reviews
        """
        if not reviews:
            return []
            
        reviews_text = "\n---\n".join(reviews[:5])  # Limit to 5 reviews to avoid token limits
        
        prompt = f"""
        Analyze these restaurant reviews for "{restaurant_name}" and extract dishes that customers mention positively:
        
        {reviews_text}
        
        Return a JSON array of popular dishes mentioned:
        [
          {{
            "name": "Chicken Tikka Masala",
            "description": "Creamy tomato curry with tender chicken",
            "sentiment": "positive", // positive/negative/neutral
            "mention_count": 3, // how many reviews mentioned it
            "price_estimate": 18 // rough estimate in USD, or null if unknown
          }}
        ]
        
        Only include dishes mentioned positively by customers. Focus on specific menu items, not general categories.
        Maximum 8 dishes.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a restaurant review analyst. Extract specific dishes mentioned in reviews. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=600
            )
            
            import json
            import re
            
            response_content = response.choices[0].message.content
            # Extract JSON array from response
            json_match = re.search(r'\[.*\]', response_content, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                dishes = json.loads(json_str)
                
                # Clean and validate
                cleaned_dishes = []
                for dish in dishes:
                    if dish.get('name') and dish.get('sentiment') == 'positive':
                        cleaned_dish = {
                            'name': dish['name'].strip(),
                            'description': dish.get('description', '').strip(),
                            'price': dish.get('price_estimate'),
                            'popularity_score': dish.get('mention_count', 1),
                            'category': 'main'  # Default category
                        }
                        cleaned_dishes.append(cleaned_dish)
                
                return cleaned_dishes[:8]  # Max 8 dishes
            
            return []
            
        except Exception as e:
            print(f"❌ Dish extraction failed: {str(e)}")
            return []
    
    def calculate_dish_similarity(self, user_taste_profile: Dict[str, Any], dish: Dict[str, Any]) -> float:
        """
        Calculate how well a dish matches the user's taste profile (0-1 score)
        """
        score = 0.5  # Base score
        
        # Check cuisine preferences
        dish_name = dish.get('name', '').lower()
        dish_desc = dish.get('description', '').lower()
        
        for cuisine in user_taste_profile.get('cuisine_preferences', []):
            if cuisine.lower() in dish_name or cuisine.lower() in dish_desc:
                score += 0.2
        
        # Check dish types
        for dish_type in user_taste_profile.get('dish_types', []):
            if dish_type.lower() in dish_name or dish_type.lower() in dish_desc:
                score += 0.15
        
        # Check flavor patterns
        flavor_profile = user_taste_profile.get('flavor_profile', '').lower()
        if 'creamy' in flavor_profile and ('cream' in dish_desc or 'creamy' in dish_desc):
            score += 0.1
        if 'spicy' in flavor_profile and ('spicy' in dish_desc or 'hot' in dish_desc):
            score += 0.1
        if 'seafood' in flavor_profile and ('fish' in dish_desc or 'seafood' in dish_desc or 'salmon' in dish_desc):
            score += 0.15
            
        # Boost by popularity
        popularity = dish.get('popularity_score', 1)
        if popularity > 2:
            score += 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def generate_recommendations(
        self, 
        restaurant_place_id: str, 
        restaurant_name: str,
        user_favorite_dishes: List[Dict[str, str]],
        user_dietary_constraints: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate recommendations for a restaurant based on user's taste profile
        """
        print(f"🍽️  Generating recommendations for {restaurant_name}")
        
        # Step 1: Analyze user's taste profile
        taste_profile = self.analyze_user_taste_profile(user_favorite_dishes)
        print(f"👤 User taste profile: {taste_profile}")
        
        # Step 2: Get restaurant reviews and extract popular dishes
        reviews = self.get_restaurant_reviews(restaurant_place_id, restaurant_name)
        print(f"📝 Found {len(reviews)} reviews")
        
        popular_dishes = self.extract_popular_dishes_from_reviews(reviews, restaurant_name)
        print(f"🍽️  Extracted {len(popular_dishes)} popular dishes")
        
        if not popular_dishes:
            return []
        
        # Step 3: Score dishes based on user taste profile
        scored_dishes = []
        for dish in popular_dishes:
            similarity_score = self.calculate_dish_similarity(taste_profile, dish)
            
            # Filter by dietary constraints
            if user_dietary_constraints:
                dish_text = f"{dish.get('name', '')} {dish.get('description', '')}".lower()
                
                # Simple dietary filtering
                if 'vegetarian' in user_dietary_constraints and any(
                    meat in dish_text for meat in ['chicken', 'beef', 'pork', 'lamb', 'meat', 'fish', 'seafood']
                ):
                    continue
                    
                if 'vegan' in user_dietary_constraints and any(
                    animal_product in dish_text for animal_product in ['cheese', 'cream', 'butter', 'egg', 'milk', 'chicken', 'beef', 'pork', 'fish']
                ):
                    continue
            
            scored_dishes.append({
                'id': f"rec-{len(scored_dishes)}",
                'name': dish['name'],
                'description': dish.get('description', ''),
                'price': dish.get('price'),
                'category': dish.get('category', 'main'),
                'avg_rating': 4.0 + (similarity_score * 1.0),  # Scale 4.0-5.0
                'dietary_tags': [],
                'ingredients': [],
                'similarity_score': similarity_score,
                'recommendation_reason': self._generate_recommendation_reason(dish, taste_profile)
            })
        
        # Sort by similarity score and return top 5
        scored_dishes.sort(key=lambda x: x['similarity_score'], reverse=True)
        return scored_dishes[:5]
    
    def _generate_recommendation_reason(self, dish: Dict, taste_profile: Dict) -> str:
        """Generate a personalized explanation for why this dish was recommended"""
        dish_name = dish.get('name', '')
        
        reasons = []
        
        # Check for cuisine match
        for cuisine in taste_profile.get('cuisine_preferences', []):
            if cuisine.lower() in dish_name.lower() or cuisine.lower() in dish.get('description', '').lower():
                reasons.append(f"matches your love for {cuisine} cuisine")
        
        # Check for dish type match  
        for dish_type in taste_profile.get('dish_types', []):
            if dish_type.lower() in dish_name.lower():
                reasons.append(f"similar to the {dish_type} dishes you enjoy")
                
        # Default reason
        if not reasons:
            reasons.append("highly rated by other customers with similar tastes")
            
        return f"Recommended because it {reasons[0]}."