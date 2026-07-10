const state = {};
const SVGNS = "http://www.w3.org/2000/svg";

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});
const fmtNum = new Intl.NumberFormat("en-US");
const fmtCompactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const nationalCityLabels = [
  { name: "Seattle", lat: 47.6062, lon: -122.3321, dx: 10, dy: 0 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194, dx: 8, dy: 14 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, dx: 8, dy: 12 },
  { name: "Denver", lat: 39.7392, lon: -104.9903, dx: 8, dy: -8 },
  { name: "Dallas", lat: 32.7767, lon: -96.7970, dx: 8, dy: 12 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298, dx: 8, dy: -8 },
  { name: "Atlanta", lat: 33.7490, lon: -84.3880, dx: 8, dy: 14 },
  { name: "Miami", lat: 25.7617, lon: -80.1918, dx: 8, dy: 14 },
  { name: "Charleston", lat: 32.7765, lon: -79.9311, dx: 10, dy: -10 },
  { name: "Raleigh", lat: 35.7796, lon: -78.6382, dx: 10, dy: -10 },
  { name: "Washington", lat: 38.9072, lon: -77.0369, dx: 10, dy: -10 },
  { name: "New York", lat: 40.7128, lon: -74.0060, dx: 10, dy: -8 }
];

// projectUsPoint maps latitude to 20px/degree, so 1 nautical mile = 20/60 px.
const PX_PER_NMI = 20 / 60;

function cleanText(value) {
  return String(value ?? "").replace(/[-–—]/g, " ");
}
function money(value) {
  const number = Number(value || 0);
  if (number < 0) return `(${fmtMoney.format(Math.abs(number))})`;
  return fmtMoney.format(number);
}
function compactMoney(value) {
  return fmtCompactMoney.format(Number(value || 0));
}
function integer(value) {
  return fmtNum.format(Number(value || 0));
}
function signed(value) {
  const number = Number(value || 0);
  if (number < 0) return `minus ${Math.abs(number)}`;
  return String(number);
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = cleanText(text);
  return node;
}
function optionList(values) {
  return [...new Set(values)].sort();
}
function statusKey(value) {
  if (value === "Materially above median") return "above";
  if (value === "Below median") return "below";
  return "near";
}
function makeSelect(labelText, values, selected) {
  const wrap = el("label", "", labelText);
  const input = document.createElement("select");
  values.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = cleanText(value);
    if (value === selected) opt.selected = true;
    input.appendChild(opt);
  });
  wrap.appendChild(input);
  return { wrap, input };
}
function makeRange(labelText, min, max, value) {
  const wrap = el("label", "", `${labelText} ${value}`);
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.value = value;
  input.addEventListener("input", () => {
    wrap.firstChild.textContent = cleanText(`${labelText} ${input.value}`);
  });
  wrap.appendChild(input);
  return { wrap, input };
}

function projectUsPoint(lat, lon) {
  const x = ((lon + 125) / 59) * 920 + 40;
  const y = ((50 - lat) / 26) * 520 + 30;
  return { x, y };
}

function hurricaneCityLabel(city) {
  const point = projectUsPoint(city.lat, city.lon);
  return `<g class="city-label"><circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.8"></circle><text x="${(point.x + city.dx).toFixed(1)}" y="${(point.y + city.dy).toFixed(1)}">${cleanText(city.name)}</text></g>`;
}

