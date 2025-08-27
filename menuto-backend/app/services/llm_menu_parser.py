#!/usr/bin/env python3
"""
Simple LLM-based menu parser that takes raw text and extracts structured menu data.
"""

import re
import requests
import json
import logging
from typing import List, Dict, Optional
import tempfile
import os
from bs4 import BeautifulSoup
from PIL import Image
import pytesseract
import openai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class LLMMenuParser:
    """Simple LLM-based menu parser"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def detect_content_type(self, url: str) -> str:
        """Detect if URL is PDF, image, or HTML"""
        try:
            response = requests.head(url, headers=self.headers, timeout=10)
            content_type = response.headers.get('content-type', '').lower()
            
            if 'application/pdf' in content_type:
                return 'pdf'
            elif any(img_type in content_type for img_type in ['image/jpeg', 'image/png', 'image/webp']):
                return 'image'
            else:
                return 'html'
        except:
            return 'html'
    
    def extract_text_from_pdf(self, url: str) -> str:
        """Extract text from PDF"""
        try:
            import fitz  # PyMuPDF
            
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
            
            try:
                doc = fitz.open(tmp_path)
                text_content = []
                
                for page in doc:
                    text = page.get_text()
                    text_content.append(text)
                
                doc.close()
                return "\n".join(text_content)
                
            finally:
                os.unlink(tmp_path)
                
        except ImportError:
            logger.warning("PyMuPDF not available")
            return "PDF content detected but PyMuPDF not installed"
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return ""
    
    def extract_text_from_image(self, url: str) -> str:
        """Extract text from image using OCR"""
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
            
            try:
                image = Image.open(tmp_path)
                text = pytesseract.image_to_string(image)
                return text
            finally:
                os.unlink(tmp_path)
                
        except Exception as e:
            logger.error(f"Image OCR failed: {e}")
            return ""
    
    def extract_text_from_html(self, url: str) -> str:
        """Extract text from HTML"""
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for element in soup(["script", "style"]):
                element.decompose()
            
            return soup.get_text()
            
        except Exception as e:
            logger.error(f"HTML extraction failed: {e}")
            return ""
    
    def parse_menu_with_llm(self, text: str, restaurant_name: str = "") -> List[Dict]:
        """Parse menu text using LLM"""
        try:
            # Truncate text if it's too long (LLM has token limits)
            if len(text) > 8000:
                text = text[:8000] + "\n\n[Text truncated for processing...]"
                logger.info(f"Text truncated to {len(text)} characters for LLM processing")
            
            prompt = f"""
You are a menu parsing expert. Extract all dishes from this restaurant menu text and organize them by category.

Restaurant: {restaurant_name}

Menu text:
{text}

Please extract all dishes and organize them into a JSON structure with the following format:
{{
  "restaurant": "Restaurant Name",
  "sections": [
    {{
      "name": "Section Name (e.g., Entrees, Breakfast, Desserts, etc.)",
      "items": [
        {{
          "name": "Dish Name",
          "description": "Dish description if available",
          "category": "category_name (breakfast, main, dessert, beverage, salad, sandwich, starter, side)"
        }}
      ]
    }}
  ]
}}

Guidelines:
1. Extract ALL dishes you can find in the text
2. Group dishes by logical sections (Breakfast, Entrees, Desserts, Beverages, etc.)
3. Focus on capturing dish names and descriptions accurately
4. Be thorough - don't miss any dishes
5. Categorize appropriately (breakfast, main, dessert, beverage, salad, sandwich, starter, side)

Return ONLY valid JSON, no other text.
"""

            logger.info("Making LLM API call...")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a menu parsing expert. Extract all dishes and return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=4000,
                timeout=60  # 60 second timeout
            )
            
            logger.info("LLM response received, parsing JSON...")
            result = json.loads(response.choices[0].message.content)
            
            # Flatten the sections into a list of dishes
            dishes = []
            for section in result.get("sections", []):
                for item in section.get("items", []):
                    dish = {
                        "name": item.get("name", ""),
                        "description": item.get("description", ""),
                        "category": item.get("category", "main"),
                        "section": section.get("name", ""),
                        "ingredients": [],
                        "dietary_tags": [],
                        "preparation_style": []
                    }
                    dishes.append(dish)
            
            logger.info(f"LLM extracted {len(dishes)} dishes from menu")
            return dishes
            
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            return []
    
    def parse_menu_url(self, url: str, restaurant_name: str = "") -> List[Dict]:
        """Parse menu from URL using LLM"""
        try:
            # Detect content type
            content_type = self.detect_content_type(url)
            logger.info(f"Detected content type: {content_type}")
            
            # Extract text based on content type
            if content_type == 'pdf':
                text = self.extract_text_from_pdf(url)
            elif content_type == 'image':
                text = self.extract_text_from_image(url)
            else:
                text = self.extract_text_from_html(url)
            
            if not text or len(text) < 100:
                logger.warning("Very little text extracted")
                return []
            
            # Parse with LLM
            dishes = self.parse_menu_with_llm(text, restaurant_name)
            
            logger.info(f"Extracted {len(dishes)} dishes from {url}")
            return dishes
            
        except Exception as e:
            logger.error(f"Menu parsing failed: {e}")
            return []

def parse_menu_with_llm(url: str, restaurant_name: str = "") -> List[Dict]:
    """Simple function to parse menu from URL using LLM"""
    parser = LLMMenuParser()
    return parser.parse_menu_url(url, restaurant_name)
