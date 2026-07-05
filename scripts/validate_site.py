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
RETIRED_PROFESSIONAL_PUBLIC_TARGETS = [
    "provider-cost-outlier-analysis",
    "preferred-provider-contract-model",
    "acquisition-product-matching",
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
        self.glance_counts = {key: 0 for key in PROJECT_ORDER}

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
        if self.current_project and "class" in attrs and "glance" in attrs["class"].split():
            self.glance_counts[self.current_project] += 1

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
    forbidden = [
        "146,000",
        "400,000",
        "146000",
        "400000",
        "More than 50 percent",
        "more than 50 percent",
        "reduction of more than 50 percent",
        "Approved professional summary",
        "Verified professional summary",
        "Could not verify",
        "could not be verified",
        "Resume and Profile Links",
        "LinkedIn",
    ]
    for phrase in forbidden:
        if phrase in visible or phrase in html:
            fail(f"forbidden public phrase appears: {phrase}")
    for target in RETIRED_PROFESSIONAL_PUBLIC_TARGETS:
        if target in html:
            fail(f"retired professional public target remains in HTML: {target}")
    for required in ["1.4 million", "4 million", "hundreds of manual work hours"]:
        if required not in visible:
            fail(f"required acquisition language missing: {required}")
    if "cost per active member month" not in visible:
        fail("provider content omits cost per active member month")
    if "SQL" not in visible or "Tableau" not in visible:
        fail("provider tools omit SQL or Tableau")
    if "provider-scatter" in html or "worldcup-scatter" in html or "Scatterplot" in visible:
        fail("provider or World Cup scatterplot remains on combined page")
    bad = [text for text in parser.text if any(ch in text for ch in DASHES)]
    if bad:
        fail(f"visible static copy contains dash characters: {bad[:5]}")
    if parser.sections != PROJECT_ORDER:
        fail(f"project order is {parser.sections}")
    for project, count in parser.panel_counts.items():
        if count != 2:
            fail(f"{project} has {count} visual panels")
    for project, count in parser.glance_counts.items():
        if count != 1:
            fail(f"{project} has {count} Business at a Glance panels")
    for project in PROJECT_ORDER:
        marker = f'data-project="{project}"'
        start = html.find(marker)
        end = html.find('data-project="', start + 1)
        section = html[start:end if end != -1 else len(html)]
        if "Business at a Glance" not in section:
            fail(f"{project} lacks Business at a Glance")
        if "Google XYZ achievement" not in section:
            fail(f"{project} lacks Google XYZ")
        if "Tools used" not in section and "Original project tools and methods" not in section:
            fail(f"{project} lacks original tools")
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
    raw_data = data_path.read_text(encoding="utf-8")
    for target in RETIRED_PROFESSIONAL_PUBLIC_TARGETS:
        if target in raw_data:
            fail(f"retired professional public target remains in data bundle: {target}")
    data = json.loads(raw_data)
    required = ["provider", "preferred", "acquisition", "worldcup"]
    for key in required:
        if key not in data:
            fail(f"missing data key {key}")
    if len(data["provider"]["workspaceRows"]) == 0:
        fail("provider workspace rows missing")
    if len(data["worldcup"].get("ranking", [])) < 6:
        fail("world cup ranking data looks incomplete")
    for row in data["acquisition"]["review"]:
        if row["outcome"] == "Review" and not row.get("secondBest"):
            fail("acquisition review case lacks second closest candidate")
    if not any(row["outcome"] == "Auto Match" for row in data["acquisition"]["review"]):
        fail("acquisition examples do not include auto match cases")
    if not any(row["outcome"] == "Review" for row in data["acquisition"]["review"]):
        fail("acquisition examples do not include review cases")
    if len(data["provider"]["workspaceRows"]) < 6:
        fail("provider table data has fewer than six rows")


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
