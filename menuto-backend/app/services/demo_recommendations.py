"""
Demo recommendation service for faster responses during development
"""
from typing import List, Dict, Any
import random

# Sample dishes for different restaurant types
DEMO_DISHES_BY_CUISINE = {
    "indian": [
        {
            "name": "Butter Chicken",
            "description": "Creamy tomato curry with tender chicken pieces",
            "price": 18.99,
            "avg_rating": 4.6,
            "recommendation_reason": "Recommended because it matches your love for creamy, rich curries like Chicken Tikka Masala."
        },
        {
            "name": "Lamb Biryani", 
            "description": "Fragrant basmati rice with spiced lamb and saffron",
            "price": 22.99,
            "avg_rating": 4.7,
            "recommendation_reason": "Perfect for spice lovers - similar aromatic spices to dishes you enjoy."
        },
        {
            "name": "Paneer Makhani",
            "description": "Cottage cheese in rich tomato cream sauce",
            "price": 16.99,
            "avg_rating": 4.4,
            "recommendation_reason": "Another creamy curry that matches your taste preferences."
        }
    ],
    "nepalese": [
        {
            "name": "Chicken Momo",
            "description": "Steamed dumplings filled with spiced chicken",
            "price": 12.99,
            "avg_rating": 4.5,
            "recommendation_reason": "Popular starter with flavors similar to your favorite Indian spices."
        },
        {
            "name": "Dal Bhat",
            "description": "Traditional lentil curry with rice and vegetables",
            "price": 15.99,
            "avg_rating": 4.3,
            "recommendation_reason": "Comfort food with rich, hearty flavors you'd appreciate."
        },
        {
            "name": "Goat Curry",
            "description": "Tender goat meat in aromatic Nepalese spices",
            "price": 21.99,
            "avg_rating": 4.6,
            "recommendation_reason": "Rich, spiced curry similar to the Chicken Tikka Masala you love."
        }
    ],
    "default": [
        {
            "name": "Chef's Special",
            "description": "House specialty recommended by our chef",
            "price": 19.99,
            "avg_rating": 4.5,
            "recommendation_reason": "Highly rated by customers with similar taste preferences."
        },
        {
            "name": "Popular Choice",
            "description": "Most ordered dish by our regulars",
            "price": 17.99,
            "avg_rating": 4.4,
            "recommendation_reason": "Crowd favorite that matches your dining style."
        }
    ]
}

def generate_demo_recommendations(
    restaurant_name: str,
    user_favorite_dishes: List[Dict[str, str]]
) -> List[Dict[str, Any]]:
    """
    Generate demo recommendations quickly for development
    """
    # Determine cuisine type from restaurant name
    restaurant_lower = restaurant_name.lower()
    
    if any(keyword in restaurant_lower for keyword in ["indian", "curry", "tikka"]):
        cuisine = "indian"
    elif any(keyword in restaurant_lower for keyword in ["nepal", "momo"]):
        cuisine = "nepalese"  
    else:
        cuisine = "default"
    
    # Get dishes for this cuisine
    available_dishes = DEMO_DISHES_BY_CUISINE.get(cuisine, DEMO_DISHES_BY_CUISINE["default"])
    
    # Add some randomization and personalization
    recommendations = []
    for i, dish in enumerate(available_dishes[:5]):  # Max 5 recommendations
        rec = {
            "id": f"demo-{i}",
            "name": dish["name"],
            "description": dish["description"],
            "price": dish["price"],
            "category": "main",
            "avg_rating": dish["avg_rating"],
            "dietary_tags": [],
            "ingredients": [],
            "recommendation_reason": dish["recommendation_reason"],
            "similarity_score": 0.8 - (i * 0.1)  # Decreasing scores
        }
        
        # Personalize recommendation reason based on user's dishes
        if user_favorite_dishes and len(user_favorite_dishes) > 0:
            user_dish = user_favorite_dishes[0]["dish_name"]
            if "chicken" in user_dish.lower() and "chicken" in dish["name"].lower():
                rec["recommendation_reason"] = f"Perfect match - you love {user_dish} and this is similar!"
            elif "curry" in user_dish.lower() and ("curry" in dish["name"].lower() or "masala" in dish["name"].lower()):
                rec["recommendation_reason"] = f"Another delicious curry like your favorite {user_dish}."
        
        recommendations.append(rec)
    
    return recommendations