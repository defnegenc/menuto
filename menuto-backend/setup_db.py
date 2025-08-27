#!/usr/bin/env python3

import os
import sys
from sqlalchemy import create_engine
from app.models import Base
from app.database import DATABASE_URL
from dotenv import load_dotenv

def setup_database():
    """Create all database tables"""
    load_dotenv()
    
    print("Creating database tables...")
    
    try:
        engine = create_engine(DATABASE_URL)
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        
        return True
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)