from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import logging
import json
from datetime import datetime
import os
from uuid import uuid4
from supabase import create_client, Client
# from sqlalchemy.orm import Session
# from ..database import get_db
# Mock database for now - replace with actual implementation later

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Prefer service role so RLS doesn't block backend writes
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Placeholder for empty restaurant_url (legacy NOT NULL compat only)
# Note: menu_url never uses placeholder - text/screenshot ingests generate synthetic IDs
MISSING_RESTAURANT_URL = "__missing_restaurant_url__"


def _normalize_url(url: Optional[str], placeholder: str) -> str:
    """Normalize empty/null URLs to placeholder for NOT NULL constraint."""
    if not url or not url.strip():
        return placeholder
    return url.strip()


def _log_supabase_error(operation: str, result, payload: Dict) -> None:
    """Log Supabase errors with full details for debugging."""
    error_info = None
    
    if hasattr(result, 'error') and result.error:
        error_info = result.error
    elif hasattr(result, 'status_code') and result.status_code >= 400:
        try:
            error_info = result.json() if hasattr(result, 'json') else result.text
        except Exception:
            error_info = getattr(result, 'text', str(result))
    
    if error_info:
        logger.error(f"❌ Supabase {operation} failed")
        logger.error(f"   Error: {error_info}")
        logger.error(f"   Payload: {payload}")
    else:
        logger.error(f"❌ Supabase {operation} failed (no data returned)")
        logger.error(f"   Result: {result}")
        logger.error(f"   Payload: {payload}")


def _safe_supabase_insert(table: str, payload: Dict, fallback_remove: List[str] = None):
    """
    Insert into Supabase with proper error logging.
    If insert fails and fallback_remove is provided, retry without those columns.
    """
    try:
        result = supabase.table(table).insert(payload).execute()
        if not result.data:
            _log_supabase_error(f"{table} insert", result, payload)
        return result
    except Exception as e:
        logger.error(f"❌ Supabase {table} insert exception: {e}")
        logger.error(f"   Payload: {payload}")
        
        if fallback_remove:
            fallback_payload = {k: v for k, v in payload.items() if k not in fallback_remove}
            logger.info(f"   Retrying without: {fallback_remove}")
            try:
                result = supabase.table(table).insert(fallback_payload).execute()
                if not result.data:
                    _log_supabase_error(f"{table} insert (fallback)", result, fallback_payload)
                return result
            except Exception as e2:
                logger.error(f"❌ Supabase {table} fallback insert also failed: {e2}")
                logger.error(f"   Fallback payload: {fallback_payload}")
                raise
        raise


# from ..models import ParsedMenu, ParsedDish, User
# from ..services.llm_menu_parser import parse_menu_with_llm
from ..services.screenshot_menu_parser import ScreenshotMenuParser
from ..services.menu_parser import (
    MenuParsingError,
    parse_menu_text_with_cuisine,
    parse_menu_text_with_cuisine_debug,
    parse_menu_url_with_cuisine,
    parse_menu_url_with_cuisine_debug,
)
from ..services.menu_parsing_utils import infer_menu_period_from_url
from pydantic import BaseModel

router = APIRouter(prefix="/menu-parsing", tags=["menu-parsing"])
logger = logging.getLogger(__name__)

class DishCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    category: str
    ingredients: Optional[List[str]] = None
    dietary_tags: Optional[List[str]] = None
    preparation_style: Optional[List[str]] = None