/* ---- Storm forecast cone: tangent hull of the advisory circles ---- */
function coneCircles(scenario) {
  const points = [scenario.currentPosition, ...scenario.forecastTrack];
  return points.map((p) => {
    const q = projectUsPoint(p.lat, p.lon);
    return { x: q.x, y: q.y, r: (p.radiusNmi || 0) * PX_PER_NMI };
  });
}
function externalTangent(a, b, side) {
  const a0 = Math.atan2(b.y - a.y, b.x - a.x);
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let c = (a.r - b.r) / d;
  c = Math.max(-1, Math.min(1, c));
  const n = a0 + side * Math.acos(c);
  return {
    pA: { x: a.x + a.r * Math.cos(n), y: a.y + a.r * Math.sin(n) },
    pB: { x: b.x + b.r * Math.cos(n), y: b.y + b.r * Math.sin(n) }
  };
}
function normAngle(a) {
  while (a <= -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  return a;
}
function arcSamples(circle, aStart, aEnd, through, steps) {
  let ccw = normAngle(aEnd - aStart);
  if (ccw < 0) ccw += 2 * Math.PI;
  const cw = 2 * Math.PI - ccw;
  const midCcw = normAngle(aStart + ccw / 2);
  const midCw = normAngle(aStart - cw / 2);
  const gap = (x) => Math.abs(normAngle(x - through));
  const span = gap(midCcw) <= gap(midCw) ? ccw : -cw;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = aStart + (span * i) / steps;
    out.push({ x: circle.x + circle.r * Math.cos(a), y: circle.y + circle.r * Math.sin(a) });
  }
  return out;
}
function stormConePath(circles) {
  const n = circles.length;
  if (n < 2) return "";
  const left = [];
  const right = [];
  for (let i = 0; i < n - 1; i++) {
    const l = externalTangent(circles[i], circles[i + 1], 1);
    left.push(l.pA, l.pB);
    const r = externalTangent(circles[i], circles[i + 1], -1);
    right.push(r.pA, r.pB);
  }
  const first = circles[0];
  const last = circles[n - 1];
  const forward = Math.atan2(last.y - circles[n - 2].y, last.x - circles[n - 2].x);
  const backward = Math.atan2(first.y - circles[1].y, first.x - circles[1].x);
  const ll = left[left.length - 1];
  const rr = right[right.length - 1];
  const termArc = arcSamples(last, Math.atan2(ll.y - last.y, ll.x - last.x), Math.atan2(rr.y - last.y, rr.x - last.x), forward, 16);
  const lf = left[0];
  const rf = right[0];
  const startArc = arcSamples(first, Math.atan2(rf.y - first.y, rf.x - first.x), Math.atan2(lf.y - first.y, lf.x - first.x), backward, 8);
  const pts = [...left, ...termArc, ...right.slice().reverse(), ...startArc];
  return "M " + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ") + " Z";
}

function showHurricaneDetail(row, target) {
  state.hurricaneSelected = row.id;
  const detail = target.querySelector(".hurricane-detail");
  if (detail) {
    const scenarioName = state.data?.hurricane?.scenario?.name || "Hurricane Florence 2018 Scenario";
    detail.innerHTML = `<h4>${cleanText(row.name)}</h4><div class="detail-grid"><span>City, State<br><strong>${cleanText(row.city)}, ${cleanText(row.state)}</strong></span><span>Property type<br><strong>${cleanText(row.type)}</strong></span><span>Estimated value<br><strong>${money(row.estimatedValue)}</strong></span><span>Exposure tier<br><strong>${cleanText(row.exposureTier)}</strong></span><span>Distance to storm path<br><strong>${row.distanceToPathMiles} miles</strong></span><span>Status<br><strong>${cleanText(row.status)}</strong></span><span>Scenario<br><strong>${cleanText(scenarioName)}</strong></span></div>`;
  }
  document.querySelectorAll("[data-hurricane-property]").forEach((node) => {
    node.classList.toggle("selected", node.dataset.hurricaneProperty === row.id);
  });
}

