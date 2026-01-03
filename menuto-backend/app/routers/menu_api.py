# menuto-backend/app/routers/menu_api.py
"""
Menu API: fetch menus, ingest (fire-and-forget) parsing, ingest status polling.

Key design (all routes prefixed with /menu by main.py):
- POST /menu/restaurant/{place_id}/ingest: accepts URLs, returns immediately, parses in background
- POST /menu/restaurant/{place_id}/ingest-text: accepts text, returns immediately, parses in background
- GET /menu/restaurant/{place_id}: returns ALL menus for restaurant grouped by menu_type
- GET /menu/restaurant/{place_id}/ingest-status/{id}: poll for ingest progress
"""
from __future__ import annotations

import asyncio
import os
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from app.services.menu_parsing_utils import infer_menu_period_from_url, infer_menu_type_from_content

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase not configured")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Placeholder for empty restaurant_url (legacy NOT NULL compat only)
# Note: menu_url never uses placeholder - text/screenshot ingests generate synthetic IDs
MISSING_RESTAURANT_URL = "__missing_restaurant_url__"


def _normalize_url(url: Optional[str], placeholder: str) -> str:
    """Normalize empty/null URLs to placeholder for NOT NULL constraint."""
    if not url or not url.strip():
        return placeholder
    return url.strip()


def _safe_supabase_insert(table: str, payload: Dict, fallback_remove: List[str] = None) -> Any:
    """
    Insert into Supabase with proper error logging.
    If insert fails and fallback_remove is provided, retry without those columns.
    
    Logs the FULL Supabase/PostgREST error body (code, message, details) on failure.
    """
    try:
        result = supabase.table(table).insert(payload).execute()
        if not result.data:
            logger.error(f"❌ Supabase {table} insert returned no data")
            logger.error(f"   Payload: {payload}")
        return result
    except Exception as e:
        # supabase-py raises APIError with .code, .message, .details
        error_code = getattr(e, 'code', None)
        error_message = getattr(e, 'message', str(e))
        error_details = getattr(e, 'details', None)
        
        logger.error(f"❌ Supabase {table} insert FAILED")
        logger.error(f"   Code: {error_code}")
        logger.error(f"   Message: {error_message}")
        logger.error(f"   Details: {error_details}")
        logger.error(f"   Payload: {payload}")
        
        # Try fallback if columns might not exist
        if fallback_remove:
            fallback_payload = {k: v for k, v in payload.items() if k not in fallback_remove}
            logger.info(f"   Retrying without: {fallback_remove}")
            try:
                result = supabase.table(table).insert(fallback_payload).execute()
                if result.data:
                    logger.info(f"   ✅ Fallback insert succeeded")
                    return result
                else:
                    logger.error(f"   Fallback also returned no data")
                    return result
            except Exception as e2:
                e2_code = getattr(e2, 'code', None)
                e2_message = getattr(e2, 'message', str(e2))
                e2_details = getattr(e2, 'details', None)
                logger.error(f"❌ Supabase {table} fallback insert ALSO FAILED")
                logger.error(f"   Code: {e2_code}")
                logger.error(f"   Message: {e2_message}")
                logger.error(f"   Details: {e2_details}")
                logger.error(f"   Fallback payload: {fallback_payload}")
                raise
        raise


# ---------------------------------------------------------------------------
# In-memory ingest job tracker (replace with Redis/DB for production scale)
# ---------------------------------------------------------------------------
@dataclass
class IngestJob:
    id: str
    place_id: str
    restaurant_name: str
    urls: List[str]
    started_at: float = field(default_factory=time.time)
    status: str = "pending"  # pending | running | done | failed
    results: Dict[str, Any] = field(default_factory=dict)
    # Per-URL status: {url: "pending"|"running"|"done"|"failed", ...}
    url_status: Dict[str, str] = field(default_factory=dict)


_ingest_jobs: Dict[str, IngestJob] = {}


class IngestRequest(BaseModel):
    urls: List[str]
    restaurant_name: str

