# app/users.py
import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase import create_client, Client
from app.require_user import require_user

router = APIRouter(prefix="/users", tags=["users"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use service-role in the backend so RLS isn’t a blocker
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
TABLE = "user_profiles"  # <-- matches your schema screenshot

class UserPreferences(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    profile_photo: Optional[str] = None
    preferred_cuisines: List[str] = []
    spice_tolerance: int = 3
    price_preference: int = 2
    dietary_restrictions: List[str] = []
    favorite_restaurants: List[Dict] = []
    favorite_dishes: List[Dict] = []
    top_3_restaurants: List[Dict] = []

def _get_user(user_id: str):
    r = sb.table(TABLE).select("*").eq("id", user_id).maybe_single().execute()
    return r.data

def _upsert(row: dict):
    # First upsert the data
    sb.table(TABLE).upsert(row, on_conflict="id").execute()
    # Then fetch the updated record
    r = sb.table(TABLE).select("*").eq("id", row["id"]).maybe_single().execute()
    return r.data

@router.get("/{user_id}/preferences")
async def get_user_preferences(user_id: str, user=Depends(require_user)):
    if user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    data = _get_user(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data

@router.post("/{user_id}/preferences")
async def create_user_preferences(user_id: str, prefs: UserPreferences, user=Depends(require_user)):
    if user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if prefs.id and prefs.id != user_id:
        raise HTTPException(status_code=400, detail="Payload id must match path user_id")
    row = {"id": user_id, **prefs.model_dump(exclude={"id"}, exclude_none=True)}
    return _upsert(row)

@router.put("/{user_id}/preferences")
async def update_user_preferences(user_id: str, prefs: UserPreferences, user=Depends(require_user)):
    if user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    current = _get_user(user_id) or {"id": user_id}
    row = {**current, **prefs.model_dump(exclude_none=True)}
    return _upsert(row)

@router.put("/{user_id}/top-3-restaurants")
async def update_top_3_restaurants(user_id: str, restaurants: List[Dict], user=Depends(require_user)):
    if user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    r = sb.table(TABLE).update({"top_3_restaurants": restaurants}).eq("id", user_id).select("*").execute()
    return {"success": bool(r.data)}

@router.post("/{user_id}/favorite-dishes")
async def add_favorite_dish(user_id: str, dish_data: Dict, user=Depends(require_user)):
    if user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    current = _get_user(user_id) or {"id": user_id}
    favs = (current.get("favorite_dishes") or []) + [dish_data]
    r = sb.table(TABLE).update({"favorite_dishes": favs}).eq("id", user_id).select("*").execute()
    return {"success": bool(r.data)}

@router.get("/{user_id}/favorite-dishes")
async def get_favorite_dishes(user_id: str, user=Depends(require_user)):
    if user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    current = _get_user(user_id) or {}
    return current.get("favorite_dishes", [])
