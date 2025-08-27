import base64
import json
import logging
from typing import List, Dict, Any
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class ScreenshotMenuParser:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=api_key)
    
    def encode_image_to_base64(self, image_path: str) -> str:
        """Convert image to base64 string"""
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            file_size = os.path.getsize(image_path)
            logger.info(f"Image file size: {file_size} bytes")
            
            if file_size > 20 * 1024 * 1024:  # 20MB limit
                raise ValueError(f"Image file too large: {file_size} bytes")
            
            with open(image_path, "rb") as image_file:
                image_data = image_file.read()
                base64_string = base64.b64encode(image_data).decode('utf-8')
                logger.info(f"Successfully encoded image to base64 ({len(base64_string)} characters)")
                return base64_string
        except Exception as e:
            logger.error(f"Error encoding image {image_path}: {e}")
            raise
    
    def parse_menu_screenshot(self, image_path: str, restaurant_name: str) -> Dict[str, Any]:
        """Parse menu from screenshot using OpenAI GPT-4 Vision"""
        try:
            logger.info(f"Parsing menu screenshot for {restaurant_name}")
            
            # Encode image to base64
            base64_image = self.encode_image_to_base64(image_path)
            
            # Create the prompt for menu parsing
            prompt = f"""
You are a menu parsing expert. Extract all dishes from this restaurant menu image and organize them by category.

Restaurant: {restaurant_name}

Please analyze the image and return a JSON object with the following structure:
{{
  "restaurant": "{restaurant_name}",
  "sections": [
    {{
      "name": "section_name",
      "items": [
        {{
          "name": "dish_name",
          "description": "dish_description",
          "category": "main|starter|dessert|drink|side"
        }}
      ]
    }}
  ]
}}

Guidelines:
- Extract ALL dishes visible in the image
- Categorize dishes appropriately (main, starter, dessert, drink, side)
- Be thorough and don't miss any items
- Handle special characters and formatting properly
- Focus on dish names, descriptions, and categories

Return ONLY valid JSON, no other text.
"""
            
            logger.info("Making OpenAI Vision API call...")
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=4000,
                timeout=60
            )
            
            logger.info("OpenAI response received, parsing JSON...")
            result = json.loads(response.choices[0].message.content)
            
            # Flatten the sections into a list of dishes
            dishes = []
            for section in result.get("sections", []):
                for item in section.get("items", []):
                    dish = {
                        "name": item.get("name", ""),
                        "description": item.get("description", ""),
                        "category": item.get("category", "main"),
                        "ingredients": [],  # Could be enhanced with ingredient extraction
                        "dietary_tags": [],  # Could be enhanced with dietary info extraction
                        "preparation_style": [],  # Could be enhanced
                        "section": section.get("name", "Unknown"),
                        "restaurant_id": restaurant_name,
                        "is_user_added": False
                    }
                    dishes.append(dish)
            
            logger.info(f"Successfully parsed {len(dishes)} dishes from screenshot")
            
            return {
                "success": True,
                "restaurant": restaurant_name,
                "count": len(dishes),
                "dishes": dishes,
                "message": f"Successfully parsed {len(dishes)} dishes from screenshot"
            }
            
        except Exception as e:
            logger.error(f"Error parsing menu screenshot for {restaurant_name}: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error details: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to parse menu screenshot: {str(e)}",
                "dishes": []
            }
