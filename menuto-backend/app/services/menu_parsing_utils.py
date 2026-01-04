"""
menuto-backend/app/services/menu_parsing_utils.py

What this is:
- Shared, pure (side-effect free) helpers and the canonical "dish" schema for menu parsing.

Why we keep it:
- Used by both `menu_parser.py` (URL/PDF/OCR/text parsing) and `screenshot_menu_parser.py` (Vision parsing).
- Keeps schema consistent end-to-end and makes it easy to unit test parsing logic without network/OpenAI.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, validator


_SMALL_TITLE_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "da",
    "de",
    "del",
    "di",
    "for",
    "from",
    "in",
    "la",
    "le",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}


def title_case_dish_name(name: str) -> str:
    """
    Make dish names consistently Title Case (auto-caps each word).

    Heuristics:
    - Keeps common "small words" lowercase unless it's the first word.
    - Preserves acronyms (e.g., BLT), and leaves numbers/symbol tokens alone.
    - Handles apostrophes (both ' and ’).
    """
    if not name:
        return ""

    s = re.sub(r"\s+", " ", name).strip()
    if not s:
        return ""

    def _cap_word(w: str, is_first: bool) -> str:
        raw = w.strip()
        if not raw:
            return raw

        # Preserve acronyms like "BLT" or "NYC"
        if raw.isupper() and len(raw) <= 6 and any(ch.isalpha() for ch in raw):
            return raw

        lw = raw.lower()
        if not is_first and lw in _SMALL_TITLE_WORDS:
            return lw

        # Handle apostrophes: "martiny’s" -> "Martiny’s"
        if "’" in lw:
            parts = lw.split("’")
            parts = [(p[:1].upper() + p[1:]) if p else p for p in parts]
            return "’".join(parts)
        if "'" in lw:
            parts = lw.split("'")
            parts = [(p[:1].upper() + p[1:]) if p else p for p in parts]
            return "'".join(parts)

        return lw[:1].upper() + lw[1:]

    # Split while keeping separators like spaces, hyphens, slashes, ampersands
    tokens = re.split(r"(\s+|[-/–—]|&)", s)
    out: List[str] = []
    word_index = 0
    for t in tokens:
        if t is None or t == "":
            continue
        if re.fullmatch(r"\s+|[-/–—]|&", t):
            out.append(t)
            continue
        out.append(_cap_word(t, is_first=(word_index == 0)))
        word_index += 1

    return "".join(out).strip()


def infer_menu_period_from_url(url: str) -> str:
    """
    Infer a coarse "menu period" from a menu URL / filename.
    Examples: "...Lunch..." -> "lunch", "...dinner..." -> "dinner".
    """
    u = (url or "").lower()
    # Common restaurant menu terms
    if any(k in u for k in ["breakfast", "brkfst"]):
        return "breakfast"
    if "brunch" in u:
        return "brunch"
    if "lunch" in u:
        return "lunch"
    if "dinner" in u:
        return "dinner"
    if any(k in u for k in ["dessert", "dolce"]):
        return "dessert"
    if any(k in u for k in ["cocktail", "cocktails", "drink", "drinks", "wine", "bar"]):
        return "drinks"
    return "menu"


def infer_menu_type_from_content(dishes: List[Dict], url_hint: str = "") -> str:
    """
    Stage B content classifier: if URL heuristic is ambiguous, check item ratios.

    Returns one of: breakfast, brunch, lunch, dinner, dessert, drinks, menu
    """
    url_type = infer_menu_period_from_url(url_hint)

    if not dishes:
        return url_type

    total = len(dishes)
    dessert_count = sum(1 for d in dishes if (d.get("category") or "").lower() == "dessert")
    beverage_count = sum(
        1
        for d in dishes
        if (d.get("category") or "").lower() in {"beverage", "drink", "drinks", "cocktail"}
    )
    main_count = sum(1 for d in dishes if (d.get("category") or "").lower() in {"main", "entree"})
    starter_count = sum(1 for d in dishes if (d.get("category") or "").lower() == "starter")

    # High ratio thresholds to override URL hint
    if dessert_count / total >= 0.5:
        return "dessert"
    if beverage_count / total >= 0.5:
        return "drinks"

    # If URL already gives a mealtime hint and content is mostly savory, trust URL
    if url_type in {"breakfast", "brunch", "lunch", "dinner"}:
        return url_type

    # Default: if lots of mains/starters, call it dinner (most common)
    if (main_count + starter_count) / total >= 0.4:
        return "dinner"

    return url_type


class DishItem(BaseModel):
    """Canonical dish schema returned by menu parsing endpoints."""

    name: str = Field(..., min_length=1)
    description: str = Field(default="")
    price: Optional[float] = Field(None, ge=0)
    category: str = Field(default="main")
    ingredients: List[str] = Field(default_factory=list)
    dietary_tags: List[str] = Field(default_factory=list)
    preparation_style: List[str] = Field(default_factory=list)

    @validator("category")
    def normalize_category(cls, v: str) -> str:
        """
        Category normalization - PRESERVES original section names for rich menus.
        
        Only normalizes generic English categories to maintain consistency.
        Preserves specific section names like "Antipasti", "Pasta", "Pesci", etc.
        """
        category = (v or "").strip()
        if not category:
            return "main"
        
        # Lowercase for comparison only
        category_lower = category.lower()
        
        # Only normalize generic English categories
        # DO NOT normalize specific section names (Antipasti, Pasta, Pesci, etc.)
        generic_mappings = {
            # Only map obviously generic English terms
            "appetizer": "starter",
            "appetizers": "starter",
            "mains": "main",
            "entree": "main",
            "entrée": "main",
            "desserts": "dessert",
            "sweet": "dessert",
            "drinks": "beverage",
            "beverages": "beverage",
            "cocktail": "beverage",
            "cocktails": "beverage",
            "wine": "beverage",
            "soups": "soup",
            "salads": "salad",
            "sides": "side",
        }
        
        # If it's a generic term, normalize it
        if category_lower in generic_mappings:
            return generic_mappings[category_lower]
        
        # If it's already a canonical term (starter/main/etc.), keep lowercase version
        canonical_categories = {
            "starter", "main", "dessert", "beverage", "soup", "salad", "side"
        }
        if category_lower in canonical_categories:
            return category_lower
        
        # Otherwise, PRESERVE the original category name (for Antipasti, Pasta, etc.)
        return category


def parse_price_robust(price) -> Optional[float]:
    """Robust price parsing with multiple formats."""
    if isinstance(price, (int, float)):
        return float(price)

    if isinstance(price, str):
        p = price.strip()

        # Remove currency symbols and common words
        p = re.sub(r"[\$€£¥¢₹₽₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]", "", p)
        p = re.sub(r"\b(price|cost|each|per)\b", "", p, flags=re.IGNORECASE)

        # Extract numbers with decimal support
        numbers = re.findall(r"\d+[.,]?\d*", p)
        if numbers:
            num_str = numbers[0].replace(",", ".")
            try:
                return float(num_str)
            except Exception:
                return None

    return None


def post_process_dishes(dishes: List[Dict]) -> List[Dict]:
    """Clean, dedupe, and coerce dishes into the canonical schema."""
    processed: List[Dict] = []

    for dish in dishes or []:
        # Clean name
        # Clean description
        description = (dish.get("description") or "").strip()

        raw_name = (dish.get("name") or "").strip()
        if not raw_name or len(raw_name) < 2:
            continue

        # Parse price more robustly
        price = parse_price_robust(dish.get("price"))

        # Merge broken names/descriptions
        if not description and "\n" in raw_name:
            parts = raw_name.split("\n", 1)
            raw_name = parts[0].strip()
            description = parts[1].strip()

        name = title_case_dish_name(raw_name)
        if not name or len(name) < 2:
            continue

        # Remove obvious duplicates
        if any(d["name"].lower() == name.lower() for d in processed):
            continue

        candidate = {
            "name": name,
            "description": description,
            "price": price,
            "category": dish.get("category", "main"),
            "ingredients": dish.get("ingredients", []),
            "dietary_tags": dish.get("dietary_tags", []),
            "preparation_style": dish.get("preparation_style", []),
        }

        # Coerce to canonical schema (normalizes category + defaults)
        try:
            canonical = DishItem(**candidate).dict()
        except Exception:
            # If schema coercion fails, skip item (better than poisoning downstream)
            continue

        processed.append(canonical)

    return processed


