from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import logging
import json
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ParsedMenu, ParsedDish, User
from ..services.llm_menu_parser import parse_menu_with_llm
from ..services.screenshot_menu_parser import ScreenshotMenuParser
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
    db: Session = Depends(get_db)
) -> JSONResponse:
    """
    Parse menu from URL and store in database.
    If menu already exists, return existing dishes.
    """
    try:
        logger.info(f"Parsing menu for {restaurant_name} from {menu_url}")
        
        # Check if menu already exists
        existing_menu = db.query(ParsedMenu).filter(
            ParsedMenu.menu_url == menu_url
        ).first()
        
        if existing_menu:
            logger.info(f"Menu already exists for {restaurant_name}")
            dishes = existing_menu.dishes
            return JSONResponse({
                "success": True,
                "message": "Menu already exists in database",
                "restaurant": restaurant_name,
                "dishes": [
                    {
                        "id": dish.id,
                        "name": dish.name,
                        "description": dish.description,
                        "category": dish.category,
                        "ingredients": dish.ingredients,
                        "dietary_tags": dish.dietary_tags,
                        "preparation_style": dish.preparation_style,
                        "is_user_added": dish.is_user_added
                    }
                    for dish in dishes
                ],
                "count": len(dishes),
                "parsed_at": existing_menu.parsed_at.isoformat()
            })
        
        # Parse the menu
        dishes_data = parse_menu_with_llm(menu_url, restaurant_name)
        
        if not dishes_data:
            raise HTTPException(
                status_code=400,
                detail="No dishes found in menu. Please check the URL or try a different menu."
            )
        
        # Create menu record
        menu = ParsedMenu(
            restaurant_name=restaurant_name,
            restaurant_url=restaurant_url,
            menu_url=menu_url,
            dish_count=len(dishes_data)
        )
        db.add(menu)
        db.flush()  # Get the menu ID
        
        # Create dish records
        for dish_data in dishes_data:
            dish = ParsedDish(
                menu_id=menu.id,
                name=dish_data['name'],
                description=dish_data.get('description'),
                category=dish_data.get('category', 'main'),
                ingredients=dish_data.get('ingredients', []),
                dietary_tags=dish_data.get('dietary_tags', []),
                preparation_style=dish_data.get('preparation_style', []),
                is_user_added=False
            )
            db.add(dish)
        
        db.commit()
        
        logger.info(f"Successfully parsed and stored {len(dishes_data)} dishes for {restaurant_name}")
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully parsed {len(dishes_data)} dishes",
            "restaurant": restaurant_name,
            "dishes": dishes_data,
            "count": len(dishes_data),
            "parsed_at": menu.parsed_at.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Menu parsing failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu: {str(e)}"
        )

