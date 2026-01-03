import os
import json
import logging
import re
import tempfile
import time
from typing import Dict, List, Optional, Tuple, Union
from urllib.parse import urljoin, urlparse
from uuid import uuid4

import openai
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from PIL import Image
from pydantic import BaseModel

from app.services.menu_parsing_utils import DishItem, parse_price_robust, post_process_dishes

try:
    # In some environments (.env is ignored/locked down) this may be blocked; env vars can still be set externally.
    load_dotenv()
except Exception as e:
    _ = e

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MenuParsingError(Exception):
    """
    Structured exception for menu parsing failures.

    Routers should catch this and convert it into a consistent HTTP response.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "menu_parsing_error",
        details: Optional[Dict] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}

    def to_public_dict(self) -> Dict:
        return {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            },
        }

class MenuParser:
    def __init__(self, client: Optional[object] = None):
        """
        client:
          - Optional injected OpenAI client for tests (must implement .chat.completions.create()).
          - If omitted, uses OPENAI_API_KEY from env.
        """
        if client is not None:
            self.client = client
        else:
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

    def _new_request_id(self) -> str:
        return uuid4().hex[:12]

    def _looks_like_pdf(self, first_bytes: bytes) -> bool:
        return first_bytes.startswith(b"%PDF")

    def _looks_like_png(self, first_bytes: bytes) -> bool:
        return first_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    def _looks_like_jpeg(self, first_bytes: bytes) -> bool:
        return first_bytes.startswith(b"\xff\xd8\xff")

    def _looks_like_webp(self, first_bytes: bytes) -> bool:
        # RIFF....WEBP
        return len(first_bytes) >= 12 and first_bytes[0:4] == b"RIFF" and first_bytes[8:12] == b"WEBP"
    
    def detect_content_type(self, url: str, *, request_id: str = "") -> Dict[str, str]:
        """Step 0: Detect content type before scraping.

        Failure modes handled:
        - Servers that block HEAD
        - Missing/wrong content-type headers
        - URL extension hints
        - Sniffing first bytes (PDF/image)
        """
        rid = request_id or self._new_request_id()
        try:
            # 0) URL extension hints (cheap + surprisingly reliable)
            path = (urlparse(url).path or "").lower()
            if path.endswith(".pdf"):
                return {"type": "pdf", "url": url}
            if any(path.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                return {"type": "image", "url": url}

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
                # Fallback: sniff bytes (Range when supported, stream to avoid full download)
                sniff_headers = dict(self.headers)
                sniff_headers["Range"] = "bytes=0-2047"
                response = requests.get(url, headers=sniff_headers, timeout=10, stream=True, allow_redirects=True)
                content_type = (response.headers.get("content-type", "") or "").lower()
                try:
                    first = response.raw.read(2048) or b""
                finally:
                    try:
                        response.close()
                    except Exception:
                        pass

                if "application/pdf" in content_type or self._looks_like_pdf(first):
                    return {"type": "pdf", "url": url}
                if any(t in content_type for t in ["image/jpeg", "image/png", "image/webp"]) or (
                    self._looks_like_jpeg(first) or self._looks_like_png(first) or self._looks_like_webp(first)
                ):
                    return {"type": "image", "url": url}
                return {"type": "html", "url": url}
                    
        except Exception as e:
            logger.warning(f"[{rid}] Content type detection failed for {url}: {e}")
            return {'type': 'html', 'url': url}  # Default to HTML
    
    def extract_pdf_text(self, url: str) -> str:
        """Extract text from PDF with layout preservation"""
        try:
            logger.info(f"📄 Starting PDF extraction for URL: {url}")
            import fitz  # PyMuPDF
            
            # Download PDF
            logger.info(f"📥 Downloading PDF from: {url}")
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            logger.info(f"✅ PDF downloaded successfully, size: {len(response.content)} bytes")
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
                logger.info(f"📁 PDF saved to temporary file: {tmp_path}")
            
            try:
                doc = fitz.open(tmp_path)
                logger.info(f"📖 Opened PDF document with {doc.page_count} pages")
                text_content = []
                
                for page_num in range(doc.page_count):
                    page = doc[page_num]
                    logger.info(f"📄 Processing page {page_num + 1}")
                    
                    # Extract text with layout info
                    blocks = page.get_text("dict")["blocks"]
                    page_text = []
                    
                    for block in blocks:
                        if "lines" in block:
                            for line in block["lines"]:
                                line_text = ""
                                for span in line["spans"]:
                                    line_text += span["text"]
                                if line_text.strip():
                                    page_text.append(line_text.strip())
                    
                    text_content.extend(page_text)
                    logger.info(f"📝 Extracted {len(page_text)} text lines from page {page_num + 1}")
                
                doc.close()
                full_text = "\n".join(text_content)
                logger.info(f"✅ PDF extraction complete. Total text length: {len(full_text)} characters")
                logger.info(f"📝 First 200 characters: {full_text[:200]}...")
                return full_text
                
            finally:
                os.unlink(tmp_path)
                logger.info(f"🗑️ Cleaned up temporary file: {tmp_path}")
                
        except ImportError:
            raise MenuParsingError(
                "PDF parsing is not available on this server (missing PyMuPDF).",
                status_code=500,
                code="pdf_parser_missing",
            )
        except Exception as e:
            logger.error(f"❌ PDF extraction failed: {e}")
            logger.exception("PDF extraction exception details")
            raise MenuParsingError(
                "Failed to extract text from PDF.",
                status_code=400,
                code="pdf_extraction_failed",
                details={"url": url, "error": str(e)},
            )
    
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

                # Lazy import: pytesseract import can be fragile in some environments.
                try:
                    import pytesseract  # type: ignore
                except Exception as e:
                    raise MenuParsingError(
                        "OCR is not available on this server.",
                        status_code=500,
                        code="ocr_unavailable",
                        details={"error": str(e)},
                    )
                
                # Use better OCR configuration for menu layout
                # Avoid aggressive whitelists; menus often contain accents/symbols.
                custom_config = r'--oem 3 --psm 6'
                
                text = pytesseract.image_to_string(image, config=custom_config)
                return text
            except Exception as e:
                logger.error(f"OCR processing failed: {e}")
                raise MenuParsingError(
                    "OCR failed to extract text from image.",
                    status_code=400,
                    code="ocr_failed",
                    details={"url": url, "error": str(e)},
                )
            finally:
                os.unlink(tmp_path)
        except Exception as e:
            logger.error(f"Image extraction failed: {e}")
            raise MenuParsingError(
                "Failed to download/process image for OCR.",
                status_code=400,
                code="image_extraction_failed",
                details={"url": url, "error": str(e)},
            )
    
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
            raise MenuParsingError(
                "Failed to fetch/parse menu HTML.",
                status_code=400,
                code="html_scrape_failed",
                details={"url": url, "error": str(e)},
            )
    
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
    
    def parse_with_llm_strict(
        self,
        content: Union[str, List[Dict]],
        restaurant_name: str = "",
        *,
        request_id: str = "",
        debug_ctx: Optional[Dict] = None,
        model: str = "gpt-4o-mini",
        timeout_s: int = 180,  # 3 minutes for large menus
    ) -> Tuple[List[Dict], str]:
        """Step 4: Parse with strict JSON response and validation.

        Returns (dishes, cuisine_type).
        """
        rid = request_id or self._new_request_id()
        try:
            if isinstance(content, list):
                # Structured content from HTML
                prompt = self._create_structured_prompt(content, restaurant_name)
            else:
                # Raw text from OCR/PDF
                prompt = self._create_text_prompt(content, restaurant_name)
            
            def _call_openai(user_prompt: str) -> str:
                t0 = time.perf_counter()
                resp = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a menu parsing expert. Return ONLY a valid JSON object, no markdown, no commentary."},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=16384,  # Max for gpt-4o-mini to handle 80+ dish menus
                    response_format={"type": "json_object"},
                    timeout=timeout_s,
                )
                t1 = time.perf_counter()
                if debug_ctx is not None:
                    usage = getattr(resp, "usage", None)
                    debug_ctx.setdefault("llm", {})
                    debug_ctx["llm"].update(
                        {
                            "model": model,
                            "prompt_chars": len(user_prompt or ""),
                            "latency_ms": int((t1 - t0) * 1000),
                            "usage": {
                                "input_tokens": getattr(usage, "prompt_tokens", None),
                                "output_tokens": getattr(usage, "completion_tokens", None),
                                "total_tokens": getattr(usage, "total_tokens", None),
                            }
                            if usage is not None
                            else None,
                        }
                    )
                return resp.choices[0].message.content or ""

            def _log_snippet(tag: str, text: str) -> None:
                t = (text or "").strip()
                if not t:
                    logger.info(f"[{rid}] {tag}: <empty>")
                    return
                head = t[:400]
                tail = t[-400:] if len(t) > 400 else ""
                logger.info(f"[{rid}] {tag}: head(400)={head!r}")
                if tail:
                    logger.info(f"[{rid}] {tag}: tail(400)={tail!r}")

            def _repair_json_with_llm(bad_json_text: str) -> str:
                # Last-resort: ask the model to output corrected JSON only.
                repair_prompt = (
                    "You will be given INVALID JSON. Return ONLY corrected valid JSON that matches the same schema "
                    "(an object with 'dishes' array and optional 'cuisine_type'). Do not add commentary.\n\n"
                    "INVALID JSON:\n"
                    f"{bad_json_text}"
                )
                return _call_openai(repair_prompt)

            response_content = _call_openai(prompt)
            
            if not response_content:
                raise MenuParsingError(
                    "LLM returned an empty response.",
                    status_code=502,
                    code="llm_empty_response",
                    details={"restaurant_name": restaurant_name},
                )
            
            # Parse JSON response
            try:
                parsed = json.loads(response_content)
                if isinstance(parsed, dict) and 'dishes' in parsed:
                    dishes = parsed['dishes']
                    cuisine_type = parsed.get('cuisine_type', 'restaurant')
                elif isinstance(parsed, list):
                    dishes = parsed
                    cuisine_type = 'restaurant'
                else:
                    raise ValueError("Invalid JSON structure")
                
                # Validate each dish with Pydantic
                validated_dishes = []
                for dish in dishes:
                    try:
                        coerced = dict(dish or {})
                        coerced["price"] = parse_price_robust(coerced.get("price"))
                        validated_dish = DishItem(**coerced)
                        validated_dishes.append(validated_dish.dict())
                    except Exception as e:
                        logger.warning(f"[{rid}] Invalid dish data: {e}")
                        continue
                
                logger.info(f"[{rid}] ✅ Successfully parsed {len(validated_dishes)} dishes with cuisine_type: {cuisine_type}")
                return validated_dishes, cuisine_type
                
            except json.JSONDecodeError as e:
                # Sometimes models still include code fences / extra text. Try to recover.
                logger.error(f"[{rid}] JSON parsing failed: {e}")
                _log_snippet("LLM raw output (first/last)", response_content)

                def _coerce_json(text: str) -> str:
                    t = (text or "").strip()
                    if t.startswith("```"):
                        # Strip fenced blocks
                        t = re.sub(r"^```[a-zA-Z0-9]*\n?", "", t)
                        t = re.sub(r"\n?```$", "", t)
                        t = t.strip()
                    start = t.find("{")
                    end = t.rfind("}")
                    if start != -1 and end != -1 and end > start:
                        t = t[start : end + 1]
                    return t

                def _try_close_truncated_json(text: str) -> str:
                    """
                    Attempt to close truncated JSON by finding the last complete dish object
                    and properly closing the array/object structure.
                    """
                    t = (text or "").strip()
                    # If already ends with }, assume it's complete
                    if t.endswith("}"):
                        return t
                    
                    # Find last complete dish object (ends with "}")
                    # Pattern: look for the last "}" that closes a dish
                    last_complete_dish = t.rfind("},")
                    last_complete_dish_alt = t.rfind("}\n")
                    last_pos = max(last_complete_dish, last_complete_dish_alt)
                    
                    if last_pos > 0:
                        # Truncate to last complete dish and close the structure
                        truncated = t[:last_pos + 1]  # Include the "}"
                        # Count open brackets to determine what needs closing
                        open_brackets = truncated.count("[") - truncated.count("]")
                        open_braces = truncated.count("{") - truncated.count("}")
                        
                        # Close arrays and objects
                        close_str = "]" * open_brackets + "}" * open_braces
                        result = truncated + close_str
                        logger.info(f"[{rid}] Recovered truncated JSON: removed {len(t) - last_pos - 1} chars, added '{close_str}'")
                        return result
                    
                    return t

                coerced = _coerce_json(response_content)
                # Try to close truncated JSON if coercion didn't find a closing brace
                if not coerced.endswith("}"):
                    coerced = _try_close_truncated_json(response_content)
                try:
                    parsed = json.loads(coerced)
                except Exception:
                    # Retry once with a stronger instruction.
                    retry_prompt = (
                        prompt
                        + "\n\nIMPORTANT: Return ONLY a JSON object matching the required schema. Do not include ``` fences."
                    )
                    retry_content = _call_openai(retry_prompt)
                    _log_snippet("LLM retry output (first/last)", retry_content)
                    coerced_retry = _coerce_json(retry_content)
                    try:
                        parsed = json.loads(coerced_retry)
                    except Exception:
                        # Repair pass (handles missing commas / unescaped quotes / truncation artifacts)
                        repaired = _repair_json_with_llm(retry_content)
                        _log_snippet("LLM repaired output (first/last)", repaired)
                        coerced_repaired = _coerce_json(repaired)
                        parsed = json.loads(coerced_repaired)

                if isinstance(parsed, dict) and "dishes" in parsed:
                    dishes = parsed["dishes"]
                    cuisine_type = parsed.get("cuisine_type", "restaurant")
                elif isinstance(parsed, list):
                    dishes = parsed
                    cuisine_type = "restaurant"
                else:
                    raise Exception("Invalid JSON structure")

                validated_dishes = []
                for dish in dishes:
                    try:
                        coerced = dict(dish or {})
                        coerced["price"] = parse_price_robust(coerced.get("price"))
                        validated_dish = DishItem(**coerced)
                        validated_dishes.append(validated_dish.dict())
                    except Exception as ve:
                        logger.warning(f"[{rid}] Invalid dish data: {ve}")
                        continue

                logger.info(f"[{rid}] ✅ Successfully parsed {len(validated_dishes)} dishes with cuisine_type: {cuisine_type}")
                return validated_dishes, cuisine_type
            
        except Exception as e:
            if isinstance(e, MenuParsingError):
                raise
            logger.error(f"[{rid}] LLM parsing failed: {e}")
            raise MenuParsingError(
                "LLM parsing failed.",
                status_code=502,
                code="llm_failed",
                details={"restaurant_name": restaurant_name, "error": str(e)},
            )
    
    def _create_structured_prompt(self, items: List[Dict], restaurant_name: str) -> str:
        """Create prompt for structured HTML content"""
        items_text = "\n".join([
            f"Item {i+1}: {item.get('name', '')} - {item.get('description', '')} - {item.get('price_text', '')}"
            for i, item in enumerate(items[:15])  # Limit to avoid token limits
        ])
        
        return f"""
