import openai
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Restaurant, Dish
from dotenv import load_dotenv

load_dotenv()

class SmartRecommendationAlgorithm:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def score_menu_items(
        self,
        menu_items: List[Dict[str, Any]],
        user_favorite_dishes: List[Dict[str, str]],
        user_dietary_restrictions: List[str] = None,
        friend_selections: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Score menu items based on:
        1. Most-praised dishes from restaurant (customer sentiment)
        2. User dietary restrictions (hard filter)
        3. Similarity to user's other menu selections (LLM analysis)
        4. Friend recommendations (info only, doesn't affect score)
        """
        
        if not menu_items:
            return []
        
        print(f"🧠 Scoring {len(menu_items)} menu items")
        
        # Step 1: Filter by dietary restrictions (hard filter)
        filtered_items = self._filter_by_dietary_restrictions(menu_items, user_dietary_restrictions)
        print(f"🥗 After dietary filtering: {len(filtered_items)} items")
        
        # Step 2: Build comprehensive taste profile from user's favorite dishes
        user_taste_profile = self.build_user_taste_profile(user_favorite_dishes)
        
        # Step 3: Get LLM predictions based on user's taste profile
        taste_predictions = self._get_taste_predictions(filtered_items, user_favorite_dishes, user_taste_profile)
        
        # Step 3: Score each item
        scored_items = []
        for item in filtered_items:
            score = self._calculate_item_score(
                item, 
                taste_predictions.get(item['name'], {}),
                friend_selections
            )
            
            # Add scoring details
            item['recommendation_score'] = score['total_score']
            item['score_breakdown'] = score['breakdown']
            item['recommendation_reason'] = score['reason']
            item['friend_recommendation'] = score.get('friend_info')
            
            scored_items.append(item)
        
        # Sort by score (highest first)
        scored_items.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        print(f"✅ Scored and ranked {len(scored_items)} items")
        return scored_items[:5]  # Return top 5 to reduce tokens
    
    def _filter_by_dietary_restrictions(
        self, 
        menu_items: List[Dict[str, Any]], 
        dietary_restrictions: List[str]
    ) -> List[Dict[str, Any]]:
        """Filter out items that don't match dietary restrictions"""
        if not dietary_restrictions:
            return menu_items
        
        filtered = []
        for item in menu_items:
            item_text = f"{item.get('name', '')} {item.get('description', '')}".lower()
            
            # Check each restriction
            passes_filter = True
            for restriction in dietary_restrictions:
                if restriction.lower() == 'vegetarian':
                    # Filter out meat items
                    meat_keywords = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'shrimp', 'meat']
                    if any(meat in item_text for meat in meat_keywords):
                        passes_filter = False
                        break
                        
                elif restriction.lower() == 'vegan':
                    # Filter out animal products
                    animal_keywords = ['cheese', 'cream', 'butter', 'egg', 'milk', 'chicken', 'beef', 'pork', 'fish', 'yogurt']
                    if any(animal in item_text for animal in animal_keywords):
                        passes_filter = False
                        break
                        
                elif restriction.lower() == 'gluten-free':
                    # Filter out gluten items
                    gluten_keywords = ['naan', 'bread', 'pasta', 'wheat', 'flour']
                    if any(gluten in item_text for gluten in gluten_keywords):
                        passes_filter = False
                        break
            
            if passes_filter:
                filtered.append(item)
        
        return filtered
    
    def _get_taste_predictions(
        self, 
        menu_items: List[Dict[str, Any]], 
        user_favorite_dishes: List[Dict[str, str]],
        user_taste_profile: Dict[str, Any] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Use LLM to predict how much user would like each menu item"""
        
        if not user_favorite_dishes:
            return {}
        
        # Prepare user taste profile
        user_dishes_text = "\n".join([
            f"- {dish['dish_name']}" for dish in user_favorite_dishes
        ])
        
        # Prepare menu items for analysis
        menu_text = "\n".join([
            f"- {item['name']}: {item.get('description', '')}" 
            for item in menu_items[:8]  # Limit to avoid token limits
        ])
        
        # Include taste profile if available
        profile_text = ""
        if user_taste_profile and user_taste_profile.get('overall_pattern'):
            profile_text = f"\nTaste Profile Analysis: {user_taste_profile['overall_pattern']}"
            if user_taste_profile.get('spice_preference'):
                profile_text += f"\nSpice Preference: {user_taste_profile['spice_preference']}"
            if user_taste_profile.get('flavor_profiles'):
                profile_text += f"\nFlavor Profiles: {', '.join(user_taste_profile['flavor_profiles'])}"
            if user_taste_profile.get('cuisines'):
                profile_text += f"\nPreferred Cuisines: {', '.join(user_taste_profile['cuisines'])}"
        
        prompt = f"""
        User's favorite dishes:
        {user_dishes_text}
        {profile_text}
        
        For each menu item below, predict how much the user would enjoy it (0-100 score):
        {menu_text}
        
        Advanced Analysis:
        1. Match specific ingredients and cooking methods from their favorites
        2. Consider spice level compatibility and flavor progression
        3. Look for dishes that expand their palate while staying familiar
        4. Account for texture and richness preferences
        5. Consider cultural cuisine patterns and cross-cuisine compatibility
        
        Return JSON object:
        {{
          "Dish Name": {{
            "prediction_score": 87, // 0-100 how much they'd love it
            "reasoning": "Perfect match for your love of rich curries - combines your favorite spices (cardamom, cumin) with the creamy tomato base you enjoy in Chicken Tikka Masala",
            "confidence": "high", // high/medium/low
            "taste_factors": ["spice_compatibility", "texture_match", "ingredient_overlap"],
            "learning_insight": "This expands your curry experience with new vegetables while keeping familiar flavors"
          }}
        }}
        
        Only include items scoring > 70. Provide specific, personalized reasoning.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a food taste prediction expert. Analyze user preferences and predict dish compatibility. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=800
            )
            
            import json
            import re
            
            content = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
        except Exception as e:
            print(f"❌ Taste prediction failed: {str(e)}")
        
        return {}
    
    def _calculate_item_score(
        self, 
        item: Dict[str, Any], 
        taste_prediction: Dict[str, Any],
        friend_selections: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Calculate final recommendation score for an item"""
        
        breakdown = {}
        
        # 1. Customer praise score (40% weight)
        praise_score = 0
        if item.get('customer_sentiment') == 'positive':
            praise_score = 40
        elif item.get('customer_sentiment') == 'mixed':
            praise_score = 20
        
        mention_frequency = item.get('mention_frequency', 1)
        if mention_frequency > 2:
            praise_score += 10  # Bonus for frequently mentioned items
        
        breakdown['customer_praise'] = praise_score
        
        # 2. Taste compatibility score (50% weight)  
        taste_score = 0
        taste_reasoning = "Based on restaurant popularity"
        
        if taste_prediction:
            pred_score = taste_prediction.get('prediction_score', 0)
            taste_score = (pred_score / 100) * 50
            taste_reasoning = taste_prediction.get('reasoning', taste_reasoning)
        
        breakdown['taste_compatibility'] = taste_score
        
        # 3. Friend recommendation (10% weight - info only, small boost)
        friend_score = 0
        friend_info = None
        
        if friend_selections:
            for friend_item in friend_selections:
                if friend_item['dish_name'].lower() == item['name'].lower():
                    friend_score = 10
                    friend_info = f"Your friend also loved this dish!"
                    break
        
        breakdown['friend_boost'] = friend_score
        
        # Calculate total
        total_score = praise_score + taste_score + friend_score
        
        # Generate reason
        reason_parts = []
        if praise_score >= 30:
            reason_parts.append("highly praised by customers")
        if taste_score >= 25:
            reason_parts.append(taste_reasoning.lower())
        if friend_info:
            reason_parts.append("recommended by a friend")
        
        if not reason_parts:
            reason_parts.append("popular choice at this restaurant")
        
        reason = f"Recommended because it's {' and '.join(reason_parts)}."
        
        return {
            'total_score': round(total_score, 1),
            'breakdown': breakdown,
            'reason': reason,
            'friend_info': friend_info
        }
    
    def build_user_taste_profile(self, user_favorite_dishes: List[Dict[str, str]]) -> Dict[str, Any]:
        """Build a comprehensive taste profile from user's favorite dishes"""
        
        if not user_favorite_dishes:
            return {}
        
        user_dishes_text = "\n".join([
            f"- {dish['dish_name']}" for dish in user_favorite_dishes
        ])
        
        profile_prompt = f"""
        Analyze these dishes the user loves to create a taste profile:
        {user_dishes_text}
        
        Create a comprehensive taste profile including:
        - Preferred spice levels (mild, medium, hot)
        - Favorite cooking methods (grilled, fried, braised, etc.)
        - Texture preferences (crispy, creamy, chewy, etc.)
        - Flavor profiles (savory, sweet, tangy, rich, etc.)
        - Cultural cuisines they enjoy
        - Common ingredients they like
        - Dish categories they prefer (curries, noodles, grilled items, etc.)
        
        Return JSON:
        {{
          "spice_preference": "medium-hot",
          "cooking_methods": ["grilled", "braised"],
          "textures": ["creamy", "tender"],
          "flavor_profiles": ["rich", "aromatic", "savory"],
          "cuisines": ["Indian", "Italian"],
          "key_ingredients": ["tomatoes", "cream", "spices"],
          "dish_categories": ["curries", "pasta"],
          "overall_pattern": "Prefers rich, well-spiced comfort foods with creamy textures"
        }}
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a culinary analyst. Create detailed taste profiles from user food preferences. Return valid JSON only."},
                    {"role": "user", "content": profile_prompt}
                ],
                temperature=0.1,
                max_tokens=400
            )
            
            import json
            import re
            
            content = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                profile = json.loads(json_match.group())
                print(f"✅ Built taste profile: {profile.get('overall_pattern', 'Unknown pattern')}")
                return profile
            
        except Exception as e:
            print(f"❌ Taste profile building failed: {str(e)}")
        
        return {}
    
    def explain_recommendation(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Generate detailed explanation for why an item was recommended"""
        
        score_breakdown = item.get('score_breakdown', {})
        
        explanation = {
            'dish_name': item.get('name'),
            'total_score': item.get('recommendation_score'),
            'factors': []
        }
        
        # Add explanation for each factor
        if score_breakdown.get('customer_praise', 0) > 20:
            explanation['factors'].append({
                'factor': 'Customer Reviews',
                'score': score_breakdown['customer_praise'],
                'description': f"This dish has {item.get('customer_sentiment', 'positive')} reviews from customers"
            })
        
        if score_breakdown.get('taste_compatibility', 0) > 20:
            explanation['factors'].append({
                'factor': 'Taste Match',
                'score': score_breakdown['taste_compatibility'],
                'description': "Based on your favorite dishes, our AI thinks you'll love this"
            })
        
        if score_breakdown.get('friend_boost', 0) > 0:
            explanation['factors'].append({
                'factor': 'Friend Recommendation',
                'score': score_breakdown['friend_boost'],
                'description': item.get('friend_info', 'A friend also enjoyed this dish')
            })
        
        return explanation