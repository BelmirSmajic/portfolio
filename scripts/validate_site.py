import json
import os
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DASHES = "-\u2013\u2014"
FULL_NAME = "Belmir Smajic"
PROJECT_ORDER = ["provider", "contract", "acquisition", "hurricane", "worldcup"]
RETIRED_PROFESSIONAL_PUBLIC_TARGETS = [
    "provider-cost-outlier-analysis",
    "preferred-provider-contract-model",
    "acquisition-product-matching",
    "hurricane-exposure-portfolio-risk-analysis",
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
        self.chapter_counts = {key: 0 for key in PROJECT_ORDER}
        self.methods_counts = {key: 0 for key in PROJECT_ORDER}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style"}:
            self.skip = True
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "section" and attrs.get("data-project"):
            self.current_project = attrs["data-project"]
            self.sections.append(self.current_project)
        classes = attrs.get("class", "").split()
        if self.current_project and "visual-panel" in classes:
            self.panel_counts[self.current_project] += 1
        if self.current_project and "glance" in classes:
            self.glance_counts[self.current_project] += 1
        if self.current_project and "project-kicker" in classes:
            self.chapter_counts[self.current_project] += 1
        if self.current_project and "methods" in classes:
            self.methods_counts[self.current_project] += 1

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


def section_html(html, project):
    marker = f'data-project="{project}"'
    start = html.find(marker)
    if start == -1:
        fail(f"{project} section missing")
    end = html.find('data-project="', start + 1)
    return html[start : end if end != -1 else len(html)]


def check_html():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    parser = VisibleTextParser()
    parser.feed(html)
    visible = "\n".join(parser.text)

    if FULL_NAME in html or FULL_NAME in js or FULL_NAME in readme:
        fail("full personal name appears in public surface")

    google_xyz = "Google" + " XYZ"
    forbidden = [
        "Real business projects. Public demonstrations.",
        google_xyz,
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
        "Business value at a glance",
        "Synthetic Provider",
        "Lineup Floor Ranking",
        "Result or Business Value",
    ]
    public_surface = "\n".join([html, js, readme])
    for phrase in forbidden:
        if phrase in public_surface:
            fail(f"forbidden public phrase appears: {phrase}")

    for target in RETIRED_PROFESSIONAL_PUBLIC_TARGETS:
        if target in public_surface:
            fail(f"retired professional public target remains in public surface: {target}")

    required_visible = [
        "Analytics Portfolio",
        "Data, Business, and Product Analytics",
        "Selected Work",
        "Impact at a Glance",
        "Five selected projects",
        "Data note",
        "Professional project visuals use synthetic data created to demonstrate the original analytical workflows.",
        "Lineup floor was the stronger signal",
        "1.4 million compared with 4 million",
        "hundreds of manual work hours",
        "regional Medicaid health plan",
        "Hurricane Exposure and Portfolio Risk Analysis",
        "state pension fund real estate portfolio",
        "Board ready hurricane exposure view",
    ]
    for phrase in required_visible:
        if phrase not in visible:
            fail(f"required visible phrase missing: {phrase}")

    if "<strong>Hundreds of hours</strong>" in html:
        fail("acquisition project still uses a separate top impact card for hours saved")
    if "<strong>0.77 Spearman</strong>" in html:
        fail("World Cup top card still uses coefficient as the whole headline")
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
            fail(f"{project} has {count} at a glance panels")
    for project, count in parser.chapter_counts.items():
        if count != 1:
            fail(f"{project} lacks a clear project chapter header")
    for project, count in parser.methods_counts.items():
        if count != 1:
            fail(f"{project} lacks a Tools and Methods section")

    for project in PROJECT_ORDER:
        section = section_html(html, project)
        expected_glance = "Research at a Glance" if project == "worldcup" else "Business at a Glance"
        if expected_glance not in section:
            fail(f"{project} lacks {expected_glance}")
        key_label = "Key Finding" if project == "worldcup" else "Key Impact"
        if key_label not in section:
            fail(f"{project} lacks {key_label}")
        if "Tools and Methods" not in section or "<dt>Tools</dt>" not in section or "<dt>Methods</dt>" not in section:
            fail(f"{project} does not separate tools and methods")
        if "Project 0" not in section:
            fail(f"{project} lacks project number")

    hurricane = section_html(html, "hurricane")
    for phrase in [
        "Project 04",
        "Real Estate Risk and Exposure Analytics",
        "Business at a Glance",
        "What I Owned",
        "Interactive Hurricane Exposure Map",
        "Potentially Affected Properties Table",
        "board level reporting",
        "active storm tracking",
    ]:
        if phrase not in hurricane:
            fail(f"hurricane section missing: {phrase}")
    if html.find('data-project="hurricane"') > html.find('data-project="worldcup"'):
        fail("hurricane project appears below World Cup")
    if "renderHurricaneMap" not in js or "hurricane-detail" not in js or "data-hurricane-property" not in js:
        fail("hurricane map lacks property detail interaction")
    if "renderHurricaneTable" not in js or "sort((a, b) => b.estimatedValue - a.estimatedValue)" not in js:
        fail("hurricane table lacks ranked estimated value sorting")

    worldcup = section_html(html, "worldcup")
    for phrase in ["Business at a Glance", "Who the work supported", "Business problem", "Result or Business Value"]:
        if phrase in worldcup:
            fail(f"World Cup section uses business wording: {phrase}")
    for phrase in ["Mexico and Uruguay Comparison", "Value Rank Versus Lineup Floor Rank"]:
        if phrase not in worldcup:
            fail(f"World Cup visual missing: {phrase}")

    if "Project 05" not in worldcup:
        fail("World Cup project number was not updated to Project 05")

    for anchor in ["top", "projects", "provider", "contract", "acquisition", "hurricane", "worldcup", "approach"]:
        if f'id="{anchor}"' not in html:
            fail(f"project anchor missing: {anchor}")
    for label in ["Overview", "Provider Costs", "Contract Model", "Product Matching", "Hurricane Exposure", "World Cup Research", "Approach", "Back to Top"]:
        if label not in html:
            fail(f"sticky navigation link missing: {label}")
    if "aria-current" not in js or "IntersectionObserver" not in js:
        fail("active sticky navigation is not wired")

    return parser.links


def check_data():
    data_path = ROOT / "assets" / "portfolio-data.json"
    if not data_path.exists():
        fail("portfolio data bundle missing")
    raw_data = data_path.read_text(encoding="utf-8")
    for target in RETIRED_PROFESSIONAL_PUBLIC_TARGETS:
        if target in raw_data:
            fail(f"retired professional public target remains in data bundle: {target}")
    if "Synthetic Provider" in raw_data:
        fail("provider display name begins with Synthetic Provider")
    data = json.loads(raw_data)
    for key in ["provider", "preferred", "acquisition", "hurricane", "worldcup"]:
        if key not in data:
            fail(f"missing data key {key}")
    if len(data["provider"]["workspaceRows"]) < 6:
        fail("provider table data has fewer than six rows")
    for row in data["acquisition"]["review"]:
        if row["outcome"] == "Review" and not row.get("secondBest"):
            fail("acquisition review case lacks second closest candidate")
    if not any(row["outcome"] == "Auto Match" for row in data["acquisition"]["review"]):
        fail("acquisition examples do not include auto match cases")
    if not any(row["outcome"] == "Review" for row in data["acquisition"]["review"]):
        fail("acquisition examples do not include review cases")
    if len(data["worldcup"].get("rankGaps", [])) < 6:
        fail("world cup rank gap data looks incomplete")
    hurricane = data["hurricane"]
    if len(hurricane.get("properties", [])) < 50:
        fail("hurricane property data looks incomplete")
    tiers = {row.get("exposureTier") for row in hurricane.get("properties", [])}
    for tier in ["High", "Moderate", "Watch", "Outside"]:
        if tier not in tiers:
            fail(f"hurricane exposure tier missing: {tier}")
    affected = [row for row in hurricane["properties"] if row.get("exposureTier") in {"High", "Moderate"}]
    if len(affected) < 8:
        fail("hurricane affected properties table lacks enough records")
    if affected != sorted(affected, key=lambda row: row["estimatedValue"], reverse=True):
        fail("hurricane data is not sorted by estimated property value for affected rows")
    for row in hurricane["properties"]:
        if row["estimatedValue"] < 100000 or row["estimatedValue"] > 30000000:
            fail("hurricane property value outside expected range")
        for field in ["name", "city", "state", "type", "exposureTier", "status"]:
            if any(ch in str(row.get(field, "")) for ch in DASHES):
                fail(f"hurricane visible data contains dash characters in {field}")
    for row in data["worldcup"].get("comparison", []):
        for required in ["totalRank", "topThreeRank", "floorRank", "advanced", "points", "goalDifference"]:
            if required not in row:
                fail(f"World Cup comparison lacks {required}")
    outcomes = {row.get("advanced") for row in data["worldcup"].get("comparison", [])}
    if outcomes != {True, False}:
        fail("Mexico and Uruguay comparison lacks advancement outcomes")


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


def main():
    links = check_html()
    check_data()
    checked = check_links(links)
    print(json.dumps({"status": "passed", "links_checked": len(checked)}, indent=2))


if __name__ == "__main__":
    main()
