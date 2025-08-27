import requests
import openai
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
import time
import json

load_dotenv()

class ReviewIngestion:
    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        self.yelp_api_key = os.getenv("YELP_API_KEY")
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def get_google_reviews(self, place_id: str, max_reviews: int = 50) -> List[Dict]:
        """Fetch reviews from Google Places API"""
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "reviews",
            "key": self.google_api_key
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get("status") != "OK":
                raise Exception(f"Google API error: {data.get('status')}")
            
            reviews = []
            for review in data.get("result", {}).get("reviews", []):
                reviews.append({
                    "platform": "google",
                    "reviewer_external_id": review.get("author_name", "unknown"),
                    "rating": float(review.get("rating", 0)),
                    "text": review.get("text", ""),
                    "review_date": review.get("time")  # Unix timestamp
                })
            
            return reviews[:max_reviews]
            
        except Exception as e:
            print(f"Error fetching Google reviews: {e}")
            return []
    
    def get_yelp_reviews(self, business_id: str, max_reviews: int = 50) -> List[Dict]:
        """Fetch reviews from Yelp API"""
        url = f"https://api.yelp.com/v3/businesses/{business_id}/reviews"
        headers = {
            "Authorization": f"Bearer {self.yelp_api_key}"
        }
        params = {
            "limit": min(max_reviews, 50)  # Yelp max is 50
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            data = response.json()
            
            reviews = []
            for review in data.get("reviews", []):
                reviews.append({
                    "platform": "yelp", 
                    "reviewer_external_id": review.get("user", {}).get("id", "unknown"),
                    "rating": float(review.get("rating", 0)),
                    "text": review.get("text", ""),
                    "review_date": review.get("time_created")
                })
            
            return reviews
            
        except Exception as e:
            print(f"Error fetching Yelp reviews: {e}")
            return []
    
    def enrich_review_with_llm(self, review_text: str, dish_name: str = "") -> Dict:
        """Use LLM to extract structured data from review text"""
        prompt = f"""
        Analyze this restaurant review and extract structured information.
        {f"The review is specifically about: {dish_name}" if dish_name else ""}
        
        Review text: "{review_text}"
        
        Extract and return JSON with:
        {{
          "sentiment_score": -1.0 to 1.0,
          "extracted_attributes": ["creamy", "spicy", "fresh"],
          "preparation_feedback": {{"texture": "good", "temperature": "hot", "presentation": "nice"}},
          "context_tags": ["date_night", "quick_lunch", "family_dinner"],
          "specific_praise": ["great flavors", "perfect portion"],
          "specific_complaints": ["too salty", "overcooked"]
        }}
        
        Guidelines:
        - sentiment_score: -1 (very negative) to 1 (very positive)
        - extracted_attributes: taste/texture descriptors mentioned
        - preparation_feedback: how food was prepared/served
        - context_tags: dining occasion/context if mentioned
        - Extract specific praise and complaints
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a review analysis expert. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            enriched_data = json.loads(response.choices[0].message.content)
            return enriched_data
            
        except Exception as e:
            print(f"LLM enrichment failed: {e}")
            return {
                "sentiment_score": 0.0,
                "extracted_attributes": [],
                "preparation_feedback": {},
                "context_tags": [],
                "specific_praise": [],
                "specific_complaints": []
            }
    
    def batch_enrich_reviews(self, reviews: List[Dict], dish_name: str = "") -> List[Dict]:
        """Enrich multiple reviews with LLM processing"""
        enriched_reviews = []
        
        for review in reviews:
            # Add LLM enrichment
            enrichment = self.enrich_review_with_llm(review["text"], dish_name)
            
            enriched_review = {
                **review,
                "sentiment_score": enrichment["sentiment_score"],
                "extracted_attributes": enrichment["extracted_attributes"],
                "preparation_feedback": enrichment["preparation_feedback"],
                "context_tags": enrichment["context_tags"]
            }
            
            enriched_reviews.append(enriched_review)
            
            # Rate limiting for OpenAI
            time.sleep(0.1)
        
        return enriched_reviews

def ingest_restaurant_reviews(google_place_id: str = None, yelp_business_id: str = None) -> List[Dict]:
    """Main function to ingest and enrich reviews from multiple platforms"""
    ingestion = ReviewIngestion()
    all_reviews = []
    
    # Get Google reviews
    if google_place_id:
        google_reviews = ingestion.get_google_reviews(google_place_id)
        all_reviews.extend(google_reviews)
    
    # Get Yelp reviews  
    if yelp_business_id:
        yelp_reviews = ingestion.get_yelp_reviews(yelp_business_id)
        all_reviews.extend(yelp_reviews)
    
    # Enrich with LLM
    if all_reviews:
        enriched_reviews = ingestion.batch_enrich_reviews(all_reviews)
        return enriched_reviews
    
    return []