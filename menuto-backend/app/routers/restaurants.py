from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Restaurant, Dish
# from app.services.menu_parser import parse_menu_image, parse_menu_url  # Temporarily disabled due to syntax errors
from typing import List
import tempfile
import os

router = APIRouter()

@router.post("/upload-menu")
async def upload_menu(
    restaurant_name: str,
    menu_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and parse a menu image"""
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
        content = await menu_image.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Parse menu
        dishes_data = parse_menu_image(tmp_file_path, restaurant_name)
        
        # Find or create restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.name == restaurant_name).first()
        if not restaurant:
            restaurant = Restaurant(name=restaurant_name)
            db.add(restaurant)
            db.commit()
            db.refresh(restaurant)
        
        # Add dishes
        created_dishes = []
        for dish_data in dishes_data:
            # Check if dish already exists
            existing_dish = db.query(Dish).filter(
                Dish.restaurant_id == restaurant.id,
                Dish.name == dish_data["name"]
            ).first()
            
            if not existing_dish:
                dish = Dish(
                    restaurant_id=restaurant.id,
                    **dish_data
                )
                db.add(dish)
                created_dishes.append(dish_data)
        
        db.commit()
        
        return {
            "restaurant": {
                "id": restaurant.id,
                "name": restaurant.name
            },
            "dishes": created_dishes,
            "message": f"Successfully parsed {len(created_dishes)} dishes"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up temp file
        os.unlink(tmp_file_path)

@router.post("/upload-menu-url")
async def upload_menu_url(
    menu_url: str = Form(...),
    restaurant_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Parse a menu from a website URL"""
    
    print(f"🔗 Received menu URL upload request:")
    print(f"   menu_url: {menu_url}")
    print(f"   restaurant_name: {restaurant_name}")
    
    try:
        print(f"🌐 Starting to parse menu from URL...")
        # Parse menu from URL
        dishes_data = parse_menu_url(menu_url, restaurant_name)
        print(f"✅ Successfully parsed {len(dishes_data)} dishes from URL")
        
        # Find or create restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.name == restaurant_name).first()
        if not restaurant:
            print(f"🏪 Creating new restaurant: {restaurant_name}")
            restaurant = Restaurant(name=restaurant_name)
            db.add(restaurant)
            db.commit()
            db.refresh(restaurant)
        else:
            print(f"🏪 Found existing restaurant: {restaurant_name} (ID: {restaurant.id})")
        
        # Add dishes
        created_dishes = []
        for dish_data in dishes_data:
            # Check if dish already exists
            existing_dish = db.query(Dish).filter(
                Dish.restaurant_id == restaurant.id,
                Dish.name == dish_data["name"]
            ).first()
            
            if not existing_dish:
                dish = Dish(
                    restaurant_id=restaurant.id,
                    **dish_data
                )
                db.add(dish)
                created_dishes.append(dish_data)
            else:
                print(f"⏭️  Skipping existing dish: {dish_data['name']}")
        
        db.commit()
        print(f"💾 Successfully saved {len(created_dishes)} new dishes to database")
        
        return {
            "restaurant": {
                "id": restaurant.id,
                "name": restaurant.name
            },
            "dishes": created_dishes,
            "message": f"Successfully parsed {len(created_dishes)} dishes from URL"
        }
        
    except Exception as e:
        print(f"❌ Error processing menu URL: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-menu-url-json")  
async def upload_menu_url_json(
    request: Request,
    db: Session = Depends(get_db)
):
    """Parse a menu from a website URL using JSON payload"""
    try:
        # Get JSON data from request
        data = await request.json()
        menu_url = data.get('menu_url')
        restaurant_name = data.get('restaurant_name')
        
        if not menu_url or not restaurant_name:
            raise HTTPException(status_code=400, detail="menu_url and restaurant_name are required")
        
        print(f"🔗 Received JSON menu URL upload request:")
        print(f"   menu_url: {menu_url}")
        print(f"   restaurant_name: {restaurant_name}")
        
        # Parse menu from URL
        dishes_data = parse_menu_url(menu_url, restaurant_name)
        
        # Find or create restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.name == restaurant_name).first()
        if not restaurant:
            restaurant = Restaurant(name=restaurant_name)
            db.add(restaurant)
            db.commit()
            db.refresh(restaurant)
        
        # Add dishes
        created_dishes = []
        for dish_data in dishes_data:
            existing_dish = db.query(Dish).filter(
                Dish.restaurant_id == restaurant.id,
                Dish.name == dish_data["name"]
            ).first()
            
            if not existing_dish:
                dish = Dish(
                    restaurant_id=restaurant.id,
                    **dish_data
                )
                db.add(dish)
                created_dishes.append(dish_data)
        
        db.commit()
        
        return {
            "restaurant": {
                "id": restaurant.id,
                "name": restaurant.name
            },
            "dishes": created_dishes,
            "message": f"Successfully parsed {len(created_dishes)} dishes from URL"
        }
        
    except Exception as e:
        print(f"❌ JSON Error processing menu URL: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{restaurant_id}/menu")
async def get_restaurant_menu(restaurant_id: int, db: Session = Depends(get_db)):
    """Get all dishes for a restaurant"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    dishes = db.query(Dish).filter(Dish.restaurant_id == restaurant_id).all()
    
    return {
        "restaurant": {
            "id": restaurant.id,
            "name": restaurant.name,
            "cuisine_type": restaurant.cuisine_type
        },
        "dishes": [
            {
                "id": dish.id,
                "name": dish.name,
                "description": dish.description,
                "price": dish.price,
                "category": dish.category,
                "ingredients": dish.ingredients,
                "dietary_tags": dish.dietary_tags,
                "avg_rating": dish.avg_rating
            }
            for dish in dishes
        ]
    }

@router.get("/{restaurant_id}/has-menu")
async def check_restaurant_menu(restaurant_id: int, db: Session = Depends(get_db)):
    """Check if restaurant already has a parsed menu"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    dishes_count = db.query(Dish).filter(Dish.restaurant_id == restaurant_id).count()
    
    return {
        "restaurant_id": restaurant_id,
        "restaurant_name": restaurant.name,
        "has_menu": dishes_count > 0,
        "dishes_count": dishes_count
    }

@router.get("/by-name/{restaurant_name}/has-menu")
async def check_restaurant_menu_by_name(restaurant_name: str, db: Session = Depends(get_db)):
    """Check if restaurant already has a parsed menu by name"""
    restaurant = db.query(Restaurant).filter(Restaurant.name.ilike(f"%{restaurant_name}%")).first()
    if not restaurant:
        return {
            "restaurant_name": restaurant_name,
            "has_menu": False,
            "dishes_count": 0
        }
    
    dishes_count = db.query(Dish).filter(Dish.restaurant_id == restaurant.id).count()
    
    return {
        "restaurant_id": restaurant.id,
        "restaurant_name": restaurant.name,
        "has_menu": dishes_count > 0,
        "dishes_count": dishes_count
    }