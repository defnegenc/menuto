"""
menuto-backend/app/services/review_ingestion.py

What this is:
- Helpers to fetch restaurant reviews (Google/Yelp) and optionally enrich them with OpenAI.

Why we keep it:
- Used by /reviews/* endpoints (routers/reviews.py) to ingest reviews for restaurants.
"""

import requests
import google.generativeai as genai
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
import time
import json

try:
    load_dotenv()
except Exception as e:
    _ = e

class ReviewIngestion:
    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        self.yelp_api_key = os.getenv("YELP_API_KEY")
        gemini_api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            self.model = None
    
    def get_google_reviews(self, place_id: str, max_reviews: int = 50) -> List[Dict]:
        """Fetch reviews from Google Places API"""
        print(f"🔍 Fetching Google reviews for place_id: {place_id}")
        
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
                print(f"❌ Google API error: {data.get('status')}")
                raise Exception(f"Google API error: {data.get('status')}")
            
            reviews = []
            raw_reviews = data.get("result", {}).get("reviews", [])
            print(f"📝 Found {len(raw_reviews)} Google reviews")
            
            for i, review in enumerate(raw_reviews):
                review_data = {
                    "platform": "google",
                    "reviewer_external_id": review.get("author_name", "unknown"),
                    "rating": float(review.get("rating", 0)),
                    "text": review.get("text", ""),
                    "review_date": review.get("time")  # Unix timestamp
                }
                reviews.append(review_data)
                
                # Log first few reviews for debugging
                if i < 3:
                    print(f"📖 Review {i+1}: {review_data['rating']}⭐ - \"{review_data['text'][:100]}...\"")
            
            print(f"✅ Processed {len(reviews)} Google reviews")
            return reviews[:max_reviews]
            
        except Exception as e:
            print(f"Error fetching Google reviews: {e}")
            return []
    
    def get_yelp_reviews(self, business_id: str, max_reviews: int = 50) -> List[Dict]:
        """Fetch reviews from Yelp API"""
        print(f"🔍 Fetching Yelp reviews for business_id: {business_id}")
        
        if not self.yelp_api_key:
            print("⚠️ No Yelp API key found - skipping Yelp reviews")
            return []
        
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
            raw_reviews = data.get("reviews", [])
            print(f"📝 Found {len(raw_reviews)} Yelp reviews")
            
            for i, review in enumerate(raw_reviews):
                review_data = {
                    "platform": "yelp", 
                    "reviewer_external_id": review.get("user", {}).get("id", "unknown"),
                    "rating": float(review.get("rating", 0)),
                    "text": review.get("text", ""),
                    "review_date": review.get("time_created")
                }
                reviews.append(review_data)
                
                # Log first few reviews for debugging
                if i < 3:
                    print(f"📖 Review {i+1}: {review_data['rating']}⭐ - \"{review_data['text'][:100]}...\"")
            
            print(f"✅ Processed {len(reviews)} Yelp reviews")
            return reviews
            
        except Exception as e:
            print(f"Error fetching Yelp reviews: {e}")
            return []
    
    def enrich_review_with_llm(self, review_text: str, dish_name: str = "") -> Dict:
        """Use LLM to extract structured data from review text"""
        print(f"🤖 Enriching review with LLM{f' for dish: {dish_name}' if dish_name else ''}")
        print(f"📝 Review text: \"{review_text[:150]}...\"")
        
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
            if not self.model:
                # Fallback if Gemini not configured
                return {
                    "sentiment_score": 0.0,
                    "extracted_attributes": [],
                    "preparation_feedback": {},
                    "context_tags": [],
                    "specific_praise": [],
                    "specific_complaints": []
                }
            
            full_prompt = f"You are a review analysis expert. Return valid JSON only.\n\n{prompt}"
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            
            enriched_data = json.loads(response.text)
            print(f"✅ LLM enrichment result: {json.dumps(enriched_data, indent=2)}")
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
            
            # Rate limiting for Gemini
            time.sleep(0.1)
        
        return enriched_reviews

def ingest_restaurant_reviews(google_place_id: str = None, yelp_business_id: str = None) -> List[Dict]:
    """Main function to ingest and enrich reviews from multiple platforms"""
    print(f"🚀 Starting review ingestion for Google: {google_place_id}, Yelp: {yelp_business_id}")
    
    ingestion = ReviewIngestion()
    all_reviews = []
    
    # Get Google reviews
    if google_place_id:
        print(f"📱 Fetching Google reviews...")
        google_reviews = ingestion.get_google_reviews(google_place_id)
        all_reviews.extend(google_reviews)
        print(f"📊 Total Google reviews: {len(google_reviews)}")
    else:
        print("⚠️ No Google place_id provided")
    
    # Get Yelp reviews  
    if yelp_business_id:
        print(f"🍽️ Fetching Yelp reviews...")
        yelp_reviews = ingestion.get_yelp_reviews(yelp_business_id)
        all_reviews.extend(yelp_reviews)
        print(f"📊 Total Yelp reviews: {len(yelp_reviews)}")
    else:
        print("⚠️ No Yelp business_id provided")
    
    # Enrich with LLM
    if all_reviews:
        print(f"🤖 Starting LLM enrichment for {len(all_reviews)} reviews...")
        enriched_reviews = ingestion.batch_enrich_reviews(all_reviews)
        print(f"✅ Review ingestion complete! Processed {len(enriched_reviews)} reviews")
        return enriched_reviews
    
    print("❌ No reviews found to process")
    return []