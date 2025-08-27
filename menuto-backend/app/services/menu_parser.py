import pytesseract
from PIL import Image
import re
import openai
from typing import List, Dict, Optional, Union
import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import json
import mimetypes
from urllib.parse import urljoin, urlparse
import tempfile
import logging
from pydantic import BaseModel, Field, validator
import time

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DishItem(BaseModel):
    """Pydantic model for dish validation"""
    name: str = Field(..., min_length=1)
    description: str = Field(default="")
    price: Optional[float] = Field(None, ge=0)
    category: str = Field(default="main")
    ingredients: List[str] = Field(default_factory=list)
    dietary_tags: List[str] = Field(default_factory=list)
    preparation_style: List[str] = Field(default_factory=list)
    
    @validator('category')
    def normalize_category(cls, v):
        category = v.lower().strip()
        mapping = {
            "appetizer": "starter", "starter": "starter", "appetizers": "starter",
            "main": "main", "mains": "main", "entree": "main", "entrees": "main",
            "dessert": "dessert", "desserts": "dessert", "sweet": "dessert",
            "drink": "beverage", "drinks": "beverage", "beverage": "beverage", "beverages": "beverage"
        }
        return mapping.get(category, "main")

class MenuParser:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY in .env file")
        self.client = openai.OpenAI(api_key=api_key)
        
        # Headers for requests
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def detect_content_type(self, url: str) -> Dict[str, str]:
        """Step 0: Detect content type before scraping"""
        try:
            # First try HEAD request
            response = requests.head(url, headers=self.headers, timeout=10, allow_redirects=True)
            content_type = response.headers.get('content-type', '').lower()
            
            if 'application/pdf' in content_type:
                return {'type': 'pdf', 'url': url}
            elif any(img_type in content_type for img_type in ['image/jpeg', 'image/png', 'image/webp']):
                return {'type': 'image', 'url': url}
            elif 'text/html' in content_type:
                return {'type': 'html', 'url': url}
            else:
                # Fallback: try GET request to check actual content
                response = requests.get(url, headers=self.headers, timeout=10)
                content_type = response.headers.get('content-type', '').lower()
                
                if 'application/pdf' in content_type:
                    return {'type': 'pdf', 'url': url}
                elif any(img_type in content_type for img_type in ['image/jpeg', 'image/png', 'image/webp']):
                    return {'type': 'image', 'url': url}
                else:
                    return {'type': 'html', 'url': url}
                    
        except Exception as e:
            logger.warning(f"Content type detection failed for {url}: {e}")
            return {'type': 'html', 'url': url}  # Default to HTML
    
    def extract_pdf_text(self, url: str) -> str:
        """Extract text from PDF with layout preservation"""
        try:
            import fitz  # PyMuPDF
            import tempfile
            
            # Download PDF
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
            
            try:
                doc = fitz.open(tmp_path)
                text_content = []
                
                for page in doc:
                    # Extract text with layout info
                    blocks = page.get_text("dict")["blocks"]
                    for block in blocks:
                        if "lines" in block:
                            for line in block["lines"]:
                                line_text = ""
                                for span in line["spans"]:
                                    line_text += span["text"]
                                if line_text.strip():
                                    text_content.append(line_text.strip())
                
                doc.close()
                return "\n".join(text_content)
                
            finally:
                os.unlink(tmp_path)
                
        except ImportError:
            logger.warning("PyMuPDF not available, falling back to basic PDF handling")
            return "PDF content detected but PyMuPDF not installed for proper extraction"
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise Exception(f"PDF extraction failed: {str(e)}")
    
    def extract_image_text(self, url: str) -> str:
        """Extract text from image using OCR with better layout handling"""
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
            
            try:
                image = Image.open(tmp_path)
                
                # Use better OCR configuration for menu layout
                custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$€£¥¢₹₽₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿ '
                
                text = pytesseract.image_to_string(image, config=custom_config)
                return text
            except Exception as e:
                logger.error(f"OCR processing failed: {e}")
                raise Exception(f"OCR processing failed: {str(e)}")
            finally:
                os.unlink(tmp_path)
        except Exception as e:
            logger.error(f"Image extraction failed: {e}")
            raise Exception(f"Image extraction failed: {str(e)}")
                
        except Exception as e:
            logger.error(f"Image OCR failed: {e}")
            raise Exception(f"Image OCR failed: {str(e)}")
    
    def scrape_structured_html(self, url: str) -> List[Dict]:
        """Step 1 & 2: Scrape HTML with structure preservation"""
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()
            
            # Try structured extraction first
            structured_content = self._extract_structured_menu(soup)
            if structured_content:
                return structured_content
            
            # Fallback to general content extraction
            return self._extract_general_content(soup)
            
        except Exception as e:
            logger.error(f"HTML scraping failed: {e}")
            raise Exception(f"HTML scraping failed: {str(e)}")
    
    def _extract_structured_menu(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract menu items with preserved structure"""
        menu_items = []
        
        # High-signal selectors for menu content
        menu_selectors = [
            '[data-testid*="menu"]',
            '[role="menu"]',
            '.menu',
            '.menu-section',
            '.menu-item',
            '.food-item',
            '.dish-item',
            '.item',
            'li[class*="menu"]',
            'div[class*="menu"]'
        ]
        
        for selector in menu_selectors:
            elements = soup.select(selector)
            if elements:
                logger.info(f"Found {len(elements)} elements with selector: {selector}")
                
                for element in elements:
                    item = self._extract_menu_item(element)
                    if item and item.get('name'):
                        menu_items.append(item)
                
                if menu_items:
                    return menu_items
        
        return []
    
    def _extract_menu_item(self, element) -> Optional[Dict]:
        """Extract individual menu item with structure"""
        try:
            # Look for name, description, and price in the element or its children
            name_elem = (
                element.select_one('.name, .title, .dish-name, h3, h4, [class*="name"]') or
                element.find(['h3', 'h4', 'h5', 'strong', 'b'])
            )
            
            desc_elem = (
                element.select_one('.description, .desc, .details, p') or
                element.find('p')
            )
            
            price_elem = (
                element.select_one('.price, [class*="price"], .cost') or
                element.find(text=re.compile(r'[\$€£¥]?\d+[.,]?\d*'))
            )
            
            name = name_elem.get_text(strip=True) if name_elem else ""
            description = desc_elem.get_text(strip=True) if desc_elem else ""
            price_text = price_elem.get_text(strip=True) if hasattr(price_elem, 'get_text') else str(price_elem) if price_elem else ""
            
            if name:
                return {
                    'name': name,
                    'description': description,
                    'price_text': price_text,
                    'raw_element': element.get_text(strip=True)
                }
        
        except Exception as e:
            logger.debug(f"Error extracting menu item: {e}")
        
        return None
    
    def _extract_general_content(self, soup: BeautifulSoup) -> List[Dict]:
        """Fallback: extract general content when structured extraction fails"""
        # Look for text that might be menu items
        potential_items = []
        
        # Find elements that might contain menu items
        for element in soup.find_all(['div', 'p', 'li'], class_=re.compile(r'(item|dish|food|menu)', re.I)):
            text = element.get_text(strip=True)
            if len(text) > 10 and len(text) < 500:  # Reasonable length for menu items
                potential_items.append({
                    'name': text.split('\n')[0][:100],  # First line as name
                    'description': text,
                    'price_text': '',
                    'raw_element': text
                })
        
        return potential_items[:20]  # Limit to avoid overwhelming LLM
    
    def parse_with_llm_strict(self, content: Union[str, List[Dict]], restaurant_name: str = "") -> List[Dict]:
        """Step 4: Parse with strict JSON response and validation"""
        try:
            if isinstance(content, list):
                # Structured content from HTML
                prompt = self._create_structured_prompt(content, restaurant_name)
            else:
                # Raw text from OCR/PDF
                prompt = self._create_text_prompt(content, restaurant_name)
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a menu parsing expert. Return ONLY valid JSON array, no other text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            response_content = response.choices[0].message.content
            
            if not response_content:
                raise Exception("OpenAI returned empty response")
            
            # Parse JSON response
            try:
                parsed = json.loads(response_content)
                if isinstance(parsed, dict) and 'dishes' in parsed:
                    dishes = parsed['dishes']
                elif isinstance(parsed, list):
                    dishes = parsed
                else:
                    raise ValueError("Invalid JSON structure")
                
                # Validate each dish with Pydantic
                validated_dishes = []
                for dish in dishes:
                    try:
                        validated_dish = DishItem(**dish)
                        validated_dishes.append(validated_dish.dict())
                    except Exception as e:
                        logger.warning(f"Invalid dish data: {e}")
                        continue
                
                logger.info(f"✅ Successfully parsed {len(validated_dishes)} dishes")
                return validated_dishes
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing failed: {e}")
                raise Exception(f"Invalid JSON response: {str(e)}")
            
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            raise Exception(f"LLM parsing failed: {str(e)}")
    
    def _create_structured_prompt(self, items: List[Dict], restaurant_name: str) -> str:
        """Create prompt for structured HTML content"""
        items_text = "\n".join([
            f"Item {i+1}: {item.get('name', '')} - {item.get('description', '')} - {item.get('price_text', '')}"
            for i, item in enumerate(items[:15])  # Limit to avoid token limits
        ])
        
        return f"""
Parse these menu items from {restaurant_name} and return a JSON object with a "dishes" array.

Menu items:
{items_text}

Return ONLY a JSON object with this exact structure:
{{
  "dishes": [
    {{
      "name": "dish name",
      "description": "dish description",
      "price": 12.99,
      "category": "starter/main/dessert/beverage",
      "ingredients": ["ingredient1", "ingredient2"],
      "dietary_tags": ["vegetarian", "gluten-free"],
      "preparation_style": ["grilled", "fried"]
    }}
  ]
}}

Guidelines:
- Extract prices from price_text fields
- Infer ingredients from descriptions
- Add dietary tags if obvious
- If no valid items found, return empty dishes array
- Return ONLY the JSON object, no other text
"""
    
    def _create_text_prompt(self, text: str, restaurant_name: str) -> str:
        """Create prompt for raw text content"""
        return f"""
Parse this restaurant menu text from {restaurant_name} and return a JSON object with a "dishes" array.

Menu text:
{text[:3000]}  # Limit text length

Return ONLY a JSON object with this exact structure:
{{
  "dishes": [
    {{
      "name": "dish name",
      "description": "dish description", 
      "price": 12.99,
      "category": "starter/main/dessert/beverage",
      "ingredients": ["ingredient1", "ingredient2"],
      "dietary_tags": ["vegetarian", "gluten-free"],
      "preparation_style": ["grilled", "fried"]
    }}
  ]
}}

Guidelines:
- Extract actual prices (convert to float)
- Infer ingredients from descriptions
- Add dietary tags if obvious
- If no valid menu items found, return empty dishes array
- Return ONLY the JSON object, no other text
"""
    
    def post_process_dishes(self, dishes: List[Dict]) -> List[Dict]:
        """Step 5: Post-process and clean dishes"""
        processed = []
        
        for dish in dishes:
            # Clean name
            name = dish.get('name', '').strip()
            if not name or len(name) < 2:
                continue
                
            # Clean description
            description = dish.get('description', '').strip()
            
            # Parse price more robustly
            price = self._parse_price_robust(dish.get('price'))
            
            # Merge broken names/descriptions
            if not description and '\n' in name:
                parts = name.split('\n', 1)
                name = parts[0].strip()
                description = parts[1].strip()
            
            # Remove obvious duplicates
            if any(d['name'].lower() == name.lower() for d in processed):
                continue
            
            processed.append({
                'name': name,
                'description': description,
                'price': price,
                'category': dish.get('category', 'main'),
                'ingredients': dish.get('ingredients', []),
                'dietary_tags': dish.get('dietary_tags', []),
                'preparation_style': dish.get('preparation_style', [])
            })
        
        return processed
    
    def _parse_price_robust(self, price) -> Optional[float]:
        """Robust price parsing with multiple formats"""
        if isinstance(price, (int, float)):
            return float(price)
        
        if isinstance(price, str):
            # Handle various price formats
            price = price.strip()
            
            # Remove currency symbols and common words
            price = re.sub(r'[\$€£¥¢₹₽₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]', '', price)
            price = re.sub(r'\b(price|cost|each|per)\b', '', price, flags=re.IGNORECASE)
            
            # Extract numbers with decimal support
            numbers = re.findall(r'\d+[.,]?\d*', price)
            if numbers:
                # Handle European decimal format (12,50 -> 12.50)
                num_str = numbers[0].replace(',', '.')
                return float(num_str)
        
        return None
    
def parse_menu_url(url: str, restaurant_name: str = "") -> List[Dict]:
    """Main function to parse menu from URL with content-type detection"""
    parser = MenuParser()
    
    try:
        # Step 0: Detect content type
        content_info = parser.detect_content_type(url)
        content_type = content_info['type']
        
        logger.info(f"Detected content type: {content_type} for {url}")
        
        if content_type == 'pdf':
            # Handle PDF
            raw_text = parser.extract_pdf_text(url)
            dishes = parser.parse_with_llm_strict(raw_text, restaurant_name)
            
        elif content_type == 'image':
            # Handle image
            raw_text = parser.extract_image_text(url)
            dishes = parser.parse_with_llm_strict(raw_text, restaurant_name)
            
        else:
            # Handle HTML
            structured_content = parser.scrape_structured_html(url)
            dishes = parser.parse_with_llm_strict(structured_content, restaurant_name)
        
        # Step 5: Post-process
        cleaned_dishes = parser.post_process_dishes(dishes)
        
        logger.info(f"Successfully parsed {len(cleaned_dishes)} dishes from {url}")
        return cleaned_dishes
            
        except Exception as e:
        logger.error(f"Menu parsing failed for {url}: {e}")
        raise Exception(f"Menu parsing failed: {str(e)}")

def parse_menu_image(image_path: str, restaurant_name: str = "") -> List[Dict]:
    """Main function to parse menu from image file"""
    parser = MenuParser()
    
    try:
        # Extract text from image
        raw_text = parser.extract_image_text(image_path)
    
        # Parse with LLM
        dishes = parser.parse_with_llm_strict(raw_text, restaurant_name)
    
        # Post-process
        cleaned_dishes = parser.post_process_dishes(dishes)
    
        logger.info(f"Successfully parsed {len(cleaned_dishes)} dishes from image")
    return cleaned_dishes

    except Exception as e:
        logger.error(f"Image parsing failed: {e}")
        raise Exception(f"Image parsing failed: {str(e)}")