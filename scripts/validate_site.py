import json
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ORDER = ["provider", "contract", "acquisition", "hurricane", "worldcup"]
PANEL_EXPECTED = {"provider": 1, "contract": 1, "acquisition": 1, "hurricane": 1, "worldcup": 2}
PRIVATE_TARGETS = ["provider-cost-outlier-analysis", "preferred-provider-contract-model", "acquisition-product-matching", "hurricane-exposure-portfolio-risk-analysis"]

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.skip=False; self.text=[]; self.sections=[]; self.current=None; self.panels={k:0 for k in PROJECT_ORDER}; self.glance={k:0 for k in PROJECT_ORDER}; self.methods={k:0 for k in PROJECT_ORDER}
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs); classes=attrs.get("class","").split()
        if tag in {"script","style"}: self.skip=True
        if tag=="section" and attrs.get("data-project"):
            self.current=attrs["data-project"]; self.sections.append(self.current)
        if self.current and "visual-panel" in classes: self.panels[self.current]+=1
        if self.current and "glance" in classes: self.glance[self.current]+=1
        if self.current and "methods" in classes: self.methods[self.current]+=1
    def handle_endtag(self, tag):
        if tag in {"script","style"}: self.skip=False
        if tag=="section": self.current=None
    def handle_data(self, data):
        if not self.skip and data.strip(): self.text.append(data.strip())

def fail(msg): print(f"FAIL: {msg}"); sys.exit(1)
def section(html, project):
    s=html.find(f'data-project="{project}"')
    if s < 0: fail(f"missing {project}")
    e=html.find('data-project="', s+1)
    return html[s:e if e >= 0 else len(html)]

def main():
    html=(ROOT/'index.html').read_text(encoding='utf-8'); js=(ROOT/'app.js').read_text(encoding='utf-8'); css=(ROOT/'styles.css').read_text(encoding='utf-8'); data=json.loads((ROOT/'assets'/'portfolio-data.json').read_text(encoding='utf-8'))
    public='\n'.join([html,js,css]); p=Parser(); p.feed(html); visible='\n'.join(p.text)
    for target in PRIVATE_TARGETS:
        if target in public: fail(f"private repo target exposed: {target}")
    for phrase in ["Impact Summary", "Peer Median Comparison", "Savings Variance Bridge", "Savings Bridge", "waterfall", "Matching Funnel", "146,000", "400,000", "50 percent"]:
        if phrase.lower() in public.lower(): fail(f"retired phrase remains: {phrase}")
    for phrase in ["Project Index", "Five selected projects", "Impact at a Glance", "Business at a Glance", "Provider Cost Outlier Analysis", "Preferred DME Supplier Scenario", "Manual Review Workspace", "National Hurricane Exposure Map", "World Cup Weakest Link Analysis", "Chief Investment Officer", "board level reporting", "16 billion dollar", "Hurricane Debby 2024", "lineup floor", "Core XI", "bottom three", "0.77 Spearman", "Mexico", "Uruguay"]:
        if phrase not in visible and phrase not in public: fail(f"missing phrase: {phrase}")
    if p.sections != PROJECT_ORDER: fail(f"project order is {p.sections}")
    for k,v in PANEL_EXPECTED.items():
        if p.panels[k] != v: fail(f"{k} has {p.panels[k]} visual panels")
        if p.glance[k] != 1: fail(f"{k} glance count {p.glance[k]}")
        if p.methods[k] != 1: fail(f"{k} methods count {p.methods[k]}")
    provider=section(html,'provider')
    for phrase in ["SQL and Tableau", "Cost per active member month", "Peer group comparison", "Provider outlier ranking", "Contracting analytics review"]:
        if phrase not in provider: fail(f"provider missing {phrase}")
    contract=section(html,'contract')
    for phrase in ["SQL and Excel", "80 percent", "DMAS benchmark", "preferred DME supplier"]:
        if phrase not in contract: fail(f"contract missing {phrase}")
    acquisition=section(html,'acquisition')
    for phrase in ["Python and Excel", "1.4 million", "4 million", "hundreds of manual work hours"]:
        if phrase not in acquisition: fail(f"acquisition missing {phrase}")
    hurricane=section(html,'hurricane')
    for phrase in ["Project 04", "Full USA", "High exposure", "Outside exposure area", "SQL, Tableau"]:
        if phrase not in hurricane and phrase not in public: fail(f"hurricane missing {phrase}")
    for phrase in ["usa-state", "statePaths", "forecast-cone-mid", "forecast-cone-core", "data-hurricane-property"]:
        if phrase not in public: fail(f"hurricane map contract missing {phrase}")
    h=data['hurricane']; tiers={r['exposureTier'] for r in h['properties']}
    if tiers != {"High exposure", "Outside exposure area"}: fail(f"hurricane tiers not simplified: {tiers}")
    if len(h['scenario'].get('statePaths',[])) < 49: fail("state paths missing")
    affected=[r for r in h['properties'] if r['exposureTier']=="High exposure"]
    if len(affected) < 8: fail("not enough affected properties")
    if affected != sorted(affected, key=lambda r: r['estimatedValue'], reverse=True): fail("affected properties not ranked")
    for r in data['acquisition']['review']:
        if r.get('secondBest') and r.get('secondBest') not in {"No second candidate", "No close second candidate"}:
            if r.get('recommended') == r.get('secondBest') or r.get('primaryId') == r.get('secondId') or float(r.get('score') or 0) == float(r.get('secondScore') or 0): fail("acquisition primary and second candidate duplicate")
    print(json.dumps({"status":"passed"}, indent=2))
if __name__ == '__main__': main()