@router.post("/parse-and-store")
async def parse_and_store_menu(
    menu_url: str = Form(..., description="URL of the menu to parse"),
    restaurant_name: str = Form(..., description="Name of the restaurant"),
    restaurant_url: str = Form("", description="Restaurant website URL"),
    debug: bool = Query(False, description="If true, include debug timings/LLM usage in response"),
) -> JSONResponse:
    """
    Parse menu from URL and store in Supabase.
    If menu already exists, return existing dishes.
    """
    try:
        request_id = uuid4().hex[:12]
        menu_period = infer_menu_period_from_url(menu_url)
        prompt_restaurant_name = restaurant_name
        if menu_period and menu_period != "menu":
            prompt_restaurant_name = f"{restaurant_name} ({menu_period.title()} Menu)"

        logger.info(
            f"[{request_id}] Parsing menu for {restaurant_name} period={menu_period} from {menu_url} debug={debug}"
        )
        
        # Check if menu already exists in Supabase
        existing_menus = supabase.table("parsed_menus").select("*").eq("menu_url", menu_url).execute()
        
        if existing_menus.data:
            logger.info(f"Menu already exists for {restaurant_name}")
            menu_id = existing_menus.data[0]["id"]
            dishes = supabase.table("parsed_dishes").select("*").eq("menu_id", menu_id).execute()
            
            return JSONResponse({
                "success": True,
                "message": "Menu already exists in database",
                "restaurant": restaurant_name,
                "dishes": dishes.data,
                "count": len(dishes.data),
                "request_id": request_id,
            })
        
        # Parse the menu (URL can be HTML/PDF/image)
        debug_info = None
        if debug:
            dishes_data, cuisine_type, debug_info = parse_menu_url_with_cuisine_debug(menu_url, prompt_restaurant_name)
            request_id = (debug_info or {}).get("request_id", request_id)
        else:
            dishes_data, cuisine_type = parse_menu_url_with_cuisine(menu_url, prompt_restaurant_name)
        
        if not dishes_data:
            return JSONResponse(
                {
                    "success": False,
                    "error": {
                        "code": "no_dishes_found",
                        "message": "No dishes found in menu. Please check the URL or try a different menu.",
                        "details": {
                            "restaurant_name": restaurant_name,
                            "menu_url": menu_url,
                            "request_id": request_id,
                        },
                    },
                },
                status_code=400,
            )
        
        # cuisine_type is returned from parser; fall back if missing
        cuisine_type = cuisine_type or "restaurant"
        
        # Skip restaurant table creation - we only use parsed_menus and parsed_dishes
        logger.info(f"📝 Skipping restaurant table creation - using parsed_menus/parsed_dishes only")
        
        # Create menu record in Supabase
        # place_id is the primary identity; restaurant_url kept for legacy compat
        # Note: frontend sends place_id as restaurant_url (legacy naming)
        place_id = restaurant_url.strip() if restaurant_url else None
        supabase_menu_data = {
            "place_id": place_id,  # Primary identity column
            "restaurant_name": restaurant_name,
            "restaurant_url": _normalize_url(restaurant_url, MISSING_RESTAURANT_URL),  # Legacy compat
            "menu_url": menu_url,  # Real URL
            "dish_count": len(dishes_data),
            "cuisine_type": cuisine_type
        }
        try:
            supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
        except Exception as e:
            # place_id column might not exist yet
            supabase_menu_data.pop("place_id", None)
            try:
                supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
            except Exception:
                logger.exception("Supabase menu insert failed")
                raise HTTPException(status_code=500, detail="Failed to create menu record")
        
        if not supabase_menu.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to create menu record"
            )
        
        menu_id = supabase_menu.data[0]["id"]
        
        # Create dish records in Supabase
        for dish_data in dishes_data:
            supabase_dish_data = {
                "menu_id": menu_id,
                "name": dish_data['name'],
                "description": dish_data.get('description'),
                "price": dish_data.get("price"),
                "category": dish_data.get('category', 'main'),
                "ingredients": dish_data.get('ingredients', []),
                "dietary_tags": dish_data.get('dietary_tags', []),
                "preparation_style": dish_data.get('preparation_style', []),
                "is_user_added": False
            }
            try:
                supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
            except Exception:
                # Back-compat: older schemas may not have a `price` column.
                supabase_dish_data.pop("price", None)
                supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
        
        logger.info(f"Successfully parsed and stored {len(dishes_data)} dishes for {restaurant_name} (cuisine: {cuisine_type})")
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully parsed {len(dishes_data)} dishes",
            "restaurant": restaurant_name,
            "cuisine_type": cuisine_type,
            "dishes": dishes_data,
            "count": len(dishes_data),
            "request_id": request_id,
            **({"debug": debug_info} if debug and debug_info else {}),
        })
        
    except MenuParsingError as e:
        logger.error(f"Menu parsing failed: {e.code} {e.message}")
        return JSONResponse(e.to_public_dict(), status_code=e.status_code)
    except Exception as e:
        logger.error(f"Menu parsing failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu: {str(e)}"
        )