function renderHurricaneMap(data, target) {
  target.innerHTML = "";
  const scenario = data.scenario;
  const circles = coneCircles(scenario);
  const conePath = stormConePath(circles);
  const cur = projectUsPoint(scenario.currentPosition.lat, scenario.currentPosition.lon);
  const pastPts = scenario.pastTrack.map((p) => projectUsPoint(p.lat, p.lon));
  const pastLine = pastPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fcPts = scenario.forecastTrack.map((p) => projectUsPoint(p.lat, p.lon));
  const fcLine = [cur, ...fcPts].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const statePaths = (scenario.statePaths || []).map((row) => `<path class="usa-state" d="${row.path}"><title>${cleanText(row.name)}</title></path>`).join("");

  const summary = el("div", "narrative-box", `${scenario.stormName} exposure scenario. ${scenario.affectedCount} potentially affected properties. Total potentially exposed value is ${money(scenario.totalPotentialExposure)}. Highest exposure state is ${scenario.highestExposureState}. Synthetic exposure demonstration on a real storm track.`);

  const mapWrap = el("div", "hurricane-map-frame");
  mapWrap.innerHTML = `<svg class="weather-map" viewBox="0 0 960 560" role="img" aria-label="Full USA Hurricane Florence 2018 forecast cone and property exposure map">
    <rect class="ocean-bg" x="0" y="0" width="960" height="560"></rect>
    <g class="weather-grid">
      <path d="M54 115 H906 M54 251 H906 M54 387 H906"></path>
      <path d="M164 34 V526 M384 34 V526 M604 34 V526 M824 34 V526"></path>
    </g>
    <g class="state-layer">${statePaths}</g>
    <path class="storm-cone" d="${conePath}"></path>
    <g class="property-layer"></g>
    <g class="city-layer">${nationalCityLabels.map(hurricaneCityLabel).join("")}</g>
    <polyline class="storm-track-past" points="${pastLine}"></polyline>
    <polyline class="storm-track-forecast" points="${fcLine}"></polyline>
    ${scenario.pastTrack.map((p) => {
      const q = projectUsPoint(p.lat, p.lon);
      return `<circle class="storm-past-dot" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="2.4"></circle>`;
    }).join("")}
    ${scenario.forecastTrack.map((p, i) => {
      const q = fcPts[i];
      return `<circle class="forecast-point" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="4.5"></circle><text class="forecast-hour" x="${(q.x + 8).toFixed(1)}" y="${(q.y - 8).toFixed(1)}">${cleanText(p.label)}</text>`;
    }).join("")}
    <g class="storm-eye" transform="translate(${cur.x.toFixed(1)} ${cur.y.toFixed(1)})">
      <circle class="storm-eye-core" r="8"></circle>
      <path class="storm-eye-arm" d="M0 0 C 5 -2 7 -6 4 -9.5"></path>
      <path class="storm-eye-arm" d="M0 0 C -5 2 -7 6 -4 9.5"></path>
      <circle class="storm-eye-center" r="2.2"></circle>
    </g>
    <g class="storm-label"><rect x="28" y="24" width="304" height="52" rx="7"></rect><text class="storm-label-name" x="44" y="48">${cleanText(scenario.stormName)}</text><text x="44" y="66">Advisory ${cleanText(scenario.advisoryDate)}</text></g>
  </svg>`;

  const legend = el("div", "storm-legend");
  legend.innerHTML = `<span><i class="prop"></i>Property</span><span><i class="affected"></i>Within cone</span><span><i class="cone"></i>Forecast cone</span><span><i class="track"></i>Forecast track</span>`;
  const detail = el("div", "record-detail hurricane-detail");
  target.append(summary, mapWrap, legend, detail);

  const layer = mapWrap.querySelector(".property-layer");
  data.properties.forEach((row) => {
    const point = projectUsPoint(row.lat, row.lon);
    const affected = row.exposureTier === "High exposure";
    if (affected) {
      const halo = document.createElementNS(SVGNS, "circle");
      halo.setAttribute("cx", point.x);
      halo.setAttribute("cy", point.y);
      halo.setAttribute("r", 8.5);
      halo.setAttribute("class", "dot-halo");
      layer.appendChild(halo);
    }
    const dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", affected ? 5 : 3.4);
    dot.setAttribute("class", `hurricane-dot${affected ? " affected" : ""}`);
    if (!affected) dot.setAttribute("fill", "#607080");
    dot.dataset.hurricaneProperty = row.id;
    dot.setAttribute("tabindex", "0");
    dot.setAttribute("aria-label", cleanText(`${row.name}, ${row.exposureTier}`));
    dot.addEventListener("click", () => showHurricaneDetail(row, target));
    dot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") showHurricaneDetail(row, target);
    });
    layer.appendChild(dot);
  });

  const first = data.properties.find((row) => row.exposureTier === "High exposure") || data.properties[0];
  if (first) showHurricaneDetail(first, target);
}