Parse these menu items from {restaurant_name} and return a JSON object with a "dishes" array and "cuisine_type".

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
  ],
  "cuisine_type": "mediterranean"
}}

Guidelines:
- Extract prices from price_text fields
- Infer ingredients from descriptions
- Add dietary tags if obvious
- Determine cuisine_type from dish names, descriptions, and restaurant name
- Common cuisine types: mediterranean, italian, mexican, chinese, japanese, indian, thai, french, american, greek, turkish, lebanese, vietnamese, korean, spanish, moroccan, ethiopian, caribbean, brazilian, peruvian
- If no valid items found, return empty dishes array
- Return ONLY the JSON object, no other text
"""
    
    def _create_text_prompt(self, text: str, restaurant_name: str) -> str:
        """Create prompt for raw text content"""
        # Use up to 12000 chars to handle large menus (about 3000 tokens input)
        menu_text = text[:12000]
        return f"""
Parse this ENTIRE restaurant menu text from {restaurant_name} and return a JSON object with a "dishes" array and "cuisine_type".

IMPORTANT: Extract ALL dishes from ALL sections of the menu including:
- Appetizers, Starters
- Main courses, Entrees  
- Soups, Salads
- Sides
- Desserts
- Drinks, Beverages
- Lunch/Dinner specials
- Any other menu sections