@router.get("/restaurant/{restaurant_name}")
async def get_restaurant_menu(
    restaurant_name: str
) -> JSONResponse:
    """
    Get all dishes for a restaurant (parsed + user-added).
    """
    try:
        # Find the most recent menu for this restaurant in Supabase
        # Some environments use different timestamp column names; avoid hard dependency on created_at.
        menus = (
            supabase.table("parsed_menus")
            .select("*")
            .ilike("restaurant_name", f"%{restaurant_name}%")
            .execute()
        )
        
        if not menus.data:
            raise HTTPException(
                status_code=404,
                detail=f"No menu found for restaurant: {restaurant_name}"
            )
        
        # Pick a "most recent" menu if there are multiple. Prefer updated_at/created_at if present.
        def _ts(row):
            return row.get("updated_at") or row.get("created_at") or ""

        menu = sorted(menus.data, key=_ts, reverse=True)[0]
        
        # Get dishes for this menu
        dishes = supabase.table("parsed_dishes").select("*").eq("menu_id", menu["id"]).execute()
        
        if not dishes.data:
            raise HTTPException(
                status_code=404,
                detail=f"No dishes found for restaurant: {restaurant_name}"
            )
        
        # Group dishes by category
        categories = {}
        for dish in dishes.data:
            cat = dish.get("category", "main")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append({
                "id": dish["id"],
                "name": dish["name"],
                "description": dish.get("description"),
                "ingredients": dish.get("ingredients", []),
                "dietary_tags": dish.get("dietary_tags", []),
                "preparation_style": dish.get("preparation_style", []),
                "is_user_added": dish.get("is_user_added", False)
            })
        
        return JSONResponse({
            "success": True,
            "restaurant": menu["restaurant_name"],
            "menu_url": menu.get("menu_url", ""),
            "parsed_at": menu.get("created_at", ""),
            "categories": categories,
            "total_dishes": len(dishes.data)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting restaurant menu: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving menu: {str(e)}"
        )

@router.post("/parse-image")
async def parse_menu_from_image(
    menu_image: UploadFile = File(..., description="Menu image file"),
    restaurant_name: str = Form(..., description="Restaurant name"),
    restaurant_url: str = Form("", description="Restaurant website URL")
) -> JSONResponse:
    """
    Parse menu from uploaded image and store in database.
    """
    raise HTTPException(
        status_code=501,
        detail=(
            "Not implemented. Use /menu-parser/parse-image for OCR parsing "
            "or /menu-parsing/parse-screenshot for Vision parsing."
        ),
    )

@router.post("/parse-screenshot")
async def parse_menu_from_screenshot(
    menu_image: UploadFile = File(..., description="Menu screenshot file"),
    restaurant_name: str = Form(..., description="Name of the restaurant"),
    restaurant_url: str = Form("", description="Restaurant website URL"),
    debug: bool = Query(False, description="If true, include request_id in response for log correlation"),
) -> JSONResponse:
    """
    Parse menu from uploaded screenshot using OpenAI GPT-4 Vision.
    """
    try:
        request_id = uuid4().hex[:12]
        logger.info(f"[{request_id}] Parsing menu screenshot for {restaurant_name} debug={debug}")
        
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            content = await menu_image.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Parse the screenshot using OpenAI Vision
            logger.info(f"Initializing ScreenshotMenuParser for {restaurant_name}")
            parser = ScreenshotMenuParser()
            
            logger.info(f"Starting screenshot parsing for {restaurant_name}")
            result = parser.parse_menu_screenshot(temp_file_path, restaurant_name)
            
            logger.info(f"Screenshot parsing result: {result.get('success', False)}")
            
            if not result["success"]:
                logger.error(f"Screenshot parsing failed: {result['message']}")
                raise HTTPException(
                    status_code=400,
                    detail=result["message"]
                )
            
            # Store in Supabase
            dishes_data = result["dishes"]
            
            # Create menu record in Supabase
            # place_id is the primary identity; restaurant_url kept for legacy compat
            place_id = restaurant_url.strip() if restaurant_url else None
            supabase_menu_data = {
                "place_id": place_id,  # Primary identity column
                "restaurant_name": restaurant_name,
                "restaurant_url": _normalize_url(restaurant_url, MISSING_RESTAURANT_URL),  # Legacy compat
                "menu_url": f"screenshot_upload_{datetime.now().isoformat()}",
                "dish_count": len(dishes_data),
                "cuisine_type": "restaurant"  # Default, will be inferred from dishes
            }
            try:
                supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
            except Exception:
                # place_id column might not exist yet
                supabase_menu_data.pop("place_id", None)
                supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
            
            if not supabase_menu.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create menu record"
                )
            
            menu_id = supabase_menu.data[0]["id"]
            
            # Create dish records in Supabase
            for dish_data in dishes_data:
                supabase_dish_data = {
                    "menu_id": menu_id,
                    "name": dish_data['name'],
                    "description": dish_data.get('description', ''),
                    "price": dish_data.get("price"),
                    "category": dish_data.get('category', 'main'),
                    "ingredients": dish_data.get('ingredients', []),
                    "dietary_tags": dish_data.get('dietary_tags', []),
                    "preparation_style": dish_data.get('preparation_style', []),
                    "is_user_added": False
                }
                try:
                    supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
                except Exception:
                    supabase_dish_data.pop("price", None)
                    supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
            
            logger.info(f"Successfully saved {len(dishes_data)} dishes to Supabase for {restaurant_name}")
            
            return JSONResponse({
                "success": True,
                "message": result["message"],
                "restaurant": restaurant_name,
                "dishes": dishes_data,
                "count": len(dishes_data),
                "request_id": request_id,
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing menu screenshot: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse menu screenshot: {str(e)}"
        )

@router.post("/parse-text")
async def parse_menu_from_text(
    menu_text: str = Form(..., description="Menu text content"),
    restaurant_name: str = Form(..., description="Restaurant name"),
    restaurant_url: str = Form("", description="Restaurant website URL"),
    place_id: str = Form("", description="Stable restaurant identifier (Google place_id)"),
    vicinity: str = Form("", description="Human-readable location/address context"),
    debug: bool = Query(False, description="If true, include debug timings/LLM usage in response"),
) -> JSONResponse:
    """
    Parse menu from pasted text and store in database.
    """
    try:
        request_id = uuid4().hex[:12]
        logger.info(f"[{request_id}] Parsing menu text for {restaurant_name} debug={debug}")

        # Prefer stable place_id for storage keying (back-compat: restaurant_url)
        storage_key = (place_id or restaurant_url or "").strip()
        restaurant_context = restaurant_name
        if vicinity:
            restaurant_context = f"{restaurant_name} ({vicinity})"

        debug_info = None
        if debug:
            dishes_data, cuisine_type, debug_info = parse_menu_text_with_cuisine_debug(menu_text, restaurant_context)
            request_id = (debug_info or {}).get("request_id", request_id)
        else:
            dishes_data, cuisine_type = parse_menu_text_with_cuisine(menu_text, restaurant_context)
        
        if not dishes_data:
            return JSONResponse(
                {
                    "success": False,
                    "error": {
                        "code": "no_dishes_found",
                        "message": "No dishes found in text. Please check the content and try again.",
                        "details": {"restaurant_name": restaurant_name, "request_id": request_id},
                    },
                },
                status_code=400,
            )
        
        # Store in database
        resp = await store_parsed_dishes(dishes_data, restaurant_name, storage_key, cuisine_type=cuisine_type)
        payload = json.loads(resp.body.decode("utf-8")) if resp.body else {}
        payload["request_id"] = request_id
        if debug and debug_info:
            payload["debug"] = debug_info
        return JSONResponse(payload, status_code=resp.status_code)
        
    except MenuParsingError as e:
        logger.error(f"Text parsing failed: {e.code} {e.message}")
        return JSONResponse(e.to_public_dict(), status_code=e.status_code)
    except Exception as e:
        logger.error(f"Text parsing failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu text: {str(e)}"
        )

async def store_parsed_dishes(dishes_data: List[Dict], restaurant_name: str, restaurant_url: str, cuisine_type: str = "restaurant") -> JSONResponse:
    """Helper function to store parsed dishes in Supabase"""
    try:
        # Check if menu already exists in Supabase
        existing_menus = supabase.table("parsed_menus").select("*").eq("restaurant_name", restaurant_name).execute()
        
        if existing_menus.data:
            # Update existing menu
            menu_id = existing_menus.data[0]["id"]
            
            # Get current dish count to update total
            current_dishes = supabase.table("parsed_dishes").select("*").eq("menu_id", menu_id).execute()
            current_count = len(current_dishes.data) if current_dishes.data else 0
            
            # Update menu record with new total count
            supabase.table("parsed_menus").update({
                "dish_count": current_count + len(dishes_data)
            }).eq("id", menu_id).execute()
            
            # DON'T clear existing dishes - append new ones instead
            logger.info(f"📝 Appending {len(dishes_data)} new dishes to existing menu (current: {current_count})")
            
            # Add new dishes (append, don't replace)
            for dish_data in dishes_data:
                # Check if dish already exists to avoid duplicates
                existing_dish = supabase.table("parsed_dishes").select("*").eq("menu_id", menu_id).eq("name", dish_data['name']).execute()
                
                if not existing_dish.data:
                    supabase_dish_data = {
                        "menu_id": menu_id,
                        "name": dish_data['name'],
                        "description": dish_data.get('description'),
                        "price": dish_data.get("price"),
                        "category": dish_data.get('category', 'main'),
                        "ingredients": dish_data.get('ingredients', []),
                        "dietary_tags": dish_data.get('dietary_tags', []),
                        "preparation_style": dish_data.get('preparation_style', []),
                        "is_user_added": False
                    }
                    try:
                        supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
                    except Exception:
                        supabase_dish_data.pop("price", None)
                        supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
                else:
                    logger.info(f"⚠️ Skipping duplicate dish: {dish_data['name']}")
        else:
            # Create new menu
            # place_id is the primary identity; restaurant_url kept for legacy compat
            place_id = restaurant_url.strip() if restaurant_url else None
            supabase_menu_data = {
                "place_id": place_id,  # Primary identity column
                "restaurant_name": restaurant_name,
                "restaurant_url": _normalize_url(restaurant_url, MISSING_RESTAURANT_URL),  # Legacy compat
                "menu_url": f"text_upload_{datetime.now().isoformat()}",  # Synthetic ID for text uploads
                "dish_count": len(dishes_data),
                "cuisine_type": cuisine_type or "restaurant"
            }
            try:
                supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
            except Exception:
                # place_id column might not exist yet
                supabase_menu_data.pop("place_id", None)
                supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
            
            if not supabase_menu.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create menu record"
                )
            
            menu_id = supabase_menu.data[0]["id"]
            
            # Add dishes
            for dish_data in dishes_data:
                supabase_dish_data = {
                    "menu_id": menu_id,
                    "name": dish_data['name'],
                    "description": dish_data.get('description'),
                    "price": dish_data.get("price"),
                    "category": dish_data.get('category', 'main'),
                    "ingredients": dish_data.get('ingredients', []),
                    "dietary_tags": dish_data.get('dietary_tags', []),
                    "preparation_style": dish_data.get('preparation_style', []),
                    "is_user_added": False
                }
                try:
                    supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
                except Exception:
                    supabase_dish_data.pop("price", None)
                    supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
        
        logger.info(f"Successfully stored {len(dishes_data)} dishes for {restaurant_name}")
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully parsed {len(dishes_data)} dishes",
            "restaurant": restaurant_name,
            "dishes": dishes_data,
            "count": len(dishes_data)
        })
        
    except Exception as e:
        logger.error(f"Database storage failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store dishes: {str(e)}"
        )

