from app.services.menu_data_service import MenuDataService, ParsedMenuItem


class DummyEngine:
    pass


def _item(name: str, description: str = "", category: str | None = None) -> ParsedMenuItem:
    return ParsedMenuItem(
        id="x",
        name=name,
        description=description,
        price=None,
        category=category,
        sentiment_score=None,
        metadata={},
    )


def test_normalize_course_basic():
    svc = MenuDataService(DummyEngine())

    assert svc._normalize_course("Appetizers") == "starter"
    assert svc._normalize_course("Entrées") == "main"
    assert svc._normalize_course("Desserts") == "dessert"
    assert svc._normalize_course("Drinks") == "drink"
    assert svc._normalize_course(None) is None


def test_guess_protein_and_spice_and_shareable():
    svc = MenuDataService(DummyEngine())

    assert svc._guess_protein(_item("Spicy chicken taco")) == "chicken"
    assert svc._guess_spice(_item("Spicy chicken taco", "hot chili")) is not None
    assert svc._guess_is_shareable(_item("Nachos platter", "great for sharing")) is True


