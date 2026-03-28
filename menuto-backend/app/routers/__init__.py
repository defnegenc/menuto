"""
Router exports for the Menuto API.
"""

from . import behavioral_tracking
from . import menu_api
from . import menu_parser_api
from . import menu_parsing
from . import places
from . import reviews
from . import smart_recommendations
from . import users

__all__ = [
    "behavioral_tracking",
    "menu_api",
    "menu_parser_api",
    "menu_parsing",
    "places",
    "reviews",
    "smart_recommendations",
    "users",
]