Menu text:
{menu_text}

Return ONLY a JSON object. Keep descriptions SHORT (max 20 words). Omit empty arrays.

{{
  "dishes": [
    {{"name": "dish name", "description": "short description", "price": 12.99, "category": "starter", "dietary_tags": ["vegetarian"]}}
  ],
  "cuisine_type": "nepalese"
}}

Rules:
- Extract ALL dishes from the entire menu
- Categories: starter, main, side, dessert, beverage, soup, salad
- Only include dietary_tags if explicitly mentioned (vegetarian, vegan, gluten-free, spicy)
- Keep descriptions under 20 words
- Return ONLY valid JSON
"""
    
    def post_process_dishes(self, dishes: List[Dict]) -> List[Dict]:
        """Step 5: Post-process and clean dishes (canonicalize schema)."""
        return post_process_dishes(dishes)
    
    def _parse_price_robust(self, price) -> Optional[float]:
        """Robust price parsing with multiple formats (wrapper for tests/back-compat)."""
        return parse_price_robust(price)
    
def parse_menu_url_with_cuisine(
    url: str,
    restaurant_name: str = "",
    *,
    parser: Optional[MenuParser] = None,
) -> Tuple[List[Dict], str]:
    """Parse menu from URL with content-type detection.

    Returns (cleaned_dishes, cuisine_type).
    """
    parser = parser or MenuParser()
    
    try:
        request_id = parser._new_request_id()
        logger.info(f"[{request_id}] 🚀 Starting menu parsing for restaurant: {restaurant_name}")
        logger.info(f"[{request_id}] 🔗 URL: {url}")
        
        # Step 0: Detect content type
        t0 = time.perf_counter()
        content_info = parser.detect_content_type(url, request_id=request_id)
        content_type = content_info['type']
        t1 = time.perf_counter()
        
        logger.info(f"[{request_id}] 📋 Detected content type: {content_type} for {url} ({int((t1 - t0) * 1000)}ms)")
        debug_ctx: Dict = {"request_id": request_id, "url": url, "restaurant_name": restaurant_name, "content_type": content_type, "stage_ms": {}}
        
        if content_type == 'pdf':
            logger.info(f"[{request_id}] 📄 Processing PDF for {restaurant_name}")
            # Handle PDF
            t_pdf0 = time.perf_counter()
            raw_text = parser.extract_pdf_text(url)
            debug_ctx["stage_ms"]["extract_ms"] = int((time.perf_counter() - t_pdf0) * 1000)
            logger.info(f"📝 PDF text extracted, length: {len(raw_text)}")
            
            if len(raw_text.strip()) < 50:
                logger.warning(f"[{request_id}] ⚠️ Very little text extracted from PDF: '{raw_text[:120]}'")
                raise MenuParsingError(
                    "Very little text could be extracted from the PDF (it may be scanned or blocked).",
                    status_code=400,
                    code="pdf_too_little_text",
                    details={"url": url, "extracted_chars": len(raw_text.strip())},
                )
            
            t_llm0 = time.perf_counter()
            dishes, cuisine_type = parser.parse_with_llm_strict(raw_text, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
            debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t_llm0) * 1000)
            logger.info(f"[{request_id}] 🤖 LLM parsing completed, got {len(dishes)} dishes")
            
        elif content_type == 'image':
            logger.info(f"[{request_id}] 🖼️ Processing image for {restaurant_name}")
            # Handle image
            t_img0 = time.perf_counter()
            raw_text = parser.extract_image_text(url)
            debug_ctx["stage_ms"]["extract_ms"] = int((time.perf_counter() - t_img0) * 1000)
            t_llm0 = time.perf_counter()
            dishes, cuisine_type = parser.parse_with_llm_strict(raw_text, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
            debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t_llm0) * 1000)
            
        else:
            logger.info(f"[{request_id}] 🌐 Processing HTML for {restaurant_name}")
            # Handle HTML
            t_html0 = time.perf_counter()
            structured_content = parser.scrape_structured_html(url)
            debug_ctx["stage_ms"]["extract_ms"] = int((time.perf_counter() - t_html0) * 1000)
            t_llm0 = time.perf_counter()
            dishes, cuisine_type = parser.parse_with_llm_strict(structured_content, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
            debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t_llm0) * 1000)
        
        # Step 5: Post-process
        logger.info(f"[{request_id}] 🧹 Post-processing {len(dishes)} dishes")
        t_pp0 = time.perf_counter()
        cleaned_dishes = parser.post_process_dishes(dishes)
        debug_ctx["stage_ms"]["postprocess_ms"] = int((time.perf_counter() - t_pp0) * 1000)
        
        logger.info(f"[{request_id}] ✅ Successfully parsed {len(cleaned_dishes)} dishes from {url}")
        return cleaned_dishes, (cuisine_type or "restaurant")
            
    except Exception as e:
        if isinstance(e, MenuParsingError):
            raise
        logger.error(f"❌ Menu parsing failed for {url}: {e}")
        logger.exception("Menu parsing exception details")
        raise MenuParsingError(
            "Menu parsing failed.",
            status_code=400,
            code="menu_parsing_failed",
            details={"url": url, "restaurant_name": restaurant_name, "error": str(e)},
        )


def parse_menu_url_with_cuisine_debug(
    url: str,
    restaurant_name: str = "",
    *,
    parser: Optional[MenuParser] = None,
) -> Tuple[List[Dict], str, Dict]:
    """
    Debug variant: returns (cleaned_dishes, cuisine_type, debug_info).
    """
    parser = parser or MenuParser()
    request_id = parser._new_request_id()
    debug_ctx: Dict = {"request_id": request_id, "url": url, "restaurant_name": restaurant_name, "stage_ms": {}}
    t0 = time.perf_counter()
    content_info = parser.detect_content_type(url, request_id=request_id)
    debug_ctx["content_type"] = content_info["type"]
    debug_ctx["stage_ms"]["detect_ms"] = int((time.perf_counter() - t0) * 1000)

    try:
        if content_info["type"] == "pdf":
            t1 = time.perf_counter()
            raw = parser.extract_pdf_text(url)
            debug_ctx["stage_ms"]["extract_ms"] = int((time.perf_counter() - t1) * 1000)
            if len((raw or "").strip()) < 50:
                raise MenuParsingError(
                    "Very little text could be extracted from the PDF (it may be scanned or blocked).",
                    status_code=400,
                    code="pdf_too_little_text",
                    details={"url": url, "extracted_chars": len((raw or "").strip())},
                )
            t2 = time.perf_counter()
            dishes, cuisine = parser.parse_with_llm_strict(raw, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
            debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t2) * 1000)
        elif content_info["type"] == "image":
            t1 = time.perf_counter()
            raw = parser.extract_image_text(url)
            debug_ctx["stage_ms"]["extract_ms"] = int((time.perf_counter() - t1) * 1000)
            t2 = time.perf_counter()
            dishes, cuisine = parser.parse_with_llm_strict(raw, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
            debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t2) * 1000)
        else:
            t1 = time.perf_counter()
            structured = parser.scrape_structured_html(url)
            debug_ctx["stage_ms"]["extract_ms"] = int((time.perf_counter() - t1) * 1000)
            t2 = time.perf_counter()
            dishes, cuisine = parser.parse_with_llm_strict(structured, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
            debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t2) * 1000)

        t3 = time.perf_counter()
        cleaned = parser.post_process_dishes(dishes)
        debug_ctx["stage_ms"]["postprocess_ms"] = int((time.perf_counter() - t3) * 1000)
        return cleaned, (cuisine or "restaurant"), debug_ctx
    except Exception as e:
        if isinstance(e, MenuParsingError):
            # include request_id for correlation
            e.details.setdefault("request_id", request_id)
            raise
        raise MenuParsingError(
            "Menu parsing failed.",
            status_code=400,
            code="menu_parsing_failed",
            details={"url": url, "restaurant_name": restaurant_name, "error": str(e), "request_id": request_id},
        )

def parse_menu_url(url: str, restaurant_name: str = "") -> List[Dict]:
    """Back-compat: return only dishes list."""
    dishes, _cuisine = parse_menu_url_with_cuisine(url, restaurant_name)
    return dishes


def parse_menu_text_with_cuisine(menu_text: str, restaurant_name: str = "") -> Tuple[List[Dict], str]:
    """Parse already-extracted menu text with the LLM.

    Returns (cleaned_dishes, cuisine_type).
    """
    parser = MenuParser()
    dishes, cuisine_type = parser.parse_with_llm_strict(menu_text, restaurant_name)
    cleaned = parser.post_process_dishes(dishes)
    return cleaned, (cuisine_type or "restaurant")


def parse_menu_text_with_cuisine_debug(menu_text: str, restaurant_name: str = "") -> Tuple[List[Dict], str, Dict]:
    """Debug variant: returns (cleaned_dishes, cuisine_type, debug_info)."""
    parser = MenuParser()
    request_id = parser._new_request_id()
    debug_ctx: Dict = {"request_id": request_id, "restaurant_name": restaurant_name, "stage_ms": {}}
    t0 = time.perf_counter()
    dishes, cuisine_type = parser.parse_with_llm_strict(menu_text, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
    debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t0) * 1000)
    t1 = time.perf_counter()
    cleaned = parser.post_process_dishes(dishes)
    debug_ctx["stage_ms"]["postprocess_ms"] = int((time.perf_counter() - t1) * 1000)
    return cleaned, (cuisine_type or "restaurant"), debug_ctx


def _ocr_local_image(image_path: str) -> str:
    """OCR a local image file path using pytesseract."""
    try:
        import pytesseract  # type: ignore
    except Exception as e:
        raise MenuParsingError(
            "OCR is not available on this server.",
            status_code=500,
            code="ocr_unavailable",
            details={"error": str(e)},
        )
    image = Image.open(image_path)
    custom_config = r'--oem 3 --psm 6'
    return pytesseract.image_to_string(image, config=custom_config)


def parse_menu_image_with_cuisine(image_path: str, restaurant_name: str = "") -> Tuple[List[Dict], str]:
    """Parse menu from a local image file path.

    Returns (cleaned_dishes, cuisine_type).
    """
    parser = MenuParser()
    try:
        raw_text = _ocr_local_image(image_path)
        dishes, cuisine_type = parser.parse_with_llm_strict(raw_text, restaurant_name)
        cleaned = parser.post_process_dishes(dishes)
        logger.info(f"✅ Successfully parsed {len(cleaned)} dishes from local image")
        return cleaned, (cuisine_type or "restaurant")
    except Exception as e:
        logger.error(f"Image parsing failed: {e}")
        if isinstance(e, MenuParsingError):
            raise
        raise MenuParsingError(
            "Image parsing failed.",
            status_code=400,
            code="image_parsing_failed",
            details={"image_path": image_path, "restaurant_name": restaurant_name, "error": str(e)},
        )


def parse_menu_image_with_cuisine_debug(image_path: str, restaurant_name: str = "") -> Tuple[List[Dict], str, Dict]:
    """Debug variant: returns (cleaned_dishes, cuisine_type, debug_info)."""
    parser = MenuParser()
    request_id = parser._new_request_id()
    debug_ctx: Dict = {"request_id": request_id, "restaurant_name": restaurant_name, "stage_ms": {}}
    t0 = time.perf_counter()
    raw_text = _ocr_local_image(image_path)
    debug_ctx["stage_ms"]["ocr_ms"] = int((time.perf_counter() - t0) * 1000)
    t1 = time.perf_counter()
    dishes, cuisine_type = parser.parse_with_llm_strict(raw_text, restaurant_name, request_id=request_id, debug_ctx=debug_ctx)
    debug_ctx["stage_ms"]["llm_ms"] = int((time.perf_counter() - t1) * 1000)
    t2 = time.perf_counter()
    cleaned = parser.post_process_dishes(dishes)
    debug_ctx["stage_ms"]["postprocess_ms"] = int((time.perf_counter() - t2) * 1000)
    return cleaned, (cuisine_type or "restaurant"), debug_ctx


def parse_menu_image(image_path: str, restaurant_name: str = "") -> List[Dict]:
    """Back-compat: return only dishes list."""
    dishes, _cuisine = parse_menu_image_with_cuisine(image_path, restaurant_name)
    return dishes