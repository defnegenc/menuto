from app.services.menu_parser import MenuParser
from app.services.menu_parsing_utils import parse_price_robust, post_process_dishes


def test_parse_price_robust_handles_common_formats():
    cases = [
        ("$12", 12.0),
        ("€12,50", 12.5),
        ("12.99", 12.99),
        ("Price: 8", 8.0),
        ("each 5.5", 5.5),
        (None, None),
        ("", None),
        ("N/A", None),
        (15, 15.0),
        (15.25, 15.25),
    ]

    for raw, expected in cases:
        assert parse_price_robust(raw) == expected


def test_post_process_dishes_dedupes_and_merges_newlines_and_normalizes_category():
    dishes = [
        {"name": "Burger", "description": "Beef", "price": "$12", "category": "Entree"},
        {"name": "burger", "description": "Duplicate", "price": "$13", "category": "main"},
        {"name": "Salad\nFresh greens", "description": "", "price": "€9,50", "category": "Appetizer"},
        {"name": "  ", "description": "bad"},
    ]

    cleaned = post_process_dishes(dishes)

    assert len(cleaned) == 2
    assert cleaned[0]["name"] == "Burger"
    assert cleaned[0]["price"] == 12.0
    assert cleaned[0]["category"] == "main"  # entree -> main

    assert cleaned[1]["name"] == "Salad"
    assert cleaned[1]["description"] == "Fresh greens"
    assert cleaned[1]["price"] == 9.5
    assert cleaned[1]["category"] == "starter"  # appetizer -> starter


def test_menu_parser_wrappers_delegate_to_utils_without_openai():
    parser = MenuParser(client=object())

    assert parser._parse_price_robust("$10") == 10.0

    cleaned = parser.post_process_dishes([{"name": "Tea", "description": "", "category": "drink"}])
    assert cleaned == [
        {
            "name": "Tea",
            "description": "",
            "price": None,
            "category": "beverage",
            "ingredients": [],
            "dietary_tags": [],
            "preparation_style": [],
        }
    ]


