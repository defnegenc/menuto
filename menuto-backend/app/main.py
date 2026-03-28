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
# First load base .env to get API_ENV, then load .env.dev or .env.prod if needed
load_dotenv()  # Load base .env first
api_env = os.getenv("API_ENV", "prod").lower()
if api_env == "dev":
    # Load .env.dev which will override values from .env
    env_file = load_dotenv(".env.dev", override=True)
    logger.info("Dev mode: Loaded .env.dev file (%s)", "found" if env_file else "not found")
elif api_env == "prod":
    # Load .env.prod which will override values from .env
    env_file = load_dotenv(".env.prod", override=True)
    logger.info("Production mode: Loaded .env.prod file (%s)", "found" if env_file else "not found")
else:
    logger.info("Unknown API_ENV=%s: Using .env file only", api_env)

app = FastAPI(title="Menuto API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    """Log startup information to help debug deployment issues"""
    port = os.getenv('PORT', '8080')
    logger.info("=" * 50)
    logger.info("Menuto API Starting Up")
    logger.info("PORT: %s", port)
    logger.info("DATABASE_URL: %s", "set" if os.getenv("DATABASE_URL") else "NOT SET")
    logger.info("CLERK_ISSUER: %s", os.getenv("CLERK_ISSUER", "not set"))
    supabase_url = os.getenv('SUPABASE_URL')
    logger.info("SUPABASE_URL: %s", supabase_url[:30] + '...' if supabase_url and len(supabase_url) > 30 else supabase_url if supabase_url else "NOT SET")
    logger.info("SUPABASE_KEY: %s", "set" if os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "NOT SET")
    logger.info("GOOGLE_GEMINI_API_KEY: %s", "set" if os.getenv("GOOGLE_GEMINI_API_KEY") else "NOT SET")
    logger.info("Binding to host 0.0.0.0 on port %s", port)
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

# ---------------------------------------------------------------------------
# Router registration
#
# API endpoint groups:
#   /restaurants/*           - Restaurant CRUD and search
#   /dishes/*                - Dish CRUD
#   /reviews/*               - Review ingestion
#   /smart-recommendations/* - AI-powered dish recommendations & behavioral tracking
#   /menu/*                  - Menu data retrieval
#   /menu-parser/*           - Menu image/URL parsing  (prefix on router)
#   /menu-parsing/*          - Menu parse-and-store     (prefix on router)
#   /users/*                 - User profiles & prefs    (prefix on router)
#   /api/places/*            - Google Places proxy      (prefix on router)
# ---------------------------------------------------------------------------

app.include_router(restaurants.router, prefix="/restaurants", tags=["restaurants"])
app.include_router(dishes.router, prefix="/dishes", tags=["dishes"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

app.include_router(smart_recommendations.router, prefix="/smart-recommendations", tags=["smart-recommendations"])
app.include_router(behavioral_tracking.router, prefix="/smart-recommendations", tags=["behavioral-tracking"])
app.include_router(menu_api.router, prefix="/menu", tags=["menu-data"])

# These routers define their own prefix in their APIRouter() constructor:
app.include_router(menu_parser_api.router, tags=["menu-parser"])    # prefix="/menu-parser"
app.include_router(menu_parsing.router, tags=["menu-parsing"])      # prefix="/menu-parsing"
app.include_router(users.router, tags=["users"])                    # prefix="/users"
app.include_router(places.router, tags=["places"])                  # prefix="/api/places"

@app.get("/")
async def root():
    return {"message": "Menuto API v1.0"}

@app.get("/__whoami")
def whoami(user=Depends(require_user)):
    return user

@app.get("/__test")
def test():
    return {"message": "Test route works"}