function renderHurricaneTable(data, target) {
  target.innerHTML = "";
  const affected = data.properties
    .filter((row) => row.exposureTier === "High exposure")
    .sort((a, b) => b.estimatedValue - a.estimatedValue);
  const summary = el("div", "metric-grid hurricane-summary");
  [
    ["Potentially affected properties", data.scenario.affectedCount],
    ["Total potentially exposed value", money(data.scenario.totalPotentialExposure)],
    ["Highest exposure state", data.scenario.highestExposureState],
    ["Highest value affected property", affected[0]?.name || "None"]
  ].forEach(([label, value]) => {
    const box = el("div", "metric-box");
    box.innerHTML = `<span>${cleanText(label)}</span><strong>${cleanText(value)}</strong>`;
    summary.appendChild(box);
  });
  const wrap = el("div", "table-wrap");
  const table = el("table");
  table.innerHTML = `<thead><tr><th>Property</th><th>City, State</th><th>Property type</th><th>Estimated value</th><th>Exposure status</th><th>Distance to storm path</th></tr></thead>`;
  const body = el("tbody");
  affected.forEach((row) => {
    const tr = el("tr");
    tr.dataset.hurricaneProperty = row.id;
    tr.innerHTML = `<td>${cleanText(row.name)}</td><td>${cleanText(row.city)}, ${cleanText(row.state)}</td><td>${cleanText(row.type)}</td><td>${money(row.estimatedValue)}</td><td><span class="exposure-pill affected">${cleanText(row.exposureTier)}</span></td><td>${row.distanceToPathMiles} miles</td>`;
    tr.addEventListener("click", () => showHurricaneDetail(row, document.getElementById("hurricane-map")));
    body.appendChild(tr);
  });
  table.appendChild(body);
  wrap.appendChild(table);
  target.append(summary, wrap);
}

