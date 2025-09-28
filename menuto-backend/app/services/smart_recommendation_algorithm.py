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
        context_weights: Dict[str, Any] = None,
        friend_selections: List[Dict[str, Any]] = None,
        restaurant_name: str = None,
        restaurant_place_id: str = None
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
                context_weights,
                friend_selections,
                user_favorite_dishes,
                restaurant_name,
                restaurant_place_id
            )
            
            # Add scoring details
            item['recommendation_score'] = score['total_score']
            item['score_breakdown'] = score['breakdown']
            item['recommendation_reason'] = score['reason']
            item['friend_recommendation'] = score.get('friend_info')
            
            scored_items.append(item)
        
        # Sort by score (highest first), with some randomization for variety
        import random
        random.seed()  # Use current time as seed for variety
        
        # Add small random factor to break ties and provide variety
        for item in scored_items:
            item['_random_factor'] = random.uniform(0, 0.1)  # Small random boost
        
        scored_items.sort(key=lambda x: x['recommendation_score'] + x['_random_factor'], reverse=True)
        
        # Remove the temporary random factor
        for item in scored_items:
            del item['_random_factor']
        
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
        context_weights: Dict[str, Any] = None,
        friend_selections: List[Dict[str, Any]] = None,
        user_favorite_dishes: List[Dict[str, str]] = None,
        restaurant_name: str = None,
        restaurant_place_id: str = None
    ) -> Dict[str, Any]:
        # Debug logging for context weights
        if context_weights:
            print(f"🎛️ Context weights: {context_weights}")
        """Calculate final recommendation score for an item"""
        
        breakdown = {}
        
        # Get context weights (default values if not provided)
        hunger_level = context_weights.get('hungerLevel', 3) if context_weights else 3
        preference_level = context_weights.get('preferenceLevel', 3) if context_weights else 3
        selected_cravings = context_weights.get('selectedCravings', []) if context_weights else []
        
        # 1. Customer praise score (weighted by preference level)
        # preference_level: 1=all me, 5=fan favorites
        praise_weight = (preference_level - 1) / 4  # 0 to 1
        personal_weight = 1 - praise_weight  # 1 to 0
        
        print(f"🎯 Scoring {item.get('name', 'Unknown')}: preference_level={preference_level}, praise_weight={praise_weight:.2f}, personal_weight={personal_weight:.2f}")
        
        praise_score = 0
        if item.get('customer_sentiment') == 'positive':
            praise_score = 40 * praise_weight
        elif item.get('customer_sentiment') == 'mixed':
            praise_score = 20 * praise_weight
        else:
            # Fallback: give base score based on category and description quality
            base_score = 15 * praise_weight  # Base score for all items
            if item.get('category') in ['main', 'starter']:
                base_score += 5 * praise_weight  # Bonus for main courses and starters
            if len(item.get('description', '')) > 20:  # More detailed descriptions
                base_score += 5 * praise_weight
            praise_score = base_score
        
        mention_frequency = item.get('mention_frequency', 1)
        if mention_frequency > 2:
            praise_score += 10 * praise_weight  # Bonus for frequently mentioned items
        
        breakdown['customer_praise'] = praise_score
        
        # Debug logging for popularity scoring
        print(f"📊 {item.get('name', 'Unknown')}: customer_praise={praise_score:.1f} (sentiment={item.get('customer_sentiment', 'none')}, frequency={item.get('mention_frequency', 1)}, praise_weight={praise_weight:.2f})")
        
        # 2. Taste compatibility score (weighted by preference level)
        taste_score = 0
        taste_reasoning = "Based on restaurant popularity"
        
        if taste_prediction:
            pred_score = taste_prediction.get('prediction_score', 0)
            taste_score = (pred_score / 100) * 50 * personal_weight
            taste_reasoning = taste_prediction.get('reasoning', taste_reasoning)
        
        breakdown['taste_compatibility'] = taste_score
        
        # Get item text for analysis
        item_text = f"{item.get('name', '')} {item.get('description', '')}".lower()
        
        # 3. Craving match score (IMPROVED!)
        craving_score = 0
        if selected_cravings:
            craving_matches = 0
            craving_penalty = 0
            
            for craving in selected_cravings:
                if self._matches_craving(item_text, craving):
                    craving_matches += 1
                else:
                    # Check for anti-cravings (opposite of what user wants)
                    if self._matches_anti_craving(item_text, craving):
                        craving_penalty += 1
            
            if craving_matches > 0:
                # Much higher bonus for matching cravings
                craving_score = (craving_matches / len(selected_cravings)) * 50  # Increased from 30
                breakdown['craving_match'] = craving_score
            
            if craving_penalty > 0:
                # Heavy penalty for anti-cravings
                craving_score -= (craving_penalty / len(selected_cravings)) * 40
                breakdown['craving_penalty'] = craving_penalty * -40
        
        # 4. Hunger level adjustment
        hunger_multiplier = 1.0
        if hunger_level <= 2:  # Barely hungry
            # Prefer lighter items
            if any(word in item_text for word in ['light', 'salad', 'soup', 'small']):
                hunger_multiplier = 1.2
        elif hunger_level >= 4:  # Ravenous
            # Prefer heavier, more filling items
            if any(word in item_text for word in ['heavy', 'large', 'big', 'filling', 'rich']):
                hunger_multiplier = 1.2
        
        # 5. Spice tolerance adjustment
        spice_tolerance = context_weights.get('spiceTolerance', 3) if context_weights else 3
        spice_score = 0
        if spice_tolerance <= 2:  # Low spice tolerance
            # Penalize spicy items
            spicy_keywords = ['spicy', 'hot', 'chili', 'pepper', 'curry', 'piment', 'espelette', 'guindilla', 'jalapeño']
            if any(keyword in item_text for keyword in spicy_keywords):
                spice_score = -10  # Penalty for spicy items
        elif spice_tolerance >= 4:  # High spice tolerance
            # Bonus for spicy items
            spicy_keywords = ['spicy', 'hot', 'chili', 'pepper', 'curry', 'piment', 'espelette', 'guindilla', 'jalapeño']
            if any(keyword in item_text for keyword in spicy_keywords):
                spice_score = 15  # Bonus for spicy items
        
        breakdown['spice_tolerance'] = spice_score
        
        # 6. Friend recommendation (10% weight - info only, small boost)
        friend_score = 0
        friend_info = None
        
        if friend_selections:
            for friend_item in friend_selections:
                if friend_item['dish_name'].lower() == item['name'].lower():
                    friend_score = 10
                    friend_info = f"Your friend also loved this dish!"
                    break
        
        breakdown['friend_boost'] = friend_score
        
        # 6. Restaurant-specific favorite bonus (NEW!)
        restaurant_favorite_bonus = 0
        if user_favorite_dishes and restaurant_name:
            print(f"🔍 Checking restaurant-specific favorites for: {restaurant_name} (place_id: {restaurant_place_id})")
            print(f"🔍 User favorite dishes: {[dish.get('restaurant_id', 'NO_ID') for dish in user_favorite_dishes]}")
            
            # Check if user has favorites from this specific restaurant
            # Match by both restaurant name and place_id
            restaurant_favorites = [
                dish for dish in user_favorite_dishes 
                if (dish.get('restaurant_id') == restaurant_name or 
                    dish.get('restaurant_id') == restaurant_place_id or
                    dish.get('restaurant_name') == restaurant_name)
            ]
            
            print(f"🔍 Found {len(restaurant_favorites)} restaurant-specific favorites")
            
            if restaurant_favorites:
                # Heavy weighting for restaurant-specific favorites
                restaurant_favorite_bonus = 25  # Significant bonus
                breakdown['restaurant_favorite_bonus'] = restaurant_favorite_bonus
                print(f"🏆 Restaurant-specific favorite bonus: +{restaurant_favorite_bonus} for {restaurant_name}")
            else:
                print(f"❌ No restaurant-specific favorites found for {restaurant_name}")
        
        # Calculate total with hunger multiplier
        total_score = (praise_score + taste_score + craving_score + friend_score + spice_score + restaurant_favorite_bonus) * hunger_multiplier
        
        # Generate exactly 3 concise reasoning bullets
        reason_bullets = []
        
        # Check for similar dishes user has liked
        similar_dish_reference = self._find_similar_dish_reference(item, user_favorite_dishes, restaurant_name, restaurant_place_id)
        
        # Bullet 1: Specific restaurant experience or similar dishes (PRIORITY)
        if similar_dish_reference:
            reason_bullets.append(similar_dish_reference.title())
        elif restaurant_favorite_bonus > 0:
            # Find a specific dish they've loved from this restaurant
            same_restaurant_dishes = []
            for f in user_favorite_dishes:
                favorite_restaurant = f.get('restaurant_id', '')
                # Use place_id for exact matching if available
                if restaurant_place_id:
                    if favorite_restaurant == restaurant_place_id:
                        same_restaurant_dishes.append(f.get('dish_name', ''))
                else:
                    # Fallback to name matching
                    if favorite_restaurant == restaurant_name or restaurant_name in favorite_restaurant:
                        same_restaurant_dishes.append(f.get('dish_name', ''))
            
            if same_restaurant_dishes:
                specific_dish = same_restaurant_dishes[0].title()
                reason_bullets.append(f"You've loved {specific_dish} from this restaurant before")
            else:
                reason_bullets.append("You've loved dishes from this restaurant before")
        elif praise_score >= 30:
            reason_bullets.append("Highly praised by customers")
        elif praise_score >= 15:
            reason_bullets.append("Popular choice at this restaurant")
        else:
            reason_bullets.append("Popular choice at this restaurant")
        
        # Bullet 2: Taste compatibility, broader patterns, or novelty
        if not similar_dish_reference and taste_score >= 25:
            reason_bullets.append(taste_reasoning.title())
        elif craving_score >= 15:
            craving_matches = []
            for craving in selected_cravings:
                if self._matches_craving(item_text, craving):
                    craving_matches.append(craving)
            if craving_matches:
                reason_bullets.append(f"Matches your craving for {', '.join(craving_matches)}")
        elif context_weights and context_weights.get('hungerLevel', 3) >= 4:
            reason_bullets.append("Perfect for your hunger level")
        elif context_weights and context_weights.get('preferenceLevel', 3) >= 4:
            reason_bullets.append("Matches your preference for trying new things")
        else:
            # Check if this is a new dish for the user at THIS restaurant
            user_has_tried_this_dish = False
            user_has_restaurant_favorites = False
            
            if user_favorite_dishes and restaurant_place_id:
                # Check if user has tried this specific dish
                user_has_tried_this_dish = any(
                    favorite.get('dish_name', '').lower() == item['name'].lower() 
                    for favorite in user_favorite_dishes
                )
                
                # Check if user has any favorites from this restaurant
                user_has_restaurant_favorites = any(
                    favorite.get('restaurant_id') == restaurant_place_id
                    for favorite in user_favorite_dishes
                )
            
            # Only show "You haven't tried this before" if:
            # 1. User has favorites from THIS restaurant, AND
            # 2. User hasn't tried this specific dish
            if user_has_restaurant_favorites and not user_has_tried_this_dish:
                reason_bullets.append("You haven't tried this before")
            else:
                reason_bullets.append("Matches your taste preferences")
        
        # Bullet 3: Craving match, hunger level, or popularity
        if craving_score >= 15 and not any("craving" in bullet.lower() for bullet in reason_bullets):
            craving_matches = []
            for craving in selected_cravings:
                if self._matches_craving(item_text, craving):
                    craving_matches.append(craving)
            if craving_matches:
                reason_bullets.append(f"Matches your craving for {', '.join(craving_matches)}")
        elif context_weights and context_weights.get('hungerLevel', 3) >= 4 and not any("hunger" in bullet.lower() for bullet in reason_bullets):
            reason_bullets.append("Perfect for your hunger level")
        elif context_weights and context_weights.get('preferenceLevel', 3) >= 4 and not any("adventure" in bullet.lower() for bullet in reason_bullets):
            reason_bullets.append("Matches your adventure preference")
        elif praise_score >= 20 and not any("popular" in bullet.lower() or "praised" in bullet.lower() for bullet in reason_bullets):
            reason_bullets.append("Highly rated by diners")
        else:
            reason_bullets.append("Matches your dining preferences")
        
        # Ensure we have exactly 3 bullets
        reason_bullets = reason_bullets[:3]
        
        # Format as 3 separate lines
        reason = " | ".join(reason_bullets)
        
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
    
    def _matches_craving(self, item_text: str, craving: str) -> bool:
        """Check if a dish matches a specific craving"""
        craving_keywords = {
            'light': ['light', 'fresh', 'salad', 'soup', 'steamed', 'grilled', 'green', 'vegetable'],
            'fresh': ['fresh', 'raw', 'crudo', 'sashimi', 'ceviche', 'green', 'citrus', 'tartare'],
            'carb-heavy': ['pasta', 'rice', 'bread', 'noodle', 'pizza', 'sandwich', 'wrap', 'potato', 'bomba', 'arroz', 'cake', 'pastel', 'meringue'],
            'protein-heavy': ['chicken', 'beef', 'pork', 'fish', 'seafood', 'meat', 'protein', 'foie', 'anchovy', 'bonito', 'shrimp', 'octopus', 'pulpo'],
            'spicy': ['spicy', 'hot', 'chili', 'pepper', 'curry', 'szechuan', 'jalapeño', 'piment', 'espelette', 'guindilla'],
            'creamy': ['creamy', 'cream', 'cheese', 'butter', 'sauce', 'dip', 'mayo', 'pastela', 'anglaise', 'cultured', 'moscatel'],
            'crispy': ['crispy', 'fried', 'crunchy', 'golden', 'battered', 'toasted', 'scorched'],
            'comforting': ['comfort', 'warm', 'hearty', 'rich', 'home', 'traditional', 'basque', 'butter']
        }
        
        keywords = craving_keywords.get(craving, [])
        return any(keyword in item_text for keyword in keywords)
    
    def _matches_anti_craving(self, item_text: str, craving: str) -> bool:
        """Check if an item is the opposite of what the user craves"""
        craving_lower = craving.lower()
        
        # Define anti-craving keywords (opposite of what user wants)
        anti_craving_keywords = {
            'crispy': ['salad', 'raw', 'fresh', 'light', 'steamed', 'poached', 'crudo', 'sashimi', 'tartare', 'ceviche'],
            'carb-heavy': ['salad', 'soup', 'protein', 'vegetable', 'green', 'raw', 'crudo', 'sashimi', 'tartare', 'ceviche'],
            'comforting': ['salad', 'raw', 'fresh', 'light', 'steamed', 'poached', 'crudo', 'sashimi', 'cold', 'tartare'],
            'spicy': ['mild', 'bland', 'sweet', 'creamy', 'butter'],
            'creamy': ['light', 'fresh', 'raw', 'steamed', 'grilled'],
            'fresh': ['fried', 'heavy', 'rich', 'creamy', 'comfort'],
            'light': ['fried', 'heavy', 'rich', 'creamy', 'comfort', 'pasta', 'bread']
        }
        
        if craving_lower in anti_craving_keywords:
            return any(keyword in item_text for keyword in anti_craving_keywords[craving_lower])
        
        return False

    def _find_similar_dish_reference(self, item: Dict[str, Any], user_favorite_dishes: List[Dict[str, str]], restaurant_name: str, restaurant_place_id: str = None) -> str:
        """Find similar dishes user has liked and generate specific reference"""
        if not user_favorite_dishes:
            return ""
        
        item_name = item.get('name', '').lower()
        item_description = item.get('description', '').lower()
        item_text = f"{item_name} {item_description}"
        
        same_restaurant_favorites = []
        other_restaurant_favorites = []
        
        for favorite in user_favorite_dishes:
            favorite_name = favorite.get('dish_name', '')
            favorite_restaurant = favorite.get('restaurant_id', '')
            
            if favorite_name.lower() == item_name:
                continue
                
            # Check if it's the same restaurant using place_id (most reliable)
            is_same_restaurant = False
            if restaurant_place_id:
                # Use place_id for exact matching
                is_same_restaurant = favorite_restaurant == restaurant_place_id
            else:
                # Fallback to name matching if place_id not available
                is_same_restaurant = (
                    favorite_restaurant == restaurant_name or 
                    favorite_restaurant in restaurant_name or
                    restaurant_name in favorite_restaurant
                )
            
            if is_same_restaurant:
                same_restaurant_favorites.append(favorite_name)
            else:
                other_restaurant_favorites.append(favorite_name)
        
        # First priority: Find similar dishes from the SAME restaurant
        for favorite_name in same_restaurant_favorites:
            if self._dishes_are_similar(item_text, favorite_name.lower()):
                return f"similar to {favorite_name.title()}, which you've loved from this restaurant"
        
        # Second priority: Find similar dishes from OTHER restaurants with pattern
        for favorite_name in other_restaurant_favorites:
            if self._dishes_are_similar(item_text, favorite_name.lower()):
                return f"similar to {favorite_name.title()}, which you've loved elsewhere"
        
        # Third priority: Find broader pattern (e.g., "you love curries")
        pattern = self._find_broader_taste_pattern(item_text, user_favorite_dishes)
        if pattern:
            return pattern
        
        return ""
    
    def _dishes_are_similar(self, item_text: str, favorite_name: str) -> bool:
        """Check if two dishes are similar based on cuisine, ingredients, or cooking method"""
        # Enhanced similarity checking with more specific matching
        similarity_indicators = [
            # Cuisine types (high similarity)
            'curry', 'pasta', 'pizza', 'burger', 'salad', 'soup', 'stir-fry', 'grilled', 'fried', 'roasted',
            'braised', 'steamed', 'baked', 'sauteed', 'marinated', 'crispy', 'creamy', 'spicy', 'sweet',
            'sushi', 'roll', 'ramen', 'tacos', 'burrito', 'pad thai', 'pho', 'dumpling',
            # Cooking methods (high similarity)
            'wok', 'seared', 'blackened', 'tempura', 'teriyaki', 'tandoor', 'bbq', 'smoked',
            # Flavor profiles (high similarity)
            'garlic', 'ginger', 'curry', 'coconut', 'tomato', 'cream', 'butter', 'olive oil'
        ]
        
        # Check for exact cuisine/cooking method matches (high confidence)
        for indicator in similarity_indicators:
            if indicator in item_text and indicator in favorite_name:
                return True
        
        # For protein ingredients, require additional context to avoid false matches
        protein_ingredients = [
            'chicken', 'beef', 'pork', 'fish', 'shrimp', 'crab', 'lamb', 'tofu', 'cheese', 'mushroom',
            'salmon', 'tuna', 'duck', 'turkey', 'veal', 'scallop', 'lobster', 'octopus', 'squid'
        ]
        
        for protein in protein_ingredients:
            if protein in item_text and protein in favorite_name:
                # Only consider similar if they share cooking method or cuisine type
                shared_context = any(
                    context in item_text and context in favorite_name 
                    for context in similarity_indicators
                )
                if shared_context:
                    return True
        
        return False
    
    def _find_broader_taste_pattern(self, item_text: str, user_favorite_dishes: List[Dict[str, str]]) -> str:
        """Find broader taste patterns from user's favorites"""
        # Count cuisine types and ingredients in user's favorites
        cuisine_counts = {}
        ingredient_counts = {}
        
        for favorite in user_favorite_dishes:
            favorite_name = favorite.get('dish_name', '').lower()
            
            # Categorize by cuisine/type
            if any(word in favorite_name for word in ['curry', 'masala', 'tikka']):
                cuisine_counts['curries'] = cuisine_counts.get('curries', 0) + 1
            elif any(word in favorite_name for word in ['pasta', 'spaghetti', 'linguine']):
                cuisine_counts['pasta'] = cuisine_counts.get('pasta', 0) + 1
            elif any(word in favorite_name for word in ['pizza', 'margherita', 'pepperoni']):
                cuisine_counts['pizza'] = cuisine_counts.get('pizza', 0) + 1
            elif any(word in favorite_name for word in ['burger', 'sandwich']):
                cuisine_counts['burgers'] = cuisine_counts.get('burgers', 0) + 1
            elif any(word in favorite_name for word in ['salad', 'caesar', 'greek']):
                cuisine_counts['salads'] = cuisine_counts.get('salads', 0) + 1
            elif any(word in favorite_name for word in ['sushi', 'roll', 'sashimi']):
                cuisine_counts['sushi'] = cuisine_counts.get('sushi', 0) + 1
            
            # Count protein ingredients
            proteins = ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'crab', 'lamb', 'salmon', 'tuna', 'duck']
            for protein in proteins:
                if protein in favorite_name:
                    ingredient_counts[protein] = ingredient_counts.get(protein, 0) + 1
        
        # Check for ingredient patterns first (more specific)
        if ingredient_counts:
            most_common_ingredient = max(ingredient_counts, key=ingredient_counts.get)
            count = ingredient_counts[most_common_ingredient]
            
            if count >= 2 and most_common_ingredient in item_text:
                # Find a specific dish name with this ingredient for reference
                for favorite in user_favorite_dishes:
                    if most_common_ingredient in favorite.get('dish_name', '').lower():
                        return f"You liked another dish with {most_common_ingredient.title()}, {favorite.get('dish_name')}!"
        
        # Find the most common cuisine pattern
        if cuisine_counts:
            most_common = max(cuisine_counts, key=cuisine_counts.get)
            count = cuisine_counts[most_common]
            
            if count >= 2:  # Only mention if user has multiple favorites in this category
                if most_common == 'curries' and any(word in item_text for word in ['curry', 'masala', 'tikka']):
                    return "you love curries"
                elif most_common == 'pasta' and any(word in item_text for word in ['pasta', 'spaghetti', 'linguine']):
                    return "you love pasta dishes"
                elif most_common == 'pizza' and any(word in item_text for word in ['pizza', 'margherita']):
                    return "you love pizza"
                elif most_common == 'burgers' and any(word in item_text for word in ['burger', 'sandwich']):
                    return "you love burgers"
                elif most_common == 'salads' and any(word in item_text for word in ['salad', 'caesar']):
                    return "you love salads"
        
        return ""