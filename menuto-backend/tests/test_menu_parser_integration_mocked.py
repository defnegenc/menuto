import types

import responses

from app.services.menu_parser import MenuParser, MenuParsingError, parse_menu_url_with_cuisine


class _FakeUsage:
    def __init__(self, prompt_tokens=10, completion_tokens=20, total_tokens=30):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens


class _FakeMessage:
    def __init__(self, content: str | None):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str | None):
        self.message = _FakeMessage(content)


class _FakeResp:
    def __init__(self, content: str | None):
        self.choices = [_FakeChoice(content)]
        self.usage = _FakeUsage()


class _FakeCompletions:
    def __init__(self, contents: list[str | None]):
        self._contents = list(contents)
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if not self._contents:
            return _FakeResp("")
        return _FakeResp(self._contents.pop(0))


class _FakeChat:
    def __init__(self, contents: list[str | None]):
        self.completions = _FakeCompletions(contents)


class _FakeOpenAI:
    def __init__(self, contents: list[str | None]):
        self.chat = _FakeChat(contents)


@responses.activate
def test_parse_menu_url_with_cuisine_html_valid_json():
    url = "https://example.com/menu"
    responses.add(responses.HEAD, url, headers={"content-type": "text/html"}, status=200)
    responses.add(
        responses.GET,
        url,
        body="""
        <html><body>
          <div class="menu-item"><h3>Burger</h3><p>Beef, cheese</p><span class="price">$12</span></div>
          <div class="menu-item"><h3>Salad</h3><p>Fresh greens</p><span class="price">€9,50</span></div>
        </body></html>
        """,
        status=200,
        headers={"content-type": "text/html"},
    )

    llm_json = """
    {
      "dishes": [
        {"name":"Burger","description":"Beef, cheese","price":"$12","category":"entree","ingredients":[],"dietary_tags":[],"preparation_style":[]},
        {"name":"Salad","description":"Fresh greens","price":"€9,50","category":"appetizer","ingredients":[],"dietary_tags":[],"preparation_style":[]}
      ],
      "cuisine_type":"american"
    }
    """.strip()

    parser = MenuParser(client=_FakeOpenAI([llm_json]))
    dishes, cuisine = parse_menu_url_with_cuisine(url, "Example", parser=parser)

    assert cuisine == "american"
    assert len(dishes) == 2
    assert dishes[0]["name"] == "Burger"
    assert dishes[0]["price"] == 12.0
    assert dishes[0]["category"] == "main"
    assert dishes[1]["price"] == 9.5
    assert dishes[1]["category"] == "starter"


@responses.activate
def test_parse_menu_url_with_cuisine_retries_on_invalid_json_then_succeeds():
    url = "https://example.com/menu2"
    responses.add(responses.HEAD, url, headers={"content-type": "text/html"}, status=200)
    responses.add(responses.GET, url, body=b"<html><body><div class='menu-item'><h3>Taco</h3></div></body></html>", status=200)

    invalid = "NOT JSON AT ALL"
    valid = '{"dishes":[{"name":"Taco","description":"","price":5,"category":"main","ingredients":[],"dietary_tags":[],"preparation_style":[]}],"cuisine_type":"mexican"}'

    parser = MenuParser(client=_FakeOpenAI([invalid, valid]))
    dishes, cuisine = parse_menu_url_with_cuisine(url, "Example", parser=parser)

    assert cuisine == "mexican"
    assert [d["name"] for d in dishes] == ["Taco"]
    assert dishes[0]["price"] == 5.0


@responses.activate
def test_parse_menu_url_with_cuisine_empty_llm_content_returns_structured_error():
    url = "https://example.com/menu3"
    responses.add(responses.HEAD, url, headers={"content-type": "text/html"}, status=200)
    responses.add(responses.GET, url, body=b"<html><body><div class='menu-item'><h3>Tea</h3></div></body></html>", status=200)

    parser = MenuParser(client=_FakeOpenAI([""]))

    try:
        parse_menu_url_with_cuisine(url, "Example", parser=parser)
        assert False, "Expected MenuParsingError"
    except MenuParsingError as e:
        assert e.code == "llm_empty_response"
        assert e.status_code == 502


@responses.activate
def test_parse_menu_url_with_cuisine_pdf_branch_uses_pdf_extractor_and_llm():
    url = "https://example.com/menu.pdf"
    responses.add(responses.HEAD, url, headers={"content-type": "application/pdf"}, status=200)

    llm = '{"dishes":[{"name":"Pasta","description":"","price":14,"category":"main","ingredients":[],"dietary_tags":[],"preparation_style":[]}],"cuisine_type":"italian"}'
    parser = MenuParser(client=_FakeOpenAI([llm]))

    def _fake_extract_pdf_text(self, _url: str) -> str:
        return "PASTA 14\n" + ("MENU LINE " * 10)

    parser.extract_pdf_text = types.MethodType(_fake_extract_pdf_text, parser)

    dishes, cuisine = parse_menu_url_with_cuisine(url, "Example", parser=parser)
    assert cuisine == "italian"
    assert dishes[0]["name"] == "Pasta"
    assert dishes[0]["price"] == 14.0


