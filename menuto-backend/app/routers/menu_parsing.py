from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import logging
import json
from datetime import datetime
import os
from supabase import create_client, Client
# from sqlalchemy.orm import Session
# from ..database import get_db
# Mock database for now - replace with actual implementation later

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)




# from ..models import ParsedMenu, ParsedDish, User
from ..services.llm_menu_parser import parse_menu_with_llm
from ..services.screenshot_menu_parser import ScreenshotMenuParser
from pydantic import BaseModel

router = APIRouter(prefix="/menu-parsing", tags=["menu-parsing"])
logger = logging.getLogger(__name__)

class DishCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    ingredients: Optional[List[str]] = None
    dietary_tags: Optional[List[str]] = None
    preparation_style: Optional[List[str]] = None

@router.post("/parse-and-store")
async def parse_and_store_menu(
    menu_url: str = Form(..., description="URL of the menu to parse"),
    restaurant_name: str = Form(..., description="Name of the restaurant"),
    restaurant_url: str = Form("", description="Restaurant website URL")
) -> JSONResponse:
    """
    Parse menu from URL and store in Supabase.
    If menu already exists, return existing dishes.
    """
    try:
        logger.info(f"Parsing menu for {restaurant_name} from {menu_url}")
        
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
                "count": len(dishes.data)
            })
        
        # Parse the menu
        dishes_data = parse_menu_with_llm(menu_url, restaurant_name)
        
        if not dishes_data:
            raise HTTPException(
                status_code=400,
                detail="No dishes found in menu. Please check the URL or try a different menu."
            )
        
        # Extract cuisine type from dishes or use default
        cuisine_type = "restaurant"  # Default fallback
        if dishes_data:
            # Try to infer cuisine type from dish names and descriptions
            all_text = " ".join([
                dish.get('name', '') + " " + dish.get('description', '')
                for dish in dishes_data
            ]).lower()
            
            # Simple cuisine detection
            cuisine_keywords = {
                'mediterranean': ['mediterranean', 'greek', 'lebanese', 'turkish', 'falafel', 'hummus', 'tabbouleh'],
                'italian': ['italian', 'pasta', 'pizza', 'risotto', 'bruschetta', 'tiramisu'],
                'mexican': ['mexican', 'taco', 'burrito', 'enchilada', 'guacamole', 'quesadilla'],
                'chinese': ['chinese', 'dim sum', 'kung pao', 'sweet and sour', 'wonton'],
                'japanese': ['japanese', 'sushi', 'sashimi', 'ramen', 'tempura', 'miso'],
                'indian': ['indian', 'curry', 'naan', 'tandoori', 'biryani', 'dal'],
                'thai': ['thai', 'pad thai', 'tom yum', 'green curry', 'mango sticky rice'],
                'french': ['french', 'croissant', 'quiche', 'ratatouille', 'coq au vin'],
                'american': ['american', 'burger', 'hot dog', 'bbq', 'mac and cheese'],
                'greek': ['greek', 'gyro', 'moussaka', 'spanakopita', 'baklava'],
                'turkish': ['turkish', 'kebab', 'doner', 'lahmacun', 'borek'],
                'lebanese': ['lebanese', 'shawarma', 'fattoush', 'manoushe'],
                'vietnamese': ['vietnamese', 'pho', 'banh mi', 'spring roll', 'bun cha'],
                'korean': ['korean', 'bibimbap', 'bulgogi', 'kimchi', 'japchae'],
                'spanish': ['spanish', 'paella', 'tapas', 'gazpacho', 'chorizo'],
                'moroccan': ['moroccan', 'tagine', 'couscous', 'harissa', 'pastilla'],
                'ethiopian': ['ethiopian', 'injera', 'wat', 'berbere', 'doro wat'],
                'caribbean': ['caribbean', 'jerk', 'plantain', 'ackee', 'callaloo'],
                'brazilian': ['brazilian', 'feijoada', 'churrasco', 'moqueca', 'brigadeiro'],
                'peruvian': ['peruvian', 'ceviche', 'lomo saltado', 'aji de gallina', 'anticuchos']
            }
            
            for cuisine, keywords in cuisine_keywords.items():
                if any(keyword in all_text for keyword in keywords):
                    cuisine_type = cuisine
                    break
        
        # Create or update restaurant record in Supabase
        restaurant_data = {
            "name": restaurant_name,
            "address": "",  # We don't have address from menu parsing
            "cuisine_type": cuisine_type,
            "google_place_id": None,  # We don't have this from menu parsing
            "yelp_business_id": None,
            "avg_rating": None,
            "price_level": None
        }
        
        # Upsert restaurant to avoid duplicates
        try:
            supabase.table("restaurants").upsert(restaurant_data, on_conflict="name").execute()
        except Exception as e:
            logger.exception("Supabase restaurant upsert failed")
            raise
        
        # Create menu record in Supabase
        supabase_menu_data = {
            "restaurant_name": restaurant_name,
            "restaurant_url": restaurant_url,
            "menu_url": menu_url,
            "dish_count": len(dishes_data),
            "cuisine_type": cuisine_type
        }
        try:
            supabase_menu = supabase.table("parsed_menus").insert(supabase_menu_data).execute()
        except Exception as e:
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
                "category": dish_data.get('category', 'main'),
                "ingredients": dish_data.get('ingredients', []),
                "dietary_tags": dish_data.get('dietary_tags', []),
                "preparation_style": dish_data.get('preparation_style', []),
                "is_user_added": False
            }
            supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
        
        logger.info(f"Successfully parsed and stored {len(dishes_data)} dishes for {restaurant_name} (cuisine: {cuisine_type})")
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully parsed {len(dishes_data)} dishes",
            "restaurant": restaurant_name,
            "cuisine_type": cuisine_type,
            "dishes": dishes_data,
            "count": len(dishes_data)
        })
        
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
        menus = (
            supabase.table("parsed_menus")
            .select("*")
            .ilike("restaurant_name", f"%{restaurant_name}%")
            .order("created_at", desc=True)
            .execute()
        )
        
        if not menus.data:
            raise HTTPException(
                status_code=404,
                detail=f"No menu found for restaurant: {restaurant_name}"
            )
        
        # Get the most recent menu
        menu = menus.data[0]  # Now guaranteed to be most recent due to ordering
        
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
    try:
        logger.info(f"Parsing menu image for {restaurant_name}")
        
        # Save image temporarily and extract text
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            content = await menu_image.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # Extract text from image using OCR
            from PIL import Image
            import pytesseract
            
            image = Image.open(tmp_path)
            text = pytesseract.image_to_string(image)
            
            # Parse with LLM
            from ..services.llm_menu_parser import LLMMenuParser
            parser = LLMMenuParser()
            dishes_data = parser.parse_menu_with_llm(text, restaurant_name)
            
            if not dishes_data:
                raise HTTPException(
                    status_code=400,
                    detail="No dishes found in image. Please try a clearer image."
                )
            
            # Store in database
            return await store_parsed_dishes(dishes_data, restaurant_name, restaurant_url)
            
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        logger.error(f"Image parsing failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu image: {str(e)}"
        )