def _get_latest_menu_by_place_or_name(place_id: str, restaurant_name: str):
    """
    Strategy:
      1) Try to find menu where place_id matches (the proper identity column)
      2) Fallback: try restaurant_url == place_id (legacy rows before place_id column)
      3) Fallback to case-insensitive name match
    """
    # 1) by place_id column (preferred)
    menus = supabase.table("parsed_menus") \
        .select("*") \
        .eq("place_id", place_id) \
        .order("parsed_at", desc=True) \
        .limit(1) \
        .execute()

    if menus.data:
        return menus.data[0]

    # 2) fallback: legacy rows where place_id was stored in restaurant_url
    menus = supabase.table("parsed_menus") \
        .select("*") \
        .eq("restaurant_url", place_id) \
        .order("parsed_at", desc=True) \
        .limit(1) \
        .execute()

    if menus.data:
        return menus.data[0]

    # 3) fallback by name (ilike)
    menus = supabase.table("parsed_menus") \
        .select("*") \
        .ilike("restaurant_name", f"%{restaurant_name}%") \
        .order("parsed_at", desc=True) \
        .limit(1) \
        .execute()

    return menus.data[0] if menus.data else None


def _get_all_menus_by_place_or_name(place_id: str, restaurant_name: str):
    """
    Same strategy as _get_latest_menu_by_place_or_name, but returns many menus.
    We use this to support multi-PDF (lunch + dinner + brunch) and allow the app
    to render grouped menus client-side.
    """
    # 1) by place_id column (preferred)
    menus = (
        supabase.table("parsed_menus")
        .select("*")
        .eq("place_id", place_id)
        .order("parsed_at", desc=True)
        .limit(20)
        .execute()
    )
    if menus.data:
        return menus.data

    # 2) fallback: legacy rows where place_id was stored in restaurant_url
    menus = (
        supabase.table("parsed_menus")
        .select("*")
        .eq("restaurant_url", place_id)
        .order("parsed_at", desc=True)
        .limit(20)
        .execute()
    )
    if menus.data:
        return menus.data

    # 3) fallback by name (ilike)
    menus = (
        supabase.table("parsed_menus")
        .select("*")
        .ilike("restaurant_name", f"%{restaurant_name}%")
        .order("parsed_at", desc=True)
        .limit(20)
        .execute()
    )
    return menus.data or []

@router.get("/restaurant/{place_id}")
async def get_restaurant_menu(place_id: str, restaurant_name: str, all_menus: bool = False):
    """
    Fetch dishes from Supabase for the given restaurant.
    The mobile app passes restaurant.place_id AND restaurant.name.
    """
    try:
        if not place_id or not restaurant_name:
            raise HTTPException(status_code=400, detail="place_id and restaurant_name are required")

        logger.info(f"🍽️ Fetching menu for: {restaurant_name} ({place_id})")

        menus = _get_all_menus_by_place_or_name(place_id, restaurant_name) if all_menus else []
        menu = None
        if not menus:
            menu = _get_latest_menu_by_place_or_name(place_id, restaurant_name)
            menus = [menu] if menu else []

        flattened_dishes: List[Dict[str, Any]] = []
        menus_payload: List[Dict[str, Any]] = []

        for m in menus:
            if not m:
                continue
            menu_id = m.get("id")
            menu_url = m.get("menu_url") or ""
            menu_type = infer_menu_period_from_url(menu_url)
            dish_rows = (
                supabase.table("parsed_dishes")
                .select("*")
                .eq("menu_id", menu_id)
                .execute()
                .data
                or []
            )

            out = []
            for d in dish_rows:
                out.append(
                    {
                        "id": d.get("id"),
                        "name": d.get("name"),
                        "description": d.get("description"),
                        "category": d.get("category") or "main",
                        "ingredients": d.get("ingredients") or [],
                        "dietary_tags": d.get("dietary_tags") or [],
                        "preparation_style": d.get("preparation_style") or [],
                        "is_user_added": bool(d.get("is_user_added", False)),
                        # Menu metadata for client-side grouping
                        "menu_id": menu_id,
                        "menu_url": menu_url,
                        "menu_type": menu_type,
                    }
                )
            menus_payload.append(
                {
                    "id": menu_id,
                    "menu_url": menu_url,
                    "menu_type": menu_type,
                    "dish_count": len(out),
                }
            )
            flattened_dishes.extend(out)

        if not flattened_dishes:
            # No menu entry found (or menus exist but have 0 dishes). Keep behavior: return empty list.
            logger.info(f"No dishes found for restaurant: {restaurant_name}")

        restaurant_display_name = (
            (menus[0].get("restaurant_name") if menus and menus[0] else None) or restaurant_name
        )
        cuisine_type = (
            (menus[0].get("cuisine_type") if menus and menus[0] else None) or "restaurant"
        )
        
        return {
            "restaurant": {"place_id": place_id, "name": restaurant_display_name, "cuisine_type": cuisine_type},
            "dishes": flattened_dishes,
            "menus": menus_payload,
            "total_items": len(flattened_dishes),
            "sources": ["supabase"],
            "success": True,
            "message": f"Found {len(flattened_dishes)} menu items",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Menu fetch error")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/restaurant/{place_id}/coverage")
