import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ORDER = ["provider", "contract", "acquisition", "hurricane", "worldcup"]
PANEL_EXPECTED = {"provider": 1, "contract": 1, "acquisition": 1, "hurricane": 1, "worldcup": 2}
WORKSPACE_PANELS = ["provider", "contract", "acquisition", "hurricane"]

FONT_FILES = [
    "inter-latin-400-normal.woff2",
    "inter-latin-600-normal.woff2",
    "fraunces-latin-500-normal.woff2",
    "fraunces-latin-600-normal.woff2",
]

# Only these external links may appear anywhere in the published site.
ALLOWED_URLS = {
    "https://github.com/belmirsmajic",
    "https://github.com/belmirsmajic/portfolio",
    "https://github.com/belmirsmajic/2026-world-cup-weakest-link",
    "https://belmirsmajic.github.io/portfolio",
    "https://belmirsmajic.github.io/2026-world-cup-weakest-link",
    "https://medium.com/@belmirsmajic/a-team-is-only-as-strong-as-the-bottom-of-its-lineup-491d8825fed4",
}
ALLOWED_HOSTS = {"localhost", "127.0.0.1", "www.w3.org"}
ALLOWED_REPO_SLUGS = {"portfolio", "2026-world-cup-weakest-link"}

BANNED_BUZZWORDS = ["leveraged", "spearheaded", "passionate", "cutting-edge", "cutting edge", "seamless", "robust"]

RETIRED_PHRASES = [
    "Impact Summary", "Peer Median Comparison", "Savings Variance Bridge", "Savings Bridge",
    "waterfall", "Matching Funnel", "146,000", "400,000", "50 percent",
]


class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.text = []
        self.sections = []
        self.current = None
        self.panels = {k: 0 for k in PROJECT_ORDER}
        self.glance = {k: 0 for k in PROJECT_ORDER}
        self.methods = {k: 0 for k in PROJECT_ORDER}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag in {"script", "style", "title"}:
            self.skip = True
        if tag == "section" and attrs.get("data-project"):
            self.current = attrs["data-project"]
            self.sections.append(self.current)
        if self.current and "visual-panel" in classes:
            self.panels[self.current] += 1
        if self.current and "glance" in classes:
            self.glance[self.current] += 1
        if self.current and "methods" in classes:
            self.methods[self.current] += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "title"}:
            self.skip = False
        if tag == "section":
            self.current = None

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.text.append(data.strip())


def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)


def section(html, project):
    s = html.find(f'data-project="{project}"')
    if s < 0:
        fail(f"missing {project}")
    e = html.find('data-project="', s + 1)
    return html[s:e if e >= 0 else len(html)]


def hero_block(html):
    s = html.find('<section id="top"')
    e = html.find("<section", s + 1)
    return html[s:e if e >= 0 else len(html)]