@router.post("/parse-screenshot")
async def parse_menu_from_screenshot(
    menu_image: UploadFile = File(..., description="Menu screenshot file"),
    restaurant_name: str = Form(..., description="Name of the restaurant"),
    restaurant_url: str = Form("", description="Restaurant website URL")
) -> JSONResponse:
    """
    Parse menu from uploaded screenshot using OpenAI GPT-4 Vision.
    """
    try:
        logger.info(f"Parsing menu screenshot for {restaurant_name}")
        
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
            supabase_menu_data = {
                "restaurant_name": restaurant_name,
                "restaurant_url": restaurant_url,
                "menu_url": f"screenshot_upload_{datetime.now().isoformat()}",
                "dish_count": len(dishes_data),
                "cuisine_type": "restaurant"  # Default, will be inferred from dishes
            }
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
                    "category": dish_data.get('category', 'main'),
                    "ingredients": dish_data.get('ingredients', []),
                    "dietary_tags": dish_data.get('dietary_tags', []),
                    "preparation_style": dish_data.get('preparation_style', []),
                    "is_user_added": False
                }
                supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
            
            logger.info(f"Successfully saved {len(dishes_data)} dishes to Supabase for {restaurant_name}")
            
            return JSONResponse({
                "success": True,
                "message": result["message"],
                "restaurant": restaurant_name,
                "dishes": dishes_data,
                "count": len(dishes_data)
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
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
    restaurant_url: str = Form("", description="Restaurant website URL")
) -> JSONResponse:
    """
    Parse menu from pasted text and store in database.
    """
    try:
        logger.info(f"Parsing menu text for {restaurant_name}")
        
        # Parse with LLM
        from ..services.llm_menu_parser import LLMMenuParser
        parser = LLMMenuParser()
        dishes_data = parser.parse_menu_with_llm(menu_text, restaurant_name)
        
        if not dishes_data:
            raise HTTPException(
                status_code=400,
                detail="No dishes found in text. Please check the content and try again."
            )
        
        # Store in database
        return await store_parsed_dishes(dishes_data, restaurant_name, restaurant_url)
        
    except Exception as e:
        logger.error(f"Text parsing failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu text: {str(e)}"
        )

async def store_parsed_dishes(dishes_data: List[Dict], restaurant_name: str, restaurant_url: str) -> JSONResponse:
    """Helper function to store parsed dishes in Supabase"""
    try:
        # Check if menu already exists in Supabase
        existing_menus = supabase.table("parsed_menus").select("*").eq("restaurant_name", restaurant_name).execute()
        
        if existing_menus.data:
            # Update existing menu
            menu_id = existing_menus.data[0]["id"]
            
            # Update menu record
            supabase.table("parsed_menus").update({
                "dish_count": len(dishes_data)
            }).eq("id", menu_id).execute()
            
            # Clear existing dishes
            supabase.table("parsed_dishes").delete().eq("menu_id", menu_id).execute()
            
            # Add new dishes
            for dish_data in dishes_data:
                supabase_dish_data = {
                    "menu_id": menu_id,
                    "name": dish_data['name'],
                    "description": dish_data.get('description'),
                    "category": dish_data.get('category', 'main'),
                    "ingredients": dish_data.get('ingredients', []),
                    "dietary_tags": dish_data.get('dietary_tags', []),
                    "preparation_style": dish_data.get('preparation_style', []),
                    "is_user_added": False
                }
                supabase.table("parsed_dishes").insert(supabase_dish_data).execute()
        else:
            # Create new menu
            supabase_menu_data = {
                "restaurant_name": restaurant_name,
                "restaurant_url": restaurant_url,
                "menu_url": f"text_upload_{datetime.now().isoformat()}",  # Placeholder for text uploads
                "dish_count": len(dishes_data),
                "cuisine_type": "restaurant"  # Default, will be inferred from dishes
            }
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
                    "category": dish_data.get('category', 'main'),
                    "ingredients": dish_data.get('ingredients', []),
                    "dietary_tags": dish_data.get('dietary_tags', []),
                    "preparation_style": dish_data.get('preparation_style', []),
                    "is_user_added": False
                }
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
            .order("created_at", desc=True)
            .execute()
        )
        
        if not menus.data:
            raise HTTPException(
                status_code=404,
                detail=f"No menu found for restaurant: {restaurant_name}"
            )
        
        menu = menus.data[0]  # Now guaranteed to be most recent due to ordering
        
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