@router.post("/add-dish")
async def add_dish_to_menu(
    restaurant_name: str = Form(..., description="Restaurant name"),
    dish_data: str = Form(..., description="Dish data as JSON string"),
    user_id: int = Form(..., description="User ID adding the dish")
) -> JSONResponse:
    """
    Add a new dish to an existing restaurant menu.
    """
    try:
        # Find the most recent menu for this restaurant in Supabase
        menus = (
            supabase.table("parsed_menus")
            .select("*")
            .ilike("restaurant_name", f"%{restaurant_name}%")
            .execute()
        )
        
        if not menus.data:
            raise HTTPException(
                status_code=404,
                detail=f"No menu found for restaurant: {restaurant_name}"
            )
        
        def _ts(row):
            return row.get("updated_at") or row.get("created_at") or ""

        menu = sorted(menus.data, key=_ts, reverse=True)[0]
        
        # Parse dish data from JSON string
        try:
            dish_data_dict = json.loads(dish_data)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid dish data format"
            )
        
        # Create new dish in Supabase
        supabase_dish_data = {
            "menu_id": menu["id"],
            "name": dish_data_dict.get('name', ''),
            "description": dish_data_dict.get('description'),
            "category": dish_data_dict.get('category', 'main'),
            "ingredients": dish_data_dict.get('ingredients', []),
            "dietary_tags": dish_data_dict.get('dietary_tags', []),
            "preparation_style": dish_data_dict.get('preparation_style', []),
            "is_user_added": True
        }
        
        dish_result = supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
        
        if not dish_result.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to add dish"
            )
        
        dish = dish_result.data[0]
        
        logger.info(f"User {user_id} added dish '{dish['name']}' to {restaurant_name}")
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully added dish '{dish['name']}' to {restaurant_name}",
            "dish": {
                "id": dish["id"],
                "name": dish["name"],
                "description": dish.get("description"),
                "category": dish.get("category"),
                "ingredients": dish.get("ingredients", []),
                "dietary_tags": dish.get("dietary_tags", []),
                "preparation_style": dish.get("preparation_style", []),
                "is_user_added": True
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding dish: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error adding dish: {str(e)}"
        )