def worldcup_block(html):
    return section(html, "worldcup")


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    data = json.loads((ROOT / "assets" / "portfolio-data.json").read_text(encoding="utf-8"))

    public = "\n".join([html, js, css])
    p = Parser()
    p.feed(html)
    visible = "\n".join(p.text)

    # --- No BOM anywhere in text sources ---
    for name in ["index.html", "app.js", "styles.css", "scripts/validate_site.py", "README.md", "assets/portfolio-data.json"]:
        raw = (ROOT / name).read_bytes()
        if raw[:3] == b"\xef\xbb\xbf":
            fail(f"{name} has a UTF-8 BOM")
        if b"\r\n" in raw:
            fail(f"{name} has CRLF line endings; normalize to LF")

    # --- Balanced <section> and <div> tags ---
    for tag in ["section", "div"]:
        opens = len(re.findall(rf"<{tag}[\s>]", html))
        closes = len(re.findall(rf"</{tag}>", html))
        if opens != closes:
            fail(f"unbalanced <{tag}> tags: {opens} open / {closes} close")

    # --- All five project ids present, in order ---
    if p.sections != PROJECT_ORDER:
        fail(f"project order is {p.sections}")
    for pid in PROJECT_ORDER:
        if f'data-project="{pid}"' not in html:
            fail(f"missing project: {pid}")

    # --- Panel / glance / methods structure ---
    for k, v in PANEL_EXPECTED.items():
        if p.panels[k] != v:
            fail(f"{k} has {p.panels[k]} visual panels")
        if p.glance[k] != 1:
            fail(f"{k} glance count {p.glance[k]}")
        if p.methods[k] != 1:
            fail(f"{k} methods count {p.methods[k]}")

    # --- Portfolio-first identity; standalone name not visually central ---
    hero = hero_block(html)
    for needed in ["<h1>Analytics Portfolio</h1>",
                   "Data, business, and product analytics work",
                   "https://github.com/BelmirSmajic", "mailto:belmirsmajic@outlook.com",
                   "View Projects"]:
        if needed not in hero:
            fail(f"hero missing: {needed}")
    if "linkedin" in hero.lower():
        fail("hero must not contain a LinkedIn link")
    if "Belmir Smajic" in visible:
        fail("standalone name must not appear in the visible site body; keep it in metadata and link destinations only")

    # --- Header brand leads with the portfolio, not the name ---
    if not re.search(r'class="brand"[^>]*>Analytics Portfolio</a>', html):
        fail("header brand text must be 'Analytics Portfolio'")

    # --- Title and og tags: portfolio-first (the name may stay in metadata) ---
    m = re.search(r"<title>([^<]*)</title>", html)
    if not m or "Analytics Portfolio" not in m.group(1):
        fail("title must lead with Analytics Portfolio")
    og = re.search(r'<meta property="og:title" content="([^"]*)"', html)
    if not og or og.group(1).strip() != "Analytics Portfolio":
        fail("og:title must be 'Analytics Portfolio'")

    # --- Contact links limited to GitHub and Email ---
    if "https://github.com/BelmirSmajic" not in html or "mailto:belmirsmajic@outlook.com" not in html:
        fail("GitHub and Email contact links must be present")

    # --- Medium write-up link inside #worldcup, alongside the public repo ---
    wc = worldcup_block(html)
    medium = "https://medium.com/@belmirsmajic/a-team-is-only-as-strong-as-the-bottom-of-its-lineup-491d8825fed4"
    if medium not in wc:
        fail("Medium write-up link missing from #worldcup")
    if "https://github.com/BelmirSmajic/2026-world-cup-weakest-link" not in wc:
        fail("public World Cup repo link missing from #worldcup")

    # --- Header is a single-row tablist: home tab then the five projects ---
    if "section-jump" in public or "data-section-link" in html:
        fail("old scroll-rail navigation must be removed")
    header = html[html.find("<header"):html.find("</header>")]
    for gone in [">Projects</a>", ">Approach</a>", ">GitHub</a>", ">Email</a>"]:
        if gone in header:
            fail(f"old top nav link must be removed from the header: {gone}")
    if 'class="project-tabs" role="tablist"' not in header:
        fail("header must hold the project tablist")
    if 'data-project-tab="home"' not in header:
        fail("header must have the landing (home) tab first")
    if header.find('data-project-tab="home"') > header.find('data-project-tab="provider"'):
        fail("the home tab must come before the project tabs")
    for pid in PROJECT_ORDER:
        if f'data-project-tab="{pid}"' not in header:
            fail(f"project tab missing for {pid}")
        if f'id="panel-{pid}"' not in html:
            fail(f"project panel missing for {pid}")
    if header.count('role="tab"') != 6:
        fail("header must have exactly six tabs (home plus five projects)")
    if "wireProjectExplorer" not in js:
        fail("project explorer wiring missing from app.js")

    # --- Landing is its own page (home tab): hero, index, data note, approach ---
    hs = html.find('id="panel-home"')
    he = html.find('id="panel-provider"')
    home = html[hs:he] if hs >= 0 and he > hs else ""
    if not home:
        fail("landing home panel missing")
    for needed in ['class="hero"', 'class="project-index"', 'class="data-note"', 'id="approach"']:
        if needed not in home:
            fail(f"landing page missing: {needed}")
    home_tag = re.search(r'id="panel-home"[^>]*>', html)
    if not home_tag or "hidden" in home_tag.group(0):
        fail("landing (home) must be the default visible page")
    ph = re.search(r'id="ptab-home"[^>]*>', html)
    if not ph or 'aria-selected="true"' not in ph.group(0):
        fail("home tab must be selected by default")
    for pid in PROJECT_ORDER:
        panel = re.search(rf'id="panel-{pid}"[^>]*>', html)
        if not panel or "hidden" not in panel.group(0):
            fail(f"project panel {pid} must be hidden until selected")

    # --- No overflow-x: hidden anywhere (fix overflow at the source) ---
    if "overflow-x:hidden" in css.replace(" ", ""):
        fail("overflow-x: hidden must not be used; scroll within panels instead")

    # --- No cache-buster query strings on assets ---
    if "styles.css?v=" in html or "app.js?v=" in html:
        fail("cache-buster query string remains on a static asset")

    # --- Required metric strings ---
    metric_targets = {
        "$500,000": public, "1.4 million": public, "1.4M": public,
        "4 million": public, "4M records": public, "hundreds of manual work hours": public,
        "16 billion dollar": public, "$16B": public, "80 percent": public,
        "DMAS benchmark": public, "0.77": public, "92%": public, "17%": public,
        "528": public, "48 teams": public,
    }
    for token, hay in metric_targets.items():
        if token not in hay:
            fail(f"required metric string missing: {token}")

    # --- Banned resume buzzwords ---
    low = public.lower()
    for word in BANNED_BUZZWORDS:
        if re.search(rf"\b{re.escape(word)}\b", low):
            fail(f"banned buzzword present: {word}")

    # --- Retired phrases must stay gone ---
    for phrase in RETIRED_PHRASES:
        if phrase.lower() in public.lower():
            fail(f"retired phrase remains: {phrase}")

    # --- Synthetic-data caption on every professional workspace panel ---
    for pid in WORKSPACE_PANELS:
        block = section(html, pid)
        if "synthetic-caption" not in block or "Synthetic data" not in block:
            fail(f"{pid} workspace panel missing a Synthetic data caption")

    # --- Self-hosted fonts exist and are referenced ---
    for fname in FONT_FILES:
        if not (ROOT / "assets" / "fonts" / fname).is_file():
            fail(f"font file missing: {fname}")
        if fname not in css:
            fail(f"font file not referenced in styles.css: {fname}")
    if "font-display:swap" not in css.replace(" ", ""):
        fail("@font-face must use font-display: swap")

    # --- Stylesheet consolidated under 800 lines ---
    css_lines = css.count("\n") + 1
    if css_lines >= 800:
        fail(f"styles.css is {css_lines} lines; keep it under 800")

    # --- Storm overlay: real Hurricane Debby 2024 data ---
    if "Hurricane Debby" not in js:
        fail("storm SVG does not carry a Hurricane Debby label")
    sc = data["hurricane"]["scenario"]
    if "Debby" not in sc.get("stormName", "") or "Debby" not in sc.get("name", ""):
        fail("hurricane scenario is not labelled Hurricane Debby")
    forecast = sc.get("forecastTrack", [])
    if len(forecast) < 4:
        fail(f"storm forecast has only {len(forecast)} points; need >= 4")
    for token in ["storm-cone", "forecast-point", "forecast-hour", "storm-track-past", "storm-track-forecast", "data-hurricane-property", "usa-state"]:
        if token not in js:
            fail(f"storm overlay contract missing: {token}")
    if len(sc.get("pastTrack", [])) < 2:
        fail("storm past track is missing")
    if len(sc.get("statePaths", [])) < 49:
        fail("state paths missing")

    # --- Cone membership drives the affected set (table matches the cone) ---
    def proj(lat, lon):
        return (((lon + 125) / 59) * 920 + 40, ((50 - lat) / 26) * 520 + 30)
    px_per_nmi = 20 / 60
    cone_pts = [sc["currentPosition"]] + forecast
    circles = [(*proj(pt["lat"], pt["lon"]), pt.get("radiusNmi", 0) * px_per_nmi) for pt in cone_pts]

    def in_cone(lat, lon):
        x, y = proj(lat, lon)
        for cx, cy, r in circles:
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                return True
        for i in range(len(circles) - 1):
            ax, ay, ra = circles[i]
            bx, by, rb = circles[i + 1]
            vx, vy = bx - ax, by - ay
            l2 = vx * vx + vy * vy
            t = 0 if l2 == 0 else max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / l2))
            qx, qy = ax + t * vx, ay + t * vy
            lr = ra + t * (rb - ra)
            if (x - qx) ** 2 + (y - qy) ** 2 <= lr * lr:
                return True
        return False

    props = data["hurricane"]["properties"]
    tiers = {r["exposureTier"] for r in props}
    if tiers != {"High exposure", "Outside exposure area"}:
        fail(f"hurricane tiers not simplified: {tiers}")
    for r in props:
        expected = "High exposure" if in_cone(r["lat"], r["lon"]) else "Outside exposure area"
        if r["exposureTier"] != expected:
            fail(f"property {r['id']} tier does not match the forecast cone")
    affected = [r for r in props if r["exposureTier"] == "High exposure"]
    if len(affected) < 8:
        fail(f"only {len(affected)} affected properties; need >= 8")
    if sc["affectedCount"] != len(affected):
        fail("scenario affectedCount does not match affected properties")
    if sc["totalPotentialExposure"] != sum(r["estimatedValue"] for r in affected):
        fail("scenario totalPotentialExposure does not match affected properties")

    # --- Acquisition primary and second candidate stay distinct ---
    for r in data["acquisition"]["review"]:
        if r.get("secondBest") and r.get("secondBest") not in {"No second candidate", "No close second candidate"}:
            if r.get("recommended") == r.get("secondBest") or r.get("primaryId") == r.get("secondId") or float(r.get("score") or 0) == float(r.get("secondScore") or 0):
                fail("acquisition primary and second candidate duplicate")

    # --- Storm swap: zero Florence anywhere; Debby label present ---
    whole = "\n".join([html, js, css, readme, json.dumps(data, ensure_ascii=False)])
    if "Florence" in whole:
        fail("Florence reference still present; the storm must be Debby only")
    if "Debby" not in html or "Debby" not in js:
        fail("Hurricane Debby label missing from the page or storm SVG")

    # --- Reader layer: one business question per project header ---
    questions = re.findall(r'class="project-question"', html)
    if len(questions) != 5:
        fail(f"expected 5 project question lines, found {len(questions)}")
    for pid in PROJECT_ORDER:
        if 'class="project-question"' not in section(html, pid):
            fail(f"{pid} missing its business question line")

    # --- No floating stat strip: headline numbers live inside their projects ---
    if "outcome-strip" in html or "outcome-strip" in css:
        fail("the hero outcome strip must be removed; stats belong in their project sections")
    for pid, token in [("provider", "$500,000"), ("acquisition", "Hundreds"),
                       ("hurricane", "$16B"), ("worldcup", "0.77")]:
        if token not in section(html, pid):
            fail(f"{pid} section missing its headline number {token}")

    # --- Compact index cards in a 3-over-2 desktop grid ---
    cards = re.findall(r"<article>\s*<div class=\"card-top\">.*?</article>", html, re.S)
    if len(cards) != 5:
        fail(f"expected 5 index cards, found {len(cards)}")
    for card in cards:
        body = re.search(r"</div>\s*<p>(.*?)</p>", card, re.S)
        text = re.sub(r"<[^>]+>", "", body.group(1)).strip() if body else ""
        if not text:
            fail("index card missing its one-sentence summary")
        if len(text) > 170:
            fail(f"index card summary too long ({len(text)} chars): {text[:60]}...")
    if not re.search(r"\.project-card-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)", css):
        fail("project index must use a 3-column desktop grid (3 over 2)")

    # --- Header project tabs use the full project names ---
    project_names = {
        "provider": "Provider Cost Outlier Analysis",
        "contract": "Preferred Provider Contract Scenario Model",
        "acquisition": "Acquisition Product Matching",
        "hurricane": "Hurricane Exposure and Portfolio Risk Analysis",
        "worldcup": "World Cup Weakest Link Analysis",
    }
    for pid, name in project_names.items():
        if f'data-project-tab="{pid}">{name}</button>' not in header:
            fail(f"{pid} project tab must use the full project name")

    # --- Overview first (default), Workspace second, artifact-only ---
    if html.count('class="tab-row"') != 5:
        fail("expected one Overview/Workspace tab row per project")

    def view_slice(block, pid, view):
        start = block.find(f'id="{pid}-view-{view}"')
        if start < 0:
            return ""
        after = block.find('id="' + pid + '-view-', start + 1)
        return block[start:after if after >= 0 else len(block)]

    for pid in PROJECT_ORDER:
        block = section(html, pid)
        if block.count("data-tab") != 2:
            fail(f"{pid} does not have exactly two inner (Overview/Workspace) tabs")
        row = block[block.find('class="tab-row"'):block.find("</div>", block.find('class="tab-row"'))]
        if row.find("Overview") < 0 or row.find("Workspace") < 0 or row.find("Overview") > row.find("Workspace"):
            fail(f"{pid} must list Overview before Workspace")
        ov = re.search(rf'id="{pid}-view-overview"[^>]*>', block)
        ws = re.search(rf'id="{pid}-view-workspace"[^>]*>', block)
        if not ov or "hidden" in ov.group(0):
            fail(f"{pid} Overview must be the visible default")
        if not ws or "hidden" not in ws.group(0):
            fail(f"{pid} Workspace must be hidden until selected")
        ov_slice = view_slice(block, pid, "overview")
        ws_slice = view_slice(block, pid, "workspace")
        for token in ["project-question", 'class="glance"', "stat-callouts", "<h2>"]:
            if token not in ov_slice:
                fail(f"{pid} Overview is missing framing content: {token}")
        for token in ["project-question", 'class="glance"', "stat-callouts", "Business at a Glance"]:
            if token in ws_slice:
                fail(f"{pid} Workspace must show only the artifact (found {token})")
        if "visual-panel" not in ws_slice:
            fail(f"{pid} Workspace must contain its artifact panel")
    if "wireTabs" not in js:
        fail("inner tab wiring missing from app.js")

    # --- Contract framing: modeled, supported/implemented, and validated ---
    contract = section(html, "contract")
    for token in ["supported", "implementation", "materialized", "80 percent", "DMAS benchmark", "preferred DME supplier"]:
        if token not in contract:
            fail(f"contract framing missing: {token}")

    # --- Evidence badge on every project header and index card ---
    for pid in ["provider", "contract", "acquisition", "hurricane"]:
        if "Confidential work · synthetic demo" not in section(html, pid):
            fail(f"{pid} missing its confidential evidence badge")
    if "Public · code and data inspectable" not in section(html, "worldcup"):
        fail("worldcup missing its public evidence badge")
    badge_count = html.count("evidence-badge")
    if badge_count < 10:
        fail(f"expected an evidence badge on 5 cards and 5 headers, found {badge_count}")

    # --- Collapsible Glance and What I Owned per project ---
    details_count = len(re.findall(r"<details", html))
    if details_count != 10:
        fail(f"expected 10 <details> blocks, found {details_count}")
    for pid in PROJECT_ORDER:
        if section(html, pid).count("<details") != 2:
            fail(f"{pid} does not have exactly two collapsible sections")

    # --- Project identity: numerals 01-05 and domain tags ---
    numerals = re.findall(r'class="project-numeral">(\d\d)<', html)
    if numerals != ["01", "02", "03", "04", "05"]:
        fail(f"project numerals are not 01-05 in order: {numerals}")
    if len(re.findall(r'class="domain-tag"', html)) != 5:
        fail("expected 5 project domain tags")

    # --- Table fit: workspace tables free of the scrolling wrapper ---
    if "table-wrap workspace-table-wrap" in js or 'el("div", "table-wrap")' in js:
        fail("workspace tables must not use the scrolling table-wrap class")
    if "workspace-table-wrap" not in js:
        fail("workspace tables must use workspace-table-wrap")
    if "overflow-x:visible" not in css.replace(" ", ""):
        fail("workspace-table-wrap must default to overflow-x: visible (no desktop scroll)")
    if "tabular-nums" not in css:
        fail("workspace tables must use font-variant-numeric: tabular-nums")

    # --- Layout patch: no breakout; width reclaimed via the grid variables ---
    if "workspace-breakout" in css or "workspace-breakout" in html:
        fail(".workspace-breakout must be removed from CSS and HTML")
    if re.search(r"margin-left\s*:\s*calc\(\s*-", css):
        fail("no negative margin-left may remain on workspace panels")
    for var, val in [("--rail", "168px"), ("--shell-gap", "2rem"), ("--maxw", "1360px")]:
        if not re.search(rf"{re.escape(var)}\s*:\s*{re.escape(val)}", css):
            fail(f"grid variable {var} is not set to {val}")

    # --- Only allowed external links appear in the published site ---
    scan = "\n".join([html, js, css, readme, json.dumps(data)])
    for raw_url in re.findall(r"https?://[^\s\"'<>)\\]+", scan):
        url = raw_url.rstrip("/`.,)")
        host = re.sub(r"^https?://", "", url).split("/")[0].split(":")[0].lower()
        if host in ALLOWED_HOSTS:
            continue
        if url.lower() in ALLOWED_URLS:
            continue
        fail(f"disallowed URL present: {raw_url}")
    for slug in re.findall(r"github\.com/BelmirSmajic/([A-Za-z0-9._-]+)", scan):
        if slug.rstrip(".").lower() not in ALLOWED_REPO_SLUGS:
            fail(f"disallowed repository reference: {slug}")

    print(json.dumps({"status": "passed", "cssLines": css_lines, "affected": len(affected)}, indent=2))


if __name__ == "__main__":
    main()