async def get_menu_coverage(place_id: str, restaurant_name: str):
    try:
        menu = _get_latest_menu_by_place_or_name(place_id, restaurant_name)
        if not menu:
            return {
                "restaurant": {"place_id": place_id, "name": restaurant_name},
                "coverage": {"status": "missing", "user_added_items": 0, "parsed_items": 0, "total_items": 0, "needs_contribution": True},
            }

        menu_id = menu["id"]
        items = supabase.table("parsed_dishes").select("*").eq("menu_id", menu_id).execute().data or []
        user_added = [i for i in items if i.get("is_user_added")]
        parsed = [i for i in items if not i.get("is_user_added")]
        status = "complete" if len(items) >= 5 else "partial" if len(items) > 0 else "missing"

        return {
            "restaurant": {"place_id": place_id, "name": menu["restaurant_name"]},
            "coverage": {
                "status": status,
                "user_added_items": len(user_added),
                "parsed_items": len(parsed),
                "total_items": len(items),
                "needs_contribution": len(items) < 3,
            },
        }
    except Exception as e:
        logger.exception("Coverage error")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Fire-and-forget ingest endpoint
# ---------------------------------------------------------------------------
@router.post("/restaurant/{place_id}/ingest")
async def ingest_menus(
    place_id: str,
    body: IngestRequest,
    background_tasks: BackgroundTasks,
):
    """
    Accept menu URLs and immediately return. Parsing happens in the background.

    The client should poll GET /menu/restaurant/{place_id}/ingest-status/{ingest_id}
    or just refetch GET /menu/restaurant/{place_id} to see newly parsed dishes.
    """
    urls = [u.strip() for u in body.urls if u.strip()]
    if not urls:
        raise HTTPException(status_code=400, detail="At least one URL is required")

    ingest_id = uuid.uuid4().hex[:12]
    job = IngestJob(
        id=ingest_id,
        place_id=place_id,
        restaurant_name=body.restaurant_name,
        urls=urls,
        url_status={u: "pending" for u in urls},
    )
    _ingest_jobs[ingest_id] = job

    # Spawn background task (fire-and-forget)
    background_tasks.add_task(_run_ingest_job, job)

    logger.info(f"🚀 Ingest {ingest_id} started for {body.restaurant_name} with {len(urls)} URLs")

    return {
        "accepted": True,
        "ingest_id": ingest_id,
        "urls": urls,
        "message": f"Ingesting {len(urls)} menu(s) in the background. Poll /ingest-status/{ingest_id} for progress.",
    }


@router.get("/restaurant/{place_id}/ingest-status/{ingest_id}")
async def get_ingest_status(place_id: str, ingest_id: str):
    """
    Poll for ingest job progress.
    """
    job = _ingest_jobs.get(ingest_id)
    if not job or job.place_id != place_id:
        raise HTTPException(status_code=404, detail="Ingest job not found")

    return {
        "ingest_id": job.id,
        "status": job.status,
        "urls": job.urls,
        "url_status": job.url_status,
        "results": job.results,
        "started_at": job.started_at,
        "elapsed_seconds": round(time.time() - job.started_at, 1),
    }


