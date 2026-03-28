"""
Enhanced Recommendation Algorithm using behavioral tracking signals.

Combines multiple signals:
- Dish orders (strongest signal)
- Dish views (moderate signal)
- Dish ratings (gold standard signal)
- Dish favorites (strong preference signal)
- Taste profile matching (from user favorites)
- Contextual preferences (hunger, cravings)
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from datetime import datetime, timedelta
from app.models import ParsedDish, ParsedMenu
import logging
import json

logger = logging.getLogger(__name__)


@dataclass
class DishSignals:
    """Aggregated behavioral signals for a dish"""
    dish_id: str
    dish_name: str
    order_count: int = 0
    view_count: int = 0
    avg_rating: float = 0.0
    rating_count: int = 0
    recent_order_boost: float = 0.0  # Boost for recent orders (trending)
    price: Optional[float] = None
    categories: List[str] = None  # categories from dish.category
    
    def __post_init__(self):
        if self.categories is None:
            self.categories = []


def analyze_user_taste_profile_simple(favorite_dishes: List[Dict]) -> Dict:
    """
    Simple rule-based taste profile analysis (fast, no LLM needed).
    Extracts patterns from favorite dish names and categories.
    """
    if not favorite_dishes:
        return {
            "preferred_cuisines": [],
            "preferred_categories": [],
            "preferred_ingredients": [],
            "preferred_styles": []
        }
    
    # Extract patterns from dish names
    categories = set()
    keywords = set()
    
    for fav in favorite_dishes:
        dish_name = fav.get('dish_name', '').lower()
        # Simple keyword extraction
        common_categories = ['pasta', 'pizza', 'salad', 'soup', 'burger', 'sandwich', 
                           'sushi', 'curry', 'taco', 'burrito', 'steak', 'chicken',
                           'fish', 'seafood', 'dessert', 'cake', 'ice cream']
        
        for cat in common_categories:
            if cat in dish_name:
                categories.add(cat)
                keywords.add(cat)
    
    return {
        "preferred_cuisines": [],  # Could extract from restaurant names
        "preferred_categories": list(categories),
        "preferred_ingredients": list(keywords),
        "preferred_styles": []
    }


class EnhancedRecommendationAlgorithm:
    """Multi-signal recommendation algorithm using behavioral tracking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_dish_signals(self, restaurant_place_id: str) -> Dict[str, DishSignals]:
        """
        Get aggregated behavioral signals for all dishes at a restaurant.
        Returns dict mapping dish_id (as string) to DishSignals.
        """
        # Get all dishes for this restaurant
        dishes = self.db.query(ParsedDish).join(
            ParsedMenu, ParsedDish.menu_id == ParsedMenu.id
        ).filter(
            ParsedMenu.place_id == restaurant_place_id
        ).all()
        
        if not dishes:
            logger.warning(f"No dishes found for restaurant {restaurant_place_id}")
            return {}
        
        signals = {}
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        for dish in dishes:
            dish_id_str = str(dish.id)

            # Get order count (raw SQL — behavioral ORM models removed)
            order_count = self.db.execute(
                text("SELECT COUNT(*) FROM dish_orders WHERE dish_id = :did"),
                {"did": dish.id}
            ).scalar() or 0

            # Get view count
            view_count = self.db.execute(
                text("SELECT COUNT(*) FROM dish_views WHERE dish_id = :did"),
                {"did": dish.id}
            ).scalar() or 0

            # Get rating stats
            rating_row = self.db.execute(
                text("SELECT AVG(rating), COUNT(*) FROM dish_ratings WHERE dish_id = :did"),
                {"did": dish.id}
            ).first()

            avg_rating = float(rating_row[0]) if rating_row and rating_row[0] else 0.0
            rating_count = (rating_row[1] if rating_row else 0) or 0

            # Recent order boost (orders in last 30 days)
            recent_orders = self.db.execute(
                text("SELECT COUNT(*) FROM dish_orders WHERE dish_id = :did AND ordered_at >= :since"),
                {"did": dish.id, "since": thirty_days_ago}
            ).scalar() or 0

            recent_order_boost = min(recent_orders / max(order_count, 1), 1.0) * 0.3  # Max 0.3 boost

            # Extract categories
            categories = [dish.category] if dish.category else []
            if dish.category:
                # Split if category contains multiple values (e.g., "main, pasta")
                categories = [c.strip() for c in dish.category.split(',')]

            signals[dish_id_str] = DishSignals(
                dish_id=dish_id_str,
                dish_name=dish.name,
                order_count=order_count,
                view_count=view_count,
                avg_rating=avg_rating,
                rating_count=rating_count,
                recent_order_boost=recent_order_boost,
                price=float(dish.price) if dish.price else None,
                categories=categories
            )
        
        logger.info(f"Collected signals for {len(signals)} dishes")
        return signals
    
    def calculate_popularity_score(self, signals: DishSignals) -> float:
        """
        Calculate popularity score from behavioral signals.
        Higher = more popular.
        """
        # Orders are strongest signal (weight: 1.0)
        order_score = min(signals.order_count / 10.0, 1.0) * 1.0
        
        # Ratings are gold standard (weight: 0.8, but only if we have enough ratings)
        rating_score = 0.0
        if signals.rating_count >= 3:  # Need at least 3 ratings to trust it
            normalized_rating = (signals.avg_rating - 1.0) / 4.0  # Scale 1-5 to 0-1
            rating_score = normalized_rating * 0.8
        
        # Views show interest (weight: 0.3)
        view_score = min(signals.view_count / 50.0, 1.0) * 0.3
        
        # Recent orders show trending (weight: 0.2)
        trending_boost = signals.recent_order_boost * 0.2
        
        total = order_score + rating_score + view_score + trending_boost
        return min(total, 1.0)  # Cap at 1.0
    
    def calculate_taste_match_score(
        self, 
        dish: ParsedDish, 
        user_favorites: List[Dict],
        taste_profile: Dict
    ) -> float:
        """
        Calculate how well dish matches user's taste profile.
        Based on favorite dishes and extracted preferences.
        """
        if not user_favorites and not taste_profile.get('preferred_categories'):
            return 0.5  # Neutral if no preferences
        
        score = 0.0
        
        # Category match
        dish_category = (dish.category or '').lower()
        preferred_categories = [c.lower() for c in taste_profile.get('preferred_categories', [])]
        
        if preferred_categories:
            for pref_cat in preferred_categories:
                if pref_cat in dish_category:
                    score += 0.4
                    break
        
        # Name similarity (simple keyword matching)
        dish_name_lower = dish.name.lower()
        for fav in user_favorites:
            fav_name = fav.get('dish_name', '').lower()
            # Simple word overlap check
            fav_words = set(fav_name.split())
            dish_words = set(dish_name_lower.split())
            common_words = fav_words & dish_words
            if len(common_words) >= 2:  # At least 2 common words
                score += 0.3
                break
        
        # Ingredients match (if available)
        if dish.ingredients and isinstance(dish.ingredients, list):
            dish_ingredients = [i.lower() for i in dish.ingredients]
            preferred_ingredients = [i.lower() for i in taste_profile.get('preferred_ingredients', [])]
            
            for pref_ing in preferred_ingredients:
                if any(pref_ing in ing for ing in dish_ingredients):
                    score += 0.2
                    break
        
        return min(score, 1.0)
    
    def calculate_contextual_score(
        self,
        dish: ParsedDish,
        hunger_level: int,
        cravings: List[str]
    ) -> float:
        """
        Calculate contextual match based on current context (hunger, cravings).
        """
        score = 0.5  # Base score
        
        # Hunger level adjustments
        dish_category = (dish.category or '').lower()
        
        if hunger_level >= 4:  # Very hungry - prefer mains
            if any(cat in dish_category for cat in ['main', 'entree', 'pasta', 'pizza']):
                score += 0.3
        elif hunger_level <= 2:  # Not very hungry - prefer lighter options
            if any(cat in dish_category for cat in ['starter', 'salad', 'soup', 'appetizer']):
                score += 0.3
        
        # Cravings match
        if cravings:
            dish_name_lower = dish.name.lower()
            dish_desc_lower = (dish.description or '').lower()
            dish_text = dish_name_lower + ' ' + dish_desc_lower
            
            for craving in cravings:
                craving_lower = craving.lower()
                if craving_lower in dish_text:
                    score += 0.2
                    break
        
        return min(score, 1.0)
    
    def generate_recommendations(
        self,
        restaurant_place_id: str,
        user_id: str,
        user_favorites: List[Dict],
        taste_profile: Dict,
        hunger_level: int = 3,
        cravings: List[str] = None,
        preference_vs_popular: float = 0.5,
        top_k: int = 5
    ) -> List[Dict]:
        """
        Generate personalized recommendations.
        
        Args:
            restaurant_place_id: Restaurant place ID
            user_id: User ID (for filtering user's own orders/views)
            user_favorites: List of favorite dishes [{dish_name, restaurant_id}]
            taste_profile: Extracted taste profile dict
            hunger_level: 1-5 hunger level
            cravings: List of craving keywords
            preference_vs_popular: 0=all personal, 1=all popular
            top_k: Number of recommendations to return
        
        Returns:
            List of recommendation dicts with score, explanation, etc.
        """
        if cravings is None:
            cravings = []
        
        # Get all dishes for restaurant
        dishes = self.db.query(ParsedDish).join(
            ParsedMenu, ParsedDish.menu_id == ParsedMenu.id
        ).filter(
            ParsedMenu.place_id == restaurant_place_id
        ).all()
        
        if not dishes:
            logger.warning(f"No dishes found for restaurant {restaurant_place_id}")
            return []
        
        # Get behavioral signals
        signals_dict = self.get_dish_signals(restaurant_place_id)
        
        # Score each dish
        scored_dishes = []
        
        for dish in dishes:
            dish_id_str = str(dish.id)
            signals = signals_dict.get(dish_id_str, DishSignals(
                dish_id=dish_id_str,
                dish_name=dish.name
            ))
            
            # Calculate component scores
            popularity_score = self.calculate_popularity_score(signals)
            taste_match_score = self.calculate_taste_match_score(dish, user_favorites, taste_profile)
            contextual_score = self.calculate_contextual_score(dish, hunger_level, cravings)
            
            # Combine scores based on preference_vs_popular
            final_score = (
                popularity_score * preference_vs_popular +
                taste_match_score * (1 - preference_vs_popular) * 0.7 +
                contextual_score * (1 - preference_vs_popular) * 0.3
            )
            
            # Generate explanation
            explanation_parts = []
            if popularity_score > 0.6:
                explanation_parts.append(f"Popular choice ({signals.order_count} orders)")
            if taste_match_score > 0.6:
                explanation_parts.append("Matches your taste preferences")
            if contextual_score > 0.7:
                explanation_parts.append("Perfect for your current mood")
            if signals.avg_rating > 4.0 and signals.rating_count >= 3:
                explanation_parts.append(f"Highly rated ({signals.avg_rating:.1f}⭐)")
            
            explanation = ", ".join(explanation_parts) if explanation_parts else "Great choice!"
            
            scored_dishes.append({
                'id': dish_id_str,
                'name': dish.name,
                'description': dish.description or '',
                'price': float(dish.price) if dish.price else None,
                'category': dish.category or 'main',
                'score': final_score,
                'explanation': explanation,
                'signals': {
                    'order_count': signals.order_count,
                    'view_count': signals.view_count,
                    'avg_rating': signals.avg_rating,
                    'rating_count': signals.rating_count
                },
                'popularity_score': popularity_score,
                'taste_match_score': taste_match_score,
                'contextual_score': contextual_score
            })
        
        # Sort by score descending
        scored_dishes.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top K
        return scored_dishes[:top_k]

