from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Restaurant(Base):
    __tablename__ = "restaurants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    cuisine_type = Column(String)
    google_place_id = Column(String, unique=True)
    yelp_business_id = Column(String, unique=True)
    avg_rating = Column(Float)
    price_level = Column(Integer)  # 1-4 scale
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dishes = relationship("Dish", back_populates="restaurant")
    reviews = relationship("Review", back_populates="restaurant")

class Dish(Base):
    __tablename__ = "dishes"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)  # starter, main, dessert, etc.
    ingredients = Column(JSON)  # ["chicken", "garlic", "herbs"]
    dietary_tags = Column(JSON)  # ["vegetarian", "gluten-free"]
    preparation_style = Column(JSON)  # ["grilled", "crispy", "spicy"]
    avg_rating = Column(Float)
    total_reviews = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    restaurant = relationship("Restaurant", back_populates="dishes")
    reviews = relationship("Review", back_populates="dish")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=True)
    reviewer_external_id = Column(String)  # Google/Yelp user ID
    platform = Column(String)  # "google", "yelp"
    rating = Column(Float)
    text = Column(Text)
    
    # LLM-enriched fields
    sentiment_score = Column(Float)  # -1 to 1
    extracted_attributes = Column(JSON)  # ["creamy", "rich", "well-balanced"]
    preparation_feedback = Column(JSON)  # {"texture": "perfect", "temperature": "hot"}
    context_tags = Column(JSON)  # ["date_night", "quick_lunch", "sharing"]
    
    created_at = Column(DateTime, default=datetime.utcnow)
    review_date = Column(DateTime)
    
    restaurant = relationship("Restaurant", back_populates="reviews")
    dish = relationship("Dish", back_populates="reviews")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    
    # Taste profile
    preferred_cuisines = Column(JSON)
    dietary_restrictions = Column(JSON)
    spice_tolerance = Column(Integer)  # 1-5 scale
    price_preference = Column(Integer)  # 1-4 scale
    taste_vector = Column(JSON)  # Learned embeddings
    taste_cluster = Column(Integer)  # K-means cluster assignment
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ratings = relationship("UserRating", back_populates="user")

class UserRating(Base):
    __tablename__ = "user_ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    rating = Column(Float)
    notes = Column(Text)
    
    # Feedback dimensions
    saltiness = Column(Integer)  # 1-5 scale
    spiciness = Column(Integer)
    richness = Column(Integer)
    portion_size = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="ratings")
    dish = relationship("Dish")

class ReviewerProfile(Base):
    __tablename__ = "reviewer_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True)  # Google/Yelp user ID
    platform = Column(String)
    total_reviews = Column(Integer)
    avg_rating_given = Column(Float)
    taste_vector = Column(JSON)  # Learned from their reviews
    taste_cluster = Column(Integer)  # K-means cluster
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ParsedMenu(Base):
    """Model for storing parsed menus"""
    __tablename__ = "parsed_menus"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_name = Column(String, nullable=False)
    restaurant_url = Column(String, nullable=False)
    menu_url = Column(String, nullable=False)
    parsed_at = Column(DateTime, default=datetime.utcnow)
    dish_count = Column(Integer, default=0)
    
    # Relationship to dishes
    dishes = relationship("ParsedDish", back_populates="menu", cascade="all, delete-orphan")

class ParsedDish(Base):
    """Model for storing parsed dishes"""
    __tablename__ = "parsed_dishes"
    
    id = Column(Integer, primary_key=True, index=True)
    menu_id = Column(Integer, ForeignKey("parsed_menus.id"))
    name = Column(String, nullable=False)
    description = Column(String)
    category = Column(String, nullable=False)  # breakfast, main, dessert, etc.
    ingredients = Column(JSON)  # List of ingredients
    dietary_tags = Column(JSON)  # List of dietary tags
    preparation_style = Column(JSON)  # List of preparation styles
    is_user_added = Column(Boolean, default=False)  # True if added by user
    added_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    menu = relationship("ParsedMenu", back_populates="dishes")
    added_by_user = relationship("User", back_populates="added_dishes")

# Add relationship to User model
User.added_dishes = relationship("ParsedDish", back_populates="added_by_user")