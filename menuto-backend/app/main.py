from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import restaurants, dishes, reviews, recommendations, recommendations_supabase, smart_recommendations, menu_api, menu_parser_api, menu_parsing, users
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Menuto API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router, prefix="/restaurants", tags=["restaurants"])
app.include_router(dishes.router, prefix="/dishes", tags=["dishes"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
app.include_router(recommendations_supabase.router, prefix="/api", tags=["supabase-api"])
app.include_router(smart_recommendations.router, prefix="/smart-recommendations", tags=["smart-recommendations"])
app.include_router(menu_api.router, prefix="/menu", tags=["menu-data"])
app.include_router(menu_parser_api.router)
app.include_router(menu_parsing.router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {"message": "Menuto API v1.0"}