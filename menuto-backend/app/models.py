"""
SQLAlchemy models for tables that are still referenced via SQLAlchemy
by the enhanced_recommendation_algorithm service.

Only ParsedMenu and ParsedDish remain; all other legacy models
(Restaurant, Dish, Review, User, UserRating, ReviewerProfile) have been
removed because they reference tables that do not exist in Supabase.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class ParsedMenu(Base):
    """Model for storing parsed menus"""
    __tablename__ = "parsed_menus"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String, nullable=True, index=True)
    restaurant_name = Column(String, nullable=False)
    restaurant_url = Column(String, nullable=False)
    menu_url = Column(String, nullable=False)
    parsed_at = Column(DateTime, default=datetime.utcnow)
    dish_count = Column(Integer, default=0)
    cuisine_type = Column(String, nullable=True)
    menu_type = Column(String, nullable=True)

    dishes = relationship("ParsedDish", back_populates="menu", cascade="all, delete-orphan")


class ParsedDish(Base):
    """Model for storing parsed dishes"""
    __tablename__ = "parsed_dishes"

    id = Column(Integer, primary_key=True, index=True)
    menu_id = Column(Integer, ForeignKey("parsed_menus.id"))
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=True)
    category = Column(String, nullable=False)
    ingredients = Column(JSON)
    dietary_tags = Column(JSON)
    preparation_style = Column(JSON)
    is_user_added = Column(Boolean, default=False)
    added_by_user_id = Column(String, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    menu = relationship("ParsedMenu", back_populates="dishes")