async def _run_ingest_job(job: IngestJob):
    """
    Background task that parses each URL sequentially and stores results.
    """
    # Lazy import to avoid circular dependency
    from app.services.menu_parser import parse_menu_url_with_cuisine
    from app.services.menu_parsing_utils import infer_menu_type_from_content

    job.status = "running"
    logger.info(f"🔄 Ingest {job.id} running for {job.restaurant_name}")

    ok = 0
    failed = 0

    for url in job.urls:
        job.url_status[url] = "running"
        try:
            menu_period = infer_menu_period_from_url(url)
            prompt_name = job.restaurant_name
            if menu_period and menu_period != "menu":
                prompt_name = f"{job.restaurant_name} ({menu_period.title()} Menu)"

            # Run actual parse (blocking, but we're in a background task)
            dishes_data, cuisine_type = await asyncio.to_thread(
                parse_menu_url_with_cuisine, url, prompt_name
            )

            if not dishes_data:
                job.url_status[url] = "failed"
                job.results[url] = {"success": False, "error": "no_dishes_found"}
                failed += 1
                continue

            # Validate / refine menu_type from content
            menu_type = infer_menu_type_from_content(dishes_data, url)

            # Store in Supabase
            # place_id is the primary identity; restaurant_url kept for legacy compat
            cuisine_type = cuisine_type or "restaurant"
            supabase_menu_data = {
                "place_id": job.place_id,  # Primary identity column
                "restaurant_name": job.restaurant_name,
                "restaurant_url": _normalize_url(job.place_id, MISSING_RESTAURANT_URL),  # Legacy compat
                "menu_url": url,  # Real URL for PDF/URL ingests
                "dish_count": len(dishes_data),
                "cuisine_type": cuisine_type,
                "menu_type": menu_type,
            }
            menu_result = _safe_supabase_insert("parsed_menus", supabase_menu_data, fallback_remove=["menu_type", "place_id"])

            if not menu_result.data:
                job.url_status[url] = "failed"
                job.results[url] = {"success": False, "error": "db_insert_failed"}
                failed += 1
                continue

            menu_id = menu_result.data[0]["id"]

            # Insert dishes
            for i, dish in enumerate(dishes_data):
                dish_row = {
                    "menu_id": menu_id,
                    "name": dish.get("name"),
                    "description": dish.get("description"),
                    "price": dish.get("price"),
                    "category": dish.get("category", "main"),
                    "ingredients": dish.get("ingredients", []),
                    "dietary_tags": dish.get("dietary_tags", []),
                    "preparation_style": dish.get("preparation_style", []),
                    "is_user_added": False,
                }
                try:
                    _safe_supabase_insert("parsed_dishes", dish_row, fallback_remove=["price"])
                except Exception as dish_err:
                    logger.error(f"❌ Dish #{i} '{dish.get('name')}' insert failed: {dish_err}")

            job.url_status[url] = "done"
            job.results[url] = {
                "success": True,
                "menu_id": menu_id,
                "menu_type": menu_type,
                "dish_count": len(dishes_data),
            }
            ok += 1
            logger.info(f"✅ Ingest {job.id} parsed {url} -> {len(dishes_data)} dishes ({menu_type})")

        except Exception as e:
            logger.exception(f"❌ Ingest {job.id} failed for {url}")
            job.url_status[url] = "failed"
            job.results[url] = {"success": False, "error": str(e)}
            failed += 1

    job.status = "done" if failed == 0 else ("failed" if ok == 0 else "done")
    logger.info(f"🏁 Ingest {job.id} complete: {ok} ok, {failed} failed")


# ---------------------------------------------------------------------------
# Fire-and-forget TEXT ingest endpoint
# ---------------------------------------------------------------------------
class TextIngestRequest(BaseModel):
    menu_text: str
    restaurant_name: str


