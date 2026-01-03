from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize database connection with error handling
engine = None
SessionLocal = None

try:
    if DATABASE_URL:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("Database connection initialized successfully")
    else:
        logger.warning("DATABASE_URL not set - database features will be unavailable")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    # Don't crash - let the app start anyway

def create_tables():
    if engine:
        Base.metadata.create_all(bind=engine)
    else:
        raise ValueError("Database not initialized - check DATABASE_URL")

def get_db():
    if not SessionLocal:
        raise ValueError("Database not initialized - check DATABASE_URL environment variable")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()