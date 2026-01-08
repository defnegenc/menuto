"""
SQLAlchemy models for behavioral tracking tables.
These track user interactions with dishes for recommendation signals.
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Index, CheckConstraint, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.database import Base
import uuid


class DishOrder(Base):
    """
    Tracks when users actually order dishes.
    Strongest signal for popularity and recommendations.
    """
    __tablename__ = "dish_orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False)
    dish_id = Column(BigInteger, ForeignKey("parsed_dishes.id", ondelete="CASCADE"), nullable=False)
    restaurant_place_id = Column(Text, nullable=False)
    
    ordered_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Context when ordered
    hunger_level = Column(Integer, nullable=True)
    cravings = Column(Text, nullable=True)  # JSON string
    
    __table_args__ = (
        CheckConstraint('hunger_level >= 1 AND hunger_level <= 5', name='check_hunger_level'),
        Index('idx_dish_orders_dish', 'dish_id'),
        Index('idx_dish_orders_user', 'user_id'),
        Index('idx_dish_orders_restaurant', 'restaurant_place_id'),
        Index('idx_dish_orders_date', 'ordered_at'),
    )


class DishView(Base):
    """
    Tracks when users view dish details.
    Moderate signal - shows interest even if not ordered.
    """
    __tablename__ = "dish_views"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False)
    dish_id = Column(BigInteger, ForeignKey("parsed_dishes.id", ondelete="CASCADE"), nullable=False)
    restaurant_place_id = Column(Text, nullable=False)
    
    viewed_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    view_duration_seconds = Column(Integer, nullable=True)
    
    __table_args__ = (
        Index('idx_dish_views_dish', 'dish_id'),
        Index('idx_dish_views_user', 'user_id'),
        Index('idx_dish_views_date', 'viewed_at'),
    )


class DishRating(Base):
    """
    Tracks user ratings after eating.
    Gold standard signal - they actually tried it and rated it.
    """
    __tablename__ = "dish_ratings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False)
    dish_id = Column(BigInteger, ForeignKey("parsed_dishes.id", ondelete="CASCADE"), nullable=False)
    restaurant_place_id = Column(Text, nullable=False)
    
    # Core rating
    rating = Column(Float, nullable=False)
    
    # Optional feedback
    feedback_text = Column(Text, nullable=True)
    would_order_again = Column(Boolean, nullable=True)
    hunger_level_when_ordered = Column(Integer, nullable=True)
    
    rated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        Index('idx_dish_ratings_dish', 'dish_id'),
        Index('idx_dish_ratings_user', 'user_id'),
        Index('idx_dish_ratings_rating', 'rating'),
        Index('idx_dish_ratings_date', 'rated_at'),
    )


class DishFavorite(Base):
    """
    Tracks when users save dishes as favorites.
    Strong preference signal.
    """
    __tablename__ = "dish_favorites"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False)
    dish_id = Column(BigInteger, ForeignKey("parsed_dishes.id", ondelete="CASCADE"), nullable=False)
    restaurant_place_id = Column(Text, nullable=False)
    
    added_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    removed_at = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index('idx_dish_favorites_user', 'user_id'),
        Index('idx_dish_favorites_dish', 'dish_id'),
        # Note: UNIQUE constraint is defined at DB level
    )

