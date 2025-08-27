import requests
import os
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class GooglePlacesAPI:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        if not self.api_key:
            raise ValueError("Google Places API key not found. Set GOOGLE_PLACES_API_KEY in .env")
        self.base_url = "https://maps.googleapis.com/maps/api/place"
    
    def search_places(self, query: str, location: Optional[str] = None, radius: int = 10000) -> List[Dict]:
        """Search for places using Google Places API Text Search"""
        
        # If no location provided, use a default (San Francisco)
        if not location:
            location = "37.7749,-122.4194"  # San Francisco coordinates
        
        url = f"{self.base_url}/textsearch/json"
        
        params = {
            'query': f'{query} restaurant',
            'location': location,
            'radius': radius,
            'type': 'restaurant',
            'key': self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') != 'OK':
                print(f"Google Places API error: {data.get('status')} - {data.get('error_message', '')}")
                return []
            
            places = []
            for result in data.get('results', []):
                place = {
                    'place_id': result.get('place_id'),
                    'name': result.get('name'),
                    'vicinity': result.get('formatted_address', result.get('vicinity', '')),
                    'cuisine_type': self._extract_cuisine_type(result.get('types', [])),
                    'rating': result.get('rating'),
                    'price_level': result.get('price_level'),
                    'photo_reference': self._get_photo_reference(result.get('photos', [])),
                    'geometry': result.get('geometry', {}).get('location', {})
                }
                places.append(place)
            
            return places[:20]  # Limit to 20 results
            
        except requests.RequestException as e:
            print(f"Error calling Google Places API: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error in places search: {e}")
            return []
    
    def _extract_cuisine_type(self, types: List[str]) -> str:
        """Extract cuisine type from Google Places types"""
        cuisine_mapping = {
            'italian': 'italian',
            'mexican': 'mexican', 
            'chinese': 'chinese',
            'japanese': 'japanese',
            'thai': 'thai',
            'indian': 'indian',
            'french': 'french',
            'american': 'american',
            'mediterranean': 'mediterranean',
            'korean': 'korean',
            'vietnamese': 'vietnamese'
        }
        
        for place_type in types:
            place_type = place_type.lower()
            if place_type in cuisine_mapping:
                return cuisine_mapping[place_type]
        
        # Default based on common types
        if 'restaurant' in types:
            return 'restaurant'
        
        return 'restaurant'
    
    def _get_photo_reference(self, photos: List[Dict]) -> Optional[str]:
        """Get the first photo reference if available"""
        if photos and len(photos) > 0:
            return photos[0].get('photo_reference')
        return None
    
    def get_place_details(self, place_id: str) -> Optional[Dict]:
        """Get detailed information about a specific place"""
        url = f"{self.base_url}/details/json"
        
        params = {
            'place_id': place_id,
            'fields': 'name,rating,formatted_phone_number,formatted_address,opening_hours,website,photos,price_level,types',
            'key': self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') != 'OK':
                return None
                
            return data.get('result')
            
        except Exception as e:
            print(f"Error getting place details: {e}")
            return None

# Global instance
places_api = GooglePlacesAPI()