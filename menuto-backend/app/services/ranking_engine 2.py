import numpy as np
from sqlalchemy.orm import Session
from app.models import Dish, Review, User, UserRating, ReviewerProfile
# from app.services.collaborative_filtering import CollaborativeFilteringEngine
from typing import Dict, List, Optional
import json

class DishRankingEngine:
    def __init__(self):
        # self.cf_engine = CollaborativeFilteringEngine()
        
        # Scoring weights (sum to 1.0)
        self.weights = {
            'personal_match': 0.35,     # User's taste preferences
            'review_consensus': 0.30,   # Average review quality
            'social_affinity': 0.25,    # Similar reviewers liked it
            'context_fit': 0.10        # Situational factors
        }
    
    def calculate_personal_match_score(self, dish: Dish, user: User) -> float:
        """Calculate how well a dish matches user's personal taste profile"""
        
        if not user.taste_vector:
            return 0.5  # Neutral score for new users
        
        user_prefs = user.taste_vector
        dish_score = 0.0
        factors_count = 0
        
        # Cuisine preference match (with null checks)
        if (user.preferred_cuisines and 
            dish.restaurant and 
            dish.restaurant.cuisine_type):
            cuisine_matches = [c for c in user.preferred_cuisines 
                             if c and dish.restaurant.cuisine_type and 
                             dish.restaurant.cuisine_type.lower() == c.lower()]
            if cuisine_matches:
                dish_score += 0.8
            factors_count += 1
        
        # Dietary restrictions compliance
        if user.dietary_restrictions and dish.dietary_tags:
            user_restrictions = {r.lower() for r in user.dietary_restrictions if r}
            dish_tags = {t.lower() for t in dish.dietary_tags if t}
            
            # Check for violations (negative score)
            violations = user_restrictions.intersection(dish_tags)
            if violations:
                return 0.1  # Very low score for dietary violations
            
            # Bonus for positive matches (e.g., user wants vegetarian, dish is vegetarian)
            if dish_tags.intersection(user_restrictions):
                dish_score += 0.6
                factors_count += 1
        
        # Ingredient/attribute preferences
        if dish.ingredients and isinstance(user_prefs, dict):
            user_ingredient_prefs = user_prefs.get('ingredient_preferences', {})
            for ingredient in dish.ingredients:
                if ingredient and ingredient.lower() in user_ingredient_prefs:
                    pref_score = user_ingredient_prefs[ingredient.lower()]
                    dish_score += pref_score * 0.3
                    factors_count += 1
        
        # Preparation style preferences  
        if dish.preparation_style and isinstance(user_prefs, dict):
            user_prep_prefs = user_prefs.get('preparation_preferences', {})
            for prep_style in dish.preparation_style:
                if prep_style and prep_style.lower() in user_prep_prefs:
                    pref_score = user_prep_prefs[prep_style.lower()]
                    dish_score += pref_score * 0.4
                    factors_count += 1
        
        # Price preference match
        if dish.price and user.price_preference:
            price_ranges = {1: (0, 15), 2: (15, 30), 3: (30, 50), 4: (50, 999)}
            target_min, target_max = price_ranges.get(user.price_preference, (0, 999))
            
            if target_min <= dish.price <= target_max:
                dish_score += 0.5
            else:
                dish_score -= 0.3
            factors_count += 1
        
        return min(1.0, max(0.0, dish_score / max(1, factors_count)))
    
    def calculate_review_consensus_score(self, dish: Dish, db: Session) -> float:
        """Calculate review consensus score with recency weighting"""
        
        reviews = db.query(Review).filter(Review.dish_id == dish.id).all()
        
        if not reviews:
            return 0.5  # Neutral score for no reviews
        
        # Calculate weighted average rating
        total_weight = 0
        weighted_sum = 0
        
        for review in reviews:
            # Recency weight (more recent = higher weight)
            days_old = 30  # Default if no date
            if review.created_at and review.review_date:
                days_old = (review.created_at - review.review_date).days
            recency_weight = max(0.1, 1.0 - (days_old / 365))  # Decay over a year
            
            # Sentiment alignment weight (higher sentiment = higher weight)
            sentiment_weight = 1.0
            if review.sentiment_score is not None:
                sentiment_weight = max(0.5, (review.sentiment_score + 1) / 2)
            
            final_weight = recency_weight * sentiment_weight
            weighted_sum += review.rating * final_weight
            total_weight += final_weight
        
        avg_rating = weighted_sum / total_weight if total_weight > 0 else 0
        
        # Convert to 0-1 scale (assuming 5-star rating system)
        normalized_score = avg_rating / 5.0
        
        # Confidence penalty for low review counts
        confidence_factor = min(1.0, len(reviews) / 10)  # Full confidence at 10+ reviews
        
        return normalized_score * confidence_factor
    
    def calculate_social_affinity_score(self, dish: Dish, user: User, db: Session) -> float:
        """Calculate score based on similar reviewers' opinions"""
        
        if not user.taste_vector:
            return 0.5  # Neutral for new users
        
        # For now, return neutral since we don't have real collaborative filtering data
        return 0.5
    
    def calculate_context_fit_score(self, dish: Dish, context: Dict) -> float:
        """Calculate how well dish fits the current context"""
        
        context_score = 0.5  # Start neutral
        
        # Budget constraint
        budget = context.get('budget')
        if budget and dish.price:
            if dish.price <= budget:
                context_score += 0.3
            else:
                context_score -= 0.5  # Penalty for over budget
        
        # Basic occasion fit (simplified)
        occasion = (context.get('occasion') or '').lower()
        if occasion and dish.dietary_tags:
            dish_tags = [tag.lower() for tag in dish.dietary_tags if tag]
            
            if occasion == 'date_night':
                if 'messy' in dish_tags:
                    context_score -= 0.4
                if 'elegant' in dish_tags or 'refined' in dish_tags:
                    context_score += 0.3
            elif occasion == 'quick_lunch':
                if 'light' in dish_tags or 'fast' in dish_tags:
                    context_score += 0.3
                if 'heavy' in dish_tags:
                    context_score -= 0.2
        
        return min(1.0, max(0.0, context_score))
    
    def rank_dishes(self, dishes: List[Dish], user: User, context: Dict, db: Session) -> List[Dict]:
        """Main ranking function that combines all scoring components"""
        
        ranked_dishes = []
        
        for dish in dishes:
            # Calculate component scores
            personal_score = self.calculate_personal_match_score(dish, user)
            consensus_score = self.calculate_review_consensus_score(dish, db)
            social_score = self.calculate_social_affinity_score(dish, user, db)
            context_score = self.calculate_context_fit_score(dish, context)
            
            # Weighted final score
            final_score = (
                personal_score * self.weights['personal_match'] +
                consensus_score * self.weights['review_consensus'] +
                social_score * self.weights['social_affinity'] +
                context_score * self.weights['context_fit']
            )
            
            # Generate explanation
            explanation_parts = []
            if personal_score > 0.6:
                explanation_parts.append("matches your taste preferences")
            if consensus_score > 0.7:
                explanation_parts.append("highly rated by recent reviewers")
            if social_score > 0.6:
                explanation_parts.append("loved by people with similar taste")
            if context_score > 0.6:
                explanation_parts.append("fits your current context")
            
            explanation = "Great choice"
            if explanation_parts:
                explanation += " - " + ", ".join(explanation_parts[:2])
            else:
                explanation = "This might be worth trying"
            
            ranked_dishes.append({
                'dish': dish,
                'score': final_score,
                'explanation': explanation,
                'component_scores': {
                    'personal_match': personal_score,
                    'review_consensus': consensus_score, 
                    'social_affinity': social_score,
                    'context_fit': context_score
                }
            })
        
        # Sort by score descending
        ranked_dishes.sort(key=lambda x: x['score'], reverse=True)
        
        return ranked_dishes

def rank_restaurant_dishes(restaurant_id: int, user_id: int, context: Dict, db: Session) -> List[Dict]:
    """Main function to rank all dishes at a restaurant for a user"""
    
    # Get dishes and user
    dishes = db.query(Dish).filter(Dish.restaurant_id == restaurant_id).all()
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not dishes:
        return []
    
    # Rank dishes
    ranking_engine = DishRankingEngine()
    ranked_dishes = ranking_engine.rank_dishes(dishes, user, context, db)
    
    return ranked_dishes