@router.get("/restaurant/{restaurant_name}")
async def get_restaurant_menu(
    restaurant_name: str,
    db: Session = Depends(get_db)
) -> JSONResponse:
    """
    Get all dishes for a restaurant (parsed + user-added).
    """
    try:
        # Find the most recent menu for this restaurant
        menu = db.query(ParsedMenu).filter(
            ParsedMenu.restaurant_name.ilike(f"%{restaurant_name}%")
        ).order_by(ParsedMenu.parsed_at.desc()).first()
        
        if not menu:
            raise HTTPException(
                status_code=404,
                detail=f"No menu found for restaurant: {restaurant_name}"
            )
        
        dishes = menu.dishes
        
        # Group dishes by category
        categories = {}
        for dish in dishes:
            cat = dish.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append({
                "id": dish.id,
                "name": dish.name,
                "description": dish.description,
                "ingredients": dish.ingredients,
                "dietary_tags": dish.dietary_tags,
                "preparation_style": dish.preparation_style,
                "is_user_added": dish.is_user_added
            })
        
        return JSONResponse({
            "success": True,
            "restaurant": menu.restaurant_name,
            "menu_url": menu.menu_url,
            "parsed_at": menu.parsed_at.isoformat(),
            "categories": categories,
            "total_dishes": len(dishes)
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
    restaurant_url: str = Form("", description="Restaurant website URL"),
    db: Session = Depends(get_db)
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
            return await store_parsed_dishes(dishes_data, restaurant_name, restaurant_url, db)
            
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
    restaurant_url: str = Form("", description="Restaurant website URL"),
    db: Session = Depends(get_db)
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
            
            # Store in database
            dishes_data = result["dishes"]
            
            # Create menu record
            menu = ParsedMenu(
                restaurant_name=restaurant_name,
                restaurant_url=restaurant_url,
                menu_url=f"screenshot_upload_{datetime.now().isoformat()}",
                dish_count=len(dishes_data)
            )
            db.add(menu)
            db.flush()
            
            # Create dish records
            for dish_data in dishes_data:
                dish = ParsedDish(
                    menu_id=menu.id,
                    name=dish_data['name'],
                    description=dish_data.get('description', ''),
                    price=dish_data.get('price', 0),
                    category=dish_data.get('category', 'main'),
                    ingredients=dish_data.get('ingredients', []),
                    dietary_tags=dish_data.get('dietary_tags', []),
                    preparation_style=dish_data.get('preparation_style', []),
                    is_user_added=False
                )
                db.add(dish)
            
            db.commit()
            
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
    restaurant_url: str = Form("", description="Restaurant website URL"),
    db: Session = Depends(get_db)
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
        return await store_parsed_dishes(dishes_data, restaurant_name, restaurant_url, db)
        
    except Exception as e:
        logger.error(f"Text parsing failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu text: {str(e)}"
        )

async def store_parsed_dishes(dishes_data: List[Dict], restaurant_name: str, restaurant_url: str, db: Session) -> JSONResponse:
    """Helper function to store parsed dishes in database"""
    try:
        # Check if menu already exists
        existing_menu = db.query(ParsedMenu).filter(
            ParsedMenu.restaurant_name == restaurant_name
        ).first()
        
        if existing_menu:
            # Update existing menu
            existing_menu.dish_count = len(dishes_data)
            existing_menu.parsed_at = datetime.utcnow()
            
            # Clear existing dishes
            db.query(ParsedDish).filter(ParsedDish.menu_id == existing_menu.id).delete()
            
            # Add new dishes
            for dish_data in dishes_data:
                dish = ParsedDish(
                    menu_id=existing_menu.id,
                    name=dish_data['name'],
                    description=dish_data.get('description'),
                    category=dish_data.get('category', 'main'),
                    ingredients=dish_data.get('ingredients', []),
                    dietary_tags=dish_data.get('dietary_tags', []),
                    preparation_style=dish_data.get('preparation_style', []),
                    is_user_added=False
                )
                db.add(dish)
        else:
            # Create new menu
            menu = ParsedMenu(
                restaurant_name=restaurant_name,
                restaurant_url=restaurant_url,
                menu_url="",  # Not applicable for text/image
                dish_count=len(dishes_data)
            )
            db.add(menu)
            db.flush()
            
            # Add dishes
            for dish_data in dishes_data:
                dish = ParsedDish(
                    menu_id=menu.id,
                    name=dish_data['name'],
                    description=dish_data.get('description'),
                    category=dish_data.get('category', 'main'),
                    ingredients=dish_data.get('ingredients', []),
                    dietary_tags=dish_data.get('dietary_tags', []),
                    preparation_style=dish_data.get('preparation_style', []),
                    is_user_added=False
                )
                db.add(dish)
        
        db.commit()
        
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
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store dishes: {str(e)}"
        )

@router.post("/add-dish")
async def add_dish_to_menu(
    restaurant_name: str = Form(..., description="Restaurant name"),
    dish_data: str = Form(..., description="Dish data as JSON string"),
    user_id: int = Form(..., description="User ID adding the dish"),
    db: Session = Depends(get_db)
) -> JSONResponse:
    """
    Add a new dish to an existing restaurant menu.
    """
    try:
        # Find the most recent menu for this restaurant
        menu = db.query(ParsedMenu).filter(
            ParsedMenu.restaurant_name.ilike(f"%{restaurant_name}%")
        ).order_by(ParsedMenu.parsed_at.desc()).first()
        
        if not menu:
            raise HTTPException(
                status_code=404,
                detail=f"No menu found for restaurant: {restaurant_name}"
            )
        
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Parse dish data from JSON string
        try:
            dish_data_dict = json.loads(dish_data)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid dish data format"
            )
        
        # Create new dish
        dish = ParsedDish(
            menu_id=menu.id,
            name=dish_data_dict.get('name', ''),
            description=dish_data_dict.get('description'),
            price=dish_data_dict.get('price'),
            category=dish_data_dict.get('category', 'main'),
            ingredients=dish_data_dict.get('ingredients', []),
            dietary_tags=dish_data_dict.get('dietary_tags', []),
            preparation_style=dish_data_dict.get('preparation_style', []),
            is_user_added=True,
            added_by_user_id=user_id
        )
        
        db.add(dish)
        db.commit()
        
        logger.info(f"User {user_id} added dish '{dish_data.name}' to {restaurant_name}")
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully added dish '{dish_data.name}' to {restaurant_name}",
            "dish": {
                "id": dish.id,
                "name": dish.name,
                "description": dish.description,
                "category": dish.category,
                "ingredients": dish.ingredients,
                "dietary_tags": dish.dietary_tags,
                "preparation_style": dish.preparation_style,
                "is_user_added": True,
                "added_by_user": user.username
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding dish: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error adding dish: {str(e)}"
        )

@router.get("/restaurants")
async def list_restaurants(db: Session = Depends(get_db)) -> JSONResponse:
    """
    List all restaurants with parsed menus.
    """
    try:
        menus = db.query(ParsedMenu).order_by(ParsedMenu.restaurant_name).all()
        
        restaurants = []
        for menu in menus:
            restaurants.append({
                "restaurant_name": menu.restaurant_name,
                "restaurant_url": menu.restaurant_url,
                "menu_url": menu.menu_url,
                "dish_count": menu.dish_count,
                "parsed_at": menu.parsed_at.isoformat()
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