function renderProviderWorkspace(data, target, expanded = false) {
  const rows = data.workspaceRows;
  target.innerHTML = "";
  const controls = el("div", "control-row");
  const type = makeSelect("Provider type", optionList(rows.map((d) => d.type)), "Oncology");
  const specialty = makeSelect("Specialty", ["All", ...optionList(rows.map((d) => d.specialty))], "All");
  const minimum = makeRange("Minimum members", 0, 200, 20);
  const review = makeSelect("Review providers", ["Off", "On"], "Off");
  controls.append(type.wrap, specialty.wrap, minimum.wrap, review.wrap);

  const narrative = el("div", "narrative-box");
  const snapshot = el("div", "provider-snapshot");
  const tableWrap = el("div", "table-wrap workspace-table-wrap provider-table-wrap");
  target.append(controls, narrative, snapshot, tableWrap);

  const columns = expanded
    ? ["Provider", "Provider type", "Specialty", "Cost per active member month", "Peer median", "Above median amount", "Ratio to peer median", "Review status", "Active members"]
    : ["Provider", "Specialty", "Cost per active member month", "Peer median", "Ratio to peer median", "Review status"];

  function cell(row, name) {
    switch (name) {
      case "Provider": return `<td>${cleanText(row.provider)}</td>`;
      case "Provider type": return `<td>${cleanText(row.type)}</td>`;
      case "Specialty": return `<td>${cleanText(row.specialty)}</td>`;
      case "Cost per active member month": return `<td>${money(row.cost)}</td>`;
      case "Peer median": return `<td>${money(row.peerMedian)}</td>`;
      case "Above median amount": return `<td class="variance-cell">${money(Math.max(0, row.variance))}</td>`;
      case "Ratio to peer median": return `<td class="ratio-cell">${row.ratio.toFixed(1)}x</td>`;
      case "Review status": return `<td><span class="status ${statusKey(row.status)}">${cleanText(row.status)}</span></td>`;
      case "Active members": return `<td>${integer(row.members)}</td>`;
      default: return "<td></td>";
    }
  }

  function update() {
    let current = rows.filter((row) => row.type === type.input.value);
    if (specialty.input.value !== "All") current = current.filter((row) => row.specialty === specialty.input.value);
    current = current.filter((row) => row.members >= Number(minimum.input.value));
    if (review.input.value === "On") current = current.filter((row) => row.status === "Materially above median");
    current = current.sort((a, b) => b.ratio - a.ratio).slice(0, 6);

    narrative.textContent = cleanText(`${current.length} examples shown. Providers materially above the peer median are the clearest outliers for review.`);
    const selected = current[0];
    snapshot.innerHTML = selected ? `
      <div class="snapshot-card featured"><span>Highest risk provider</span><strong>${cleanText(selected.provider)}</strong><small>${cleanText(selected.specialty)}</small></div>
      <div class="snapshot-card"><span>Cost per active member month</span><strong>${money(selected.cost)}</strong><small>Peer median ${money(selected.peerMedian)}</small></div>
      <div class="snapshot-card variance"><span>Above peer median</span><strong>${money(Math.max(0, selected.variance))}</strong><small>${selected.ratio.toFixed(1)}x peer median</small></div>
      <div class="snapshot-card"><span>Review status</span><strong><span class="status ${statusKey(selected.status)}">${cleanText(selected.status)}</span></strong><small>Ranked by ratio to median</small></div>
    ` : "";
    tableWrap.innerHTML = "";
    const table = el("table", "workspace-table provider-workspace-table");
    table.innerHTML = `<thead><tr>${columns.map((c) => `<th>${cleanText(c)}</th>`).join("")}</tr></thead>`;
    const tbody = el("tbody");
    current.forEach((row) => {
      const tr = el("tr", statusKey(row.status));
      tr.innerHTML = columns.map((c) => cell(row, c)).join("");
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  [type.input, specialty.input, review.input].forEach((input) => input.addEventListener("change", update));
  minimum.input.addEventListener("input", update);
  update();
}

function renderAcquisitionReview(data, target) {
  target.innerHTML = "";
  const list = el("div", "review-queue");
  const detail = el("div", "review-adjudication");
  target.append(list, detail);

  function show(row) {
    [...list.querySelectorAll("button")].forEach((button) => {
      button.classList.toggle("selected", button.dataset.product === row.acquired);
    });
    const reviewControl = row.outcome === "Review"
      ? `<label>Review decision<select><option>Approve primary match</option><option>Choose second closest match</option><option>Send for stewardship review</option></select></label>`
      : `<p><strong>Decision:</strong> ${cleanText(row.decision)}</p>`;
    const hasSecond = row.secondBest && row.secondBest !== "No second candidate" && row.secondBest !== "No close second candidate";
    const secondTitle = hasSecond ? row.secondBest : "No close second candidate";
    const secondScore = hasSecond ? row.secondScore : "0.0";
    const secondEvidence = hasSecond ? row.secondEvidence || "Plausible alternate candidate with lower confidence than the primary recommendation" : "No materially distinct candidate was close enough to display.";
    detail.innerHTML = `<div class="selected-product-card"><span>Selected acquired product</span><h4>${cleanText(row.acquired)}</h4><dl><dt>Confidence</dt><dd>${cleanText(row.confidence)}</dd><dt>Method</dt><dd>${cleanText(row.method)}</dd><dt>Decision status</dt><dd>${cleanText(row.decision)}</dd></dl></div>
      <div class="candidate-compare">
        <article><span>Primary recommended match</span><h4>${cleanText(row.recommended)}</h4><strong>${row.score}</strong><p>${cleanText(row.evidence)}</p><small>Primary ID: ${cleanText(row.primaryId || "recommended")}</small></article>
        <article><span>Second closest candidate</span><h4>${cleanText(secondTitle)}</h4><strong>${secondScore}</strong><p>${cleanText(secondEvidence)}</p><small>Second ID: ${cleanText(hasSecond ? row.secondId || "alternate" : "none")}</small></article>
      </div>
      ${reviewControl}`;
  }

  data.review.slice(0, 8).forEach((row, index) => {
    const button = el("button", "record-button", `${row.outcome}: ${row.acquired}`);
    button.type = "button";
    button.dataset.product = row.acquired;
    button.addEventListener("click", () => show(row));
    list.appendChild(button);
    if (index === 0) show(row);
  });
}

function renderContractScenario(data, target) {
  target.innerHTML = "";
  const controls = el("div", "control-row");
  const steer = makeRange("Volume shift percentage", 40, 90, 70);
  const rate = makeRange("Contract percentage", 70, 100, 80);
  controls.append(steer.wrap, rate.wrap);
  const summary = el("div", "contract-scenario-model");
  target.append(controls, summary);

  function update() {
    const steerFactor = Number(steer.input.value) / 70;
    const rateFactor = (100 - Number(rate.input.value)) / 20;
    const baseSavings = Number(data.summary.projected_savings || 0);
    const estimate = baseSavings * steerFactor * rateFactor;
    const projectedSpend = Math.max(0, Number(data.summary.baseline_spend || 0) - estimate);

    summary.innerHTML = `<div class="contract-state current"><span>Current network baseline</span><strong>${money(data.summary.baseline_spend || 0)}</strong><p>Eligible DME service categories priced through current network rates.</p></div>
      <div class="contract-state preferred"><span>Preferred provider scenario</span><strong>${money(projectedSpend)}</strong><p>${steer.input.value} percent expected eligible DME volume moving to the preferred supplier at ${rate.input.value} percent of benchmark.</p></div>
      <div class="contract-impact"><span>Projected savings</span><strong>${money(estimate)}</strong><p>Savings depend on actual volume moving to the preferred DME supplier, not just the 80 percent benchmark rate.</p></div>`;
  }

  [steer.input, rate.input].forEach((input) => input.addEventListener("input", update));
  update();
}

function renderWorldcupEvidence(data, target) {
  target.innerHTML = "";
  target.classList.add("worldcup-evidence-panel");
  const metrics = [
    ["0.77", "relationship with points"],
    ["92%", "strongest-quartile advancement"],
    ["17%", "weakest-quartile advancement"],
    ["528", "players across 48 teams"]
  ];
  const grid = el("div", "worldcup-evidence-grid");
  grid.innerHTML = metrics.map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
  target.appendChild(grid);
  target.appendChild(el("p", "chart-note", "Lineup floor means the bottom three players inside each usage based Core XI. The Core XI was selected retrospectively from group stage starts, minutes, and appearances, so this is group stage analysis rather than a prediction model."));
}

function renderWorldcupComparison(data, target) {
  target.innerHTML = "";
  const rows = data.comparison;
  rows.forEach((row) => {
    const block = el("div", "record-detail worldcup-team-card");
    const note = row.team === "Mexico"
      ? "Looked weaker by headline value and star power, but had the stronger lineup floor and advanced."
      : "Looked stronger by headline value and star power, but had the weaker lineup floor and was eliminated.";
    block.innerHTML = `<h4>${cleanText(row.team)}</h4><p><span class="outcome-pill ${row.advanced ? "advanced" : "eliminated"}">${row.advanced ? "Advanced" : "Eliminated"}</span> ${row.points} points. Goal difference ${signed(row.goalDifference)}. ${cleanText(note)}</p><div class="metric-grid"><div class="metric-box"><span>Total team value</span><strong>${compactMoney(row.totalValue)}</strong><span>Rank ${row.totalRank}</span></div><div class="metric-box"><span>Top three average</span><strong>${compactMoney(row.topThree)}</strong><span>Rank ${row.topThreeRank}</span></div><div class="metric-box"><span>Lineup floor value</span><strong>${compactMoney(row.floor)}</strong><span>Rank ${row.floorRank}</span></div></div>`;
    target.appendChild(block);
  });
  target.appendChild(el("p", "chart-note", "Mexico and Uruguay remain the gateway example: total value and star power pointed one way, while lineup floor better matched the group stage outcome."));
}

function renderExpandedVisual(sourceId, destination) {
  const data = state.data;
  if (!data) return;
  const map = {
    "provider-workspace": () => renderProviderWorkspace(data.provider, destination, true),
    "contract-scenario": () => renderContractScenario(data.preferred, destination),
    "acquisition-review": () => renderAcquisitionReview(data.acquisition, destination),
    "hurricane-map": () => renderHurricaneMap(data.hurricane, destination),
    "worldcup-comparison": () => renderWorldcupComparison(data.worldcup, destination),
    "worldcup-evidence": () => renderWorldcupEvidence(data.worldcup, destination)
  };
  destination.className = document.getElementById(sourceId).className;
  if (map[sourceId]) map[sourceId]();
}

function wireExpanders() {
  const dialog = document.getElementById("expand-dialog");
  const body = document.getElementById("dialog-body");
  const close = document.getElementById("close-dialog");
  close.addEventListener("click", () => dialog.close());
  document.querySelectorAll("[data-expand]").forEach((button) => {
    button.addEventListener("click", () => {
      body.innerHTML = "";
      const expanded = el("div");
      body.appendChild(expanded);
      renderExpandedVisual(button.dataset.expand, expanded);
      document.getElementById("dialog-title").textContent = cleanText(button.closest(".visual-panel").querySelector("h3").textContent);
      dialog.showModal();
    });
  });
}

function wireSectionNavigation() {
  const links = [...document.querySelectorAll("[data-section-link]")];
  function setActive(id) {
    if (!id) return;
    links.forEach((link) => {
      if (link.dataset.sectionLink === id) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }
  const sections = links
    .map((link) => document.getElementById(link.dataset.sectionLink))
    .filter(Boolean);
  let scheduled = false;
  function updateFromPosition() {
    scheduled = false;
    const headerOffset = (document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0) + 12;
    const current = sections
      .map((section) => ({ id: section.id, distance: Math.abs(section.getBoundingClientRect().top - headerOffset) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (current) setActive(current.id);
  }
  function schedulePositionUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateFromPosition);
  }
  if (!("IntersectionObserver" in window)) {
    setActive("projects");
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    setActive(visible.target.id);
  }, { rootMargin: "-25% 0px -55% 0px", threshold: [0.2, 0.45, 0.7] });
  sections.forEach((section) => observer.observe(section));
  window.addEventListener("scroll", schedulePositionUpdate, { passive: true });
  window.addEventListener("resize", schedulePositionUpdate);
  window.addEventListener("hashchange", () => {
    setActive(window.location.hash.replace("#", ""));
    window.setTimeout(schedulePositionUpdate, 120);
  });
  if (window.location.hash) {
    const id = window.location.hash.replace("#", "");
    document.getElementById(id)?.scrollIntoView();
    setActive(id);
    window.setTimeout(schedulePositionUpdate, 120);
  } else {
    setActive("projects");
  }
}

function checkVisibleCopy() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const problems = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.nodeValue.trim();
    const parent = walker.currentNode.parentElement;
    if (!text || !parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) continue;
    if (parent.closest(".worldcup-evidence-grid")) continue;
    if (/[-–—]/.test(text)) problems.push(text);
  }
  if (problems.length) {
    console.error("Visible copy dash check failed", problems);
    document.body.dataset.copyCheck = "failed";
  } else {
    document.body.dataset.copyCheck = "passed";
  }
}

fetch("assets/portfolio-data.json")
  .then((response) => response.json())
  .then((data) => {
    state.data = data;
    renderProviderWorkspace(data.provider, document.getElementById("provider-workspace"));
    renderContractScenario(data.preferred, document.getElementById("contract-scenario"));
    renderAcquisitionReview(data.acquisition, document.getElementById("acquisition-review"));
    renderHurricaneMap(data.hurricane, document.getElementById("hurricane-map"));
    renderHurricaneTable(data.hurricane, document.getElementById("hurricane-table"));
    renderWorldcupComparison(data.worldcup, document.getElementById("worldcup-comparison"));
    renderWorldcupEvidence(data.worldcup, document.getElementById("worldcup-evidence"));
    wireExpanders();
    wireSectionNavigation();
    checkVisibleCopy();
  })
  .catch((error) => {
    console.error("Portfolio data failed to load", error);
  });
