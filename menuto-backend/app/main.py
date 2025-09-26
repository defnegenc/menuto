from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import restaurants, dishes, reviews, smart_recommendations, menu_api, menu_parser_api, menu_parsing, users, places
from app.require_user import require_user
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Menuto API", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:19006",  # Expo web/dev
    "http://localhost:8081",   # Metro
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