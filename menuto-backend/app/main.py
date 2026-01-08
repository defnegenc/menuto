from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import restaurants, dishes, reviews, smart_recommendations, menu_api, menu_parser_api, menu_parsing, users, places, behavioral_tracking
from app.require_user import require_user
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Menuto API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    """Log startup information to help debug deployment issues"""
    port = os.getenv('PORT', '8080')
    logger.info("=" * 50)
    logger.info("Menuto API Starting Up")
    logger.info(f"PORT: {port}")
    logger.info(f"DATABASE_URL: {'set' if os.getenv('DATABASE_URL') else 'NOT SET'}")
    logger.info(f"CLERK_ISSUER: {os.getenv('CLERK_ISSUER', 'not set')}")
    logger.info(f"SUPABASE_URL: {'set' if os.getenv('SUPABASE_URL') else 'NOT SET'}")
    logger.info(f"OPENAI_API_KEY: {'set' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")
    logger.info(f"Binding to host 0.0.0.0 on port {port}")
    logger.info("=" * 50)

ALLOWED_ORIGINS = [
    "http://localhost:19006",  # Expo web/dev
    "http://localhost:8081",   # Metro
    "http://localhost:8080",   # Local backend (if calling from a web client)
    "http://127.0.0.1:8080",   # Local backend (loopback)
    "exp://localhost",         # Expo
    "http://localhost:3000",   # web dev (if any)
    "https://*.onrender.com",  # during bring-up
    "https://api.yourdomain.com",  # later custom domain
]

@app.get("/health")
def health():
    return {"ok": True}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten later to your domain(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router, prefix="/restaurants", tags=["restaurants"])
app.include_router(dishes.router, prefix="/dishes", tags=["dishes"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

app.include_router(smart_recommendations.router, prefix="/smart-recommendations", tags=["smart-recommendations"])
app.include_router(behavioral_tracking.router, prefix="/smart-recommendations", tags=["behavioral-tracking"])
app.include_router(menu_api.router, prefix="/menu", tags=["menu-data"])
app.include_router(menu_parser_api.router)
app.include_router(menu_parsing.router)
app.include_router(users.router)
app.include_router(places.router)

@app.get("/")
async def root():
    return {"message": "Menuto API v1.0"}

@app.get("/__whoami")
def whoami(user=Depends(require_user)):
    return user

@app.get("/__test")
def test():
    return {"message": "Test route works"}