@router.get("/restaurants")
async def list_restaurants() -> JSONResponse:
    """
    List all restaurants with parsed menus.
    """
    try:
        menus = supabase.table("parsed_menus").select("*").order("restaurant_name").execute()
        
        restaurants = []
        for menu in menus.data:
            restaurants.append({
                "restaurant_name": menu["restaurant_name"],
                "restaurant_url": menu.get("restaurant_url", ""),
                "menu_url": menu.get("menu_url", ""),
                "dish_count": menu.get("dish_count", 0),
                "cuisine_type": menu.get("cuisine_type", "restaurant"),
                "parsed_at": menu.get("created_at", "")
            })
        
        return JSONResponse({
            "success": True,
            "restaurants": restaurants,
            "count": len(restaurants)
        })
        
    except Exception as e:
        logger.error(f"Error listing restaurants: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing restaurants: {str(e)}"
        )

@router.get("/search")
async def search_restaurants_by_name(
    query: str = Query(..., description="Search query for restaurant names"),
    limit: int = Query(20, le=50, description="Number of results to return")
) -> JSONResponse:
    """
    Search restaurants by name and return their LLM-extracted cuisine types.
    """
    try:
        # Search in parsed_menus table for restaurants matching the query
        menus = supabase.table("parsed_menus").select("*").ilike("restaurant_name", f"%{query}%").limit(limit).execute()
        
        # Deduplicate by restaurant name
        seen_names = set()
        restaurants = []
        for menu in menus.data:
            restaurant_name = menu["restaurant_name"]
            if restaurant_name not in seen_names:
                seen_names.add(restaurant_name)
                restaurants.append({
                    "place_id": f"menu_{menu['id']}",  # Generate a unique ID
                    "name": restaurant_name,
                    "vicinity": menu.get("restaurant_url", "Menu available"),  # Use restaurant URL as address
                    "cuisine_type": menu.get("cuisine_type", "restaurant"),
                    "rating": 4.0,  # Default rating
                    "price_level": None,
                    "has_menu": True
                })
        
        return JSONResponse({
            "query": query,
            "restaurants": restaurants,
            "total": len(restaurants),
            "source": "parsed_menus"
        })
        
    except Exception as e:
        logger.error(f"Error searching restaurants: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error searching restaurants: {str(e)}"
        )
