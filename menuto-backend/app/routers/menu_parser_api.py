from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import logging
from uuid import uuid4

from ..services.menu_parser import (
    MenuParsingError,
    parse_menu_image,
    parse_menu_image_with_cuisine_debug,
    parse_menu_url_with_cuisine,
    parse_menu_url_with_cuisine_debug,
 )
import tempfile
import os

router = APIRouter(prefix="/menu-parser", tags=["menu-parser"])
logger = logging.getLogger(__name__)

@router.post("/parse-url")
async def parse_menu_from_url(
    url: str = Form(..., description="URL of the menu to parse"),
    restaurant_name: str = Form("", description="Name of the restaurant"),
    debug: bool = Query(False, description="If true, include debug timings/LLM usage in response"),
) -> JSONResponse:
    """
    Parse menu from a URL with automatic content-type detection.
    
    Supports:
    - HTML websites (with structure preservation)
    - PDF files
    - Image files (JPEG, PNG, WebP)
    """
    try:
        request_id = uuid4().hex[:12]
        logger.info(f"[{request_id}] Parsing menu from URL: {url} restaurant_name={restaurant_name!r} debug={debug}")

        if debug:
            dishes, cuisine_type, debug_info = parse_menu_url_with_cuisine_debug(url, restaurant_name)
            # prefer request_id from debug_info if present
            request_id = debug_info.get("request_id", request_id)
            return JSONResponse(
                {
                    "success": True,
                    "dishes": dishes,
                    "count": len(dishes),
                    "cuisine_type": cuisine_type,
                    "source": "url",
                    "url": url,
                    "request_id": request_id,
                    "debug": debug_info,
                }
            )

        dishes, cuisine_type = parse_menu_url_with_cuisine(url, restaurant_name)
        return JSONResponse(
            {
                "success": True,
                "dishes": dishes,
                "count": len(dishes),
                "cuisine_type": cuisine_type,
                "source": "url",
                "url": url,
                "request_id": request_id,
            }
        )
        
    except MenuParsingError as e:
        logger.error(f"Menu parsing failed for URL {url}: {e.code} {e.message}")
        return JSONResponse(e.to_public_dict(), status_code=e.status_code)
    except Exception as e:
        logger.exception(f"Menu parsing failed for URL {url}: {str(e)}")
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "menu_parsing_failed", "message": str(e)}})

@router.post("/parse-image")
async def parse_menu_from_image(
    file: UploadFile = File(..., description="Menu image file"),
    restaurant_name: str = Form("", description="Name of the restaurant"),
    debug: bool = Query(False, description="If true, include debug timings in response (OCR+LLM)"),
) -> JSONResponse:
    """
    Parse menu from an uploaded image file using OCR.
    
    Supports: JPEG, PNG, WebP
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG, PNG, WebP)"
            )
        
        request_id = uuid4().hex[:12]
        logger.info(f"[{request_id}] Parsing menu from image: {file.filename} restaurant_name={restaurant_name!r} debug={debug}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            if debug:
                dishes, cuisine_type, debug_info = parse_menu_image_with_cuisine_debug(tmp_path, restaurant_name)
                request_id = debug_info.get("request_id", request_id)
                return JSONResponse(
                    {
                        "success": True,
                        "dishes": dishes,
                        "count": len(dishes),
                        "cuisine_type": cuisine_type,
                        "source": "image",
                        "filename": file.filename,
                        "request_id": request_id,
                        "debug": debug_info,
                    }
                )

            dishes = parse_menu_image(tmp_path, restaurant_name)
            return JSONResponse(
                {
                    "success": True,
                    "dishes": dishes,
                    "count": len(dishes),
                    "source": "image",
                    "filename": file.filename,
                    "request_id": request_id,
                }
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except MenuParsingError as e:
        logger.error(f"Image parsing failed: {e.code} {e.message}")
        return JSONResponse(e.to_public_dict(), status_code=e.status_code)
    except Exception as e:
        logger.exception(f"Image parsing failed: {str(e)}")
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "image_parsing_failed", "message": str(e)}})

@router.get("/health")
async def health_check() -> JSONResponse:
    """Health check endpoint for the menu parser service"""
    return JSONResponse({
        "status": "healthy",
        "service": "menu-parser",
        "features": [
            "URL parsing with content-type detection",
            "HTML structure preservation", 
            "PDF text extraction",
            "Image OCR with layout awareness",
            "Strict JSON validation",
            "Post-processing and deduplication"
        ]
    })