@router.post("/restaurant/{place_id}/ingest-text")
async def ingest_menu_text(
    place_id: str,
    body: TextIngestRequest,
    background_tasks: BackgroundTasks,
):
    """
    Accept menu text and immediately return. Parsing happens in the background.

    The client should poll GET /menu/restaurant/{place_id}/ingest-status/{ingest_id}
    or just refetch GET /menu/restaurant/{place_id} to see newly parsed dishes.
    """
    menu_text = (body.menu_text or "").strip()
    if not menu_text:
        raise HTTPException(status_code=400, detail="menu_text is required")

    ingest_id = uuid.uuid4().hex[:12]
    job = IngestJob(
        id=ingest_id,
        place_id=place_id,
        restaurant_name=body.restaurant_name,
        urls=["text"],  # Placeholder for text source
        url_status={"text": "pending"},
    )
    _ingest_jobs[ingest_id] = job

    # Spawn background task (fire-and-forget)
    background_tasks.add_task(_run_text_ingest_job, job, menu_text)

    logger.info(f"🚀 Text ingest {ingest_id} started for {body.restaurant_name} ({len(menu_text)} chars)")

    return {
        "accepted": True,
        "ingest_id": ingest_id,
        "message": f"Ingesting menu text in the background. Poll /ingest-status/{ingest_id} for progress.",
    }


async def _run_text_ingest_job(job: IngestJob, menu_text: str):
    """
    Background task that parses menu text and stores results.
    """
    # Lazy import to avoid circular dependency
    from app.services.menu_parser import parse_menu_text_with_cuisine
    from app.services.menu_parsing_utils import infer_menu_type_from_content

    job.status = "running"
    job.url_status["text"] = "running"
    logger.info(f"🔄 Text ingest {job.id} running for {job.restaurant_name}")

    try:
        # Run actual parse (blocking, but we're in a background task)
        dishes_data, cuisine_type = await asyncio.to_thread(
            parse_menu_text_with_cuisine, menu_text, job.restaurant_name
        )

        if not dishes_data:
            job.url_status["text"] = "failed"
            job.results["text"] = {"success": False, "error": "no_dishes_found", "dish_count": 0}
            job.status = "failed"
            logger.warning(f"❌ Text ingest {job.id}: no dishes found")
            return

        # Classify menu type from content
        menu_type = infer_menu_type_from_content(dishes_data, "")

        # Store in Supabase
        # place_id is the primary identity; menu_url is NULL for text ingests (no source URL)
        cuisine_type = cuisine_type or "restaurant"
        supabase_menu_data = {
            "place_id": job.place_id,  # Primary identity column
            "restaurant_name": job.restaurant_name,
            "restaurant_url": _normalize_url(job.place_id, MISSING_RESTAURANT_URL),  # Legacy compat
            "menu_url": f"text://{job.id}",  # Synthetic identifier for text ingests
            "dish_count": len(dishes_data),
            "cuisine_type": cuisine_type,
            "menu_type": menu_type,
        }
        menu_result = _safe_supabase_insert("parsed_menus", supabase_menu_data, fallback_remove=["menu_type", "place_id"])

        if not menu_result.data:
            job.url_status["text"] = "failed"
            job.results["text"] = {"success": False, "error": "db_insert_failed", "dish_count": 0}
            job.status = "failed"
            return

        menu_id = menu_result.data[0]["id"]

        # Insert dishes
        for i, dish in enumerate(dishes_data):
            dish_row = {
                "menu_id": menu_id,
                "name": dish.get("name"),
                "description": dish.get("description"),
                "price": dish.get("price"),
                "category": dish.get("category", "main"),
                "ingredients": dish.get("ingredients", []),
                "dietary_tags": dish.get("dietary_tags", []),
                "preparation_style": dish.get("preparation_style", []),
                "is_user_added": False,
            }
            try:
                _safe_supabase_insert("parsed_dishes", dish_row, fallback_remove=["price"])
            except Exception as dish_err:
                logger.error(f"❌ Dish #{i} '{dish.get('name')}' insert failed: {dish_err}")

        job.url_status["text"] = "done"
        job.results["text"] = {
            "success": True,
            "menu_id": menu_id,
            "menu_type": menu_type,
            "dish_count": len(dishes_data),
        }
        job.status = "done"
        logger.info(f"✅ Text ingest {job.id} complete: {len(dishes_data)} dishes ({menu_type})")

    except Exception as e:
        logger.exception(f"❌ Text ingest {job.id} failed")
        job.url_status["text"] = "failed"
        job.results["text"] = {"success": False, "error": str(e), "dish_count": 0}
        job.status = "failed"