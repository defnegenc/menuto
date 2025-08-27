from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import logging
# from ..services.menu_parser import parse_menu_url, parse_menu_image  # Temporarily disabled
import tempfile
import os

router = APIRouter(prefix="/menu-parser", tags=["menu-parser"])
logger = logging.getLogger(__name__)

@router.post("/parse-url")
async def parse_menu_from_url(
    url: str = Form(..., description="URL of the menu to parse"),
    restaurant_name: str = Form("", description="Name of the restaurant")
) -> JSONResponse:
    """
    Parse menu from a URL with automatic content-type detection.
    
    Supports:
    - HTML websites (with structure preservation)
    - PDF files
    - Image files (JPEG, PNG, WebP)
    """
    try:
        logger.info(f"Parsing menu from URL: {url}")
        
        dishes = parse_menu_url(url, restaurant_name)
        
        return JSONResponse({
            "success": True,
            "dishes": dishes,
            "count": len(dishes),
            "source": "url",
            "url": url
        })
        
    except Exception as e:
        logger.error(f"Menu parsing failed for URL {url}: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu from URL: {str(e)}"
        )

@router.post("/parse-image")
async def parse_menu_from_image(
    file: UploadFile = File(..., description="Menu image file"),
    restaurant_name: str = Form("", description="Name of the restaurant")
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
        
        logger.info(f"Parsing menu from image: {file.filename}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            dishes = parse_menu_image(tmp_path, restaurant_name)
            
            return JSONResponse({
                "success": True,
                "dishes": dishes,
                "count": len(dishes),
                "source": "image",
                "filename": file.filename
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except Exception as e:
        logger.error(f"Image parsing failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse menu from image: {str(e)}"
        )

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
