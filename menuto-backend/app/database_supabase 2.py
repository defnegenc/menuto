import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Dict, List, Any, Optional

load_dotenv()

# Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

class SupabaseDB:
    """Database operations using Supabase"""
    
    def __init__(self):
        self.client = supabase
    
    # Users
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        result = self.client.table("users").select("*").eq("email", email).execute()
        return result.data[0] if result.data else None
    
    def create_user(self, user_data: Dict) -> Dict:
        """Create new user"""
        result = self.client.table("users").insert(user_data).execute()
        return result.data[0]
    
    def update_user(self, user_id: str, updates: Dict) -> Dict:
        """Update user"""
        result = self.client.table("users").update(updates).eq("id", user_id).execute()
        return result.data[0]
    
    # Places
    def get_place_by_id(self, place_id: str) -> Optional[Dict]:
        """Get place by ID"""
        result = self.client.table("places").select("*").eq("id", place_id).execute()
        return result.data[0] if result.data else None
    
    def get_place_by_google_id(self, google_place_id: str) -> Optional[Dict]:
        """Get place by Google Place ID"""
        result = self.client.table("places").select("*").eq("google_place_id", google_place_id).execute()
        return result.data[0] if result.data else None
    
    def create_place(self, place_data: Dict) -> Dict:
        """Create new place"""
        result = self.client.table("places").insert(place_data).execute()
        return result.data[0]
    
    def search_places(self, query: str, limit: int = 20) -> List[Dict]:
        """Search places by name or cuisine"""
        result = self.client.table("places").select("*").or_(
            f"name.ilike.%{query}%,cuisine_type.ilike.%{query}%"
        ).limit(limit).execute()
        return result.data
    
    # Dishes
    def get_dishes_by_place(self, place_id: str) -> List[Dict]:
        """Get all dishes for a place"""
        result = self.client.table("dishes").select("*").eq("place_id", place_id).execute()
        return result.data
    
    def get_dish_by_id(self, dish_id: str) -> Optional[Dict]:
        """Get dish by ID"""
        result = self.client.table("dishes").select("*").eq("id", dish_id).execute()
        return result.data[0] if result.data else None
    
    def create_dish(self, dish_data: Dict) -> Dict:
        """Create new dish"""
        result = self.client.table("dishes").insert(dish_data).execute()
        return result.data[0]
    
    def update_dish_rating(self, dish_id: str, avg_rating: float, total_reviews: int):
        """Update dish average rating"""
        self.client.table("dishes").update({
            "avg_rating": avg_rating,
            "total_reviews": total_reviews
        }).eq("id", dish_id).execute()
    
    # User Ratings
    def get_user_rating(self, user_id: str, dish_id: str) -> Optional[Dict]:
        """Get user's rating for a dish"""
        result = self.client.table("user_ratings").select("*").eq(
            "user_id", user_id
        ).eq("dish_id", dish_id).execute()
        return result.data[0] if result.data else None
    
    def create_user_rating(self, rating_data: Dict) -> Dict:
        """Create user rating"""
        result = self.client.table("user_ratings").insert(rating_data).execute()
        return result.data[0]
    
    def update_user_rating(self, user_id: str, dish_id: str, updates: Dict) -> Dict:
        """Update user rating"""
        result = self.client.table("user_ratings").update(updates).eq(
            "user_id", user_id
        ).eq("dish_id", dish_id).execute()
        return result.data[0]
    
    def get_dish_ratings(self, dish_id: str) -> List[Dict]:
        """Get all ratings for a dish"""
        result = self.client.table("user_ratings").select("*").eq("dish_id", dish_id).execute()
        return result.data
    
    # Reviews
    def create_review(self, review_data: Dict) -> Dict:
        """Create review"""
        result = self.client.table("reviews").insert(review_data).execute()
        return result.data[0]
    
    def get_reviews_by_place(self, place_id: str, limit: int = 50) -> List[Dict]:
        """Get reviews for a place"""
        result = self.client.table("reviews").select("*").eq(
            "place_id", place_id
        ).limit(limit).execute()
        return result.data
    
    def get_reviews_by_dish(self, dish_id: str) -> List[Dict]:
        """Get reviews for a dish"""
        result = self.client.table("reviews").select("*").eq("dish_id", dish_id).execute()
        return result.data
    
    # Reviewer Profiles
    def get_reviewer_profile(self, external_id: str, platform: str) -> Optional[Dict]:
        """Get reviewer profile"""
        result = self.client.table("reviewer_profiles").select("*").eq(
            "external_id", external_id
        ).eq("platform", platform).execute()
        return result.data[0] if result.data else None
    
    def create_reviewer_profile(self, profile_data: Dict) -> Dict:
        """Create reviewer profile"""
        result = self.client.table("reviewer_profiles").insert(profile_data).execute()
        return result.data[0]
    
    def update_reviewer_profile(self, external_id: str, platform: str, updates: Dict):
        """Update reviewer profile"""
        self.client.table("reviewer_profiles").update(updates).eq(
            "external_id", external_id
        ).eq("platform", platform).execute()

# Global database instance
db = SupabaseDB()