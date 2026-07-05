import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DASHES = "-–—"
FULL_NAME = "Belmir Smajic"
PROJECT_ORDER = [
    "provider",
    "contract",
    "acquisition",
    "worldcup",
]


class VisibleTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.text = []
        self.links = []
        self.sections = []
        self.current_project = None
        self.panel_counts = {key: 0 for key in PROJECT_ORDER}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style"}:
            self.skip = True
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "section" and attrs.get("data-project"):
            self.current_project = attrs["data-project"]
            self.sections.append(self.current_project)
        if self.current_project and "class" in attrs and "visual-panel" in attrs["class"].split():
            self.panel_counts[self.current_project] += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.skip = False
        if tag == "section":
            self.current_project = None

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.text.append(data.strip())


def fail(message):
    print(f"FAIL: {message}")
    sys.exit(1)


def check_html():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    parser = VisibleTextParser()
    parser.feed(html)
    visible = "\n".join(parser.text)
    if FULL_NAME in html:
        fail("full personal name appears in site source")
    bad = [text for text in parser.text if any(ch in text for ch in DASHES)]
    if bad:
        fail(f"visible static copy contains dash characters: {bad[:5]}")
    if parser.sections != PROJECT_ORDER:
        fail(f"project order is {parser.sections}")
    for project, count in parser.panel_counts.items():
        if count != 2:
            fail(f"{project} has {count} visual panels")
    for phrase in [
        "Business context and results describe the original professional project.",
        "This is an independent public research project.",
    ]:
        if phrase not in visible:
            fail(f"required disclosure missing: {phrase}")
    return parser.links


def check_data():
    data_path = ROOT / "assets" / "portfolio-data.json"
    if not data_path.exists():
        fail("portfolio data bundle missing")
    data = json.loads(data_path.read_text(encoding="utf-8"))
    required = ["provider", "preferred", "acquisition", "worldcup"]
    for key in required:
        if key not in data:
            fail(f"missing data key {key}")
    if len(data["provider"]["workspaceRows"]) == 0:
        fail("provider workspace rows missing")
    if len(data["worldcup"]["scatter"]) < 40:
        fail("world cup scatter data looks incomplete")


def check_links(links):
    checked = []
    check_external = os.environ.get("CHECK_EXTERNAL_LINKS") == "1"
    for href in links:
        if href.startswith("#"):
            continue
        if href.startswith("http"):
            if not check_external:
                continue
            request = urllib.request.Request(href, method="HEAD", headers={"User-Agent": "portfolio-link-check"})
            try:
                with urllib.request.urlopen(request, timeout=20) as response:
                    if response.status >= 400:
                        fail(f"bad link {href} status {response.status}")
                    checked.append((href, response.status))
            except Exception as exc:
                request = urllib.request.Request(href, method="GET", headers={"User-Agent": "portfolio-link-check"})
                try:
                    with urllib.request.urlopen(request, timeout=20) as response:
                        if response.status >= 400:
                            fail(f"bad link {href} status {response.status}")
                        checked.append((href, response.status))
                except Exception:
                    fail(f"bad link {href}: {exc}")
        else:
            path = ROOT / href
            if not path.exists():
                fail(f"local link missing {href}")
            checked.append((href, 200))
    return checked


def check_js_copy_literals():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    if FULL_NAME in js:
        fail("full personal name appears in app script")


def main():
    links = check_html()
    check_data()
    check_js_copy_literals()
    checked = check_links(links)
    print(json.dumps({"status": "passed", "links_checked": len(checked)}, indent=2))


if __name__ == "__main__":
    main()
