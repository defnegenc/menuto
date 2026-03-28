from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
import os
from dotenv import load_dotenv
import logging

# Load environment variables - check API_ENV to determine which .env file to load
# First load base .env to get API_ENV, then load .env.dev or .env.prod if needed
load_dotenv()  # Load base .env first
api_env = os.getenv("API_ENV", "prod").lower()
if api_env == "dev":
    # Load .env.dev which will override values from .env
    load_dotenv(".env.dev", override=True)
elif api_env == "prod":
    # Load .env.prod which will override values from .env
    load_dotenv(".env.prod", override=True)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize database connection with error handling
engine = None
SessionLocal = None

try:
    if DATABASE_URL:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("SQLAlchemy database connection initialized successfully")
    else:
        # DATABASE_URL is optional - app uses Supabase for menu/recommendation features
        # Legacy SQLAlchemy routes may be unavailable, but core functionality works
        supabase_url = os.getenv("SUPABASE_URL")
        if supabase_url:
            logger.info("Using Supabase for database operations (DATABASE_URL not set)")
        else:
            logger.warning("Neither DATABASE_URL nor SUPABASE_URL set - some features may be unavailable")
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