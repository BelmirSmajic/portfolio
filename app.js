const state = {};

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

const exposureColors = {
  High: "#a23b3b",
  Moderate: "#c5792a",
  Watch: "#c3a233",
  Outside: "#73808a"
};

const hurricaneCityLabels = [
  { name: "Tampa", lat: 27.9506, lon: -82.4572 },
  { name: "Gainesville", lat: 29.6516, lon: -82.3248 },
  { name: "Jacksonville", lat: 30.3322, lon: -81.6557 },
  { name: "Savannah", lat: 32.0809, lon: -81.0912 },
  { name: "Charleston", lat: 32.7765, lon: -79.9311 },
  { name: "Raleigh", lat: 35.7796, lon: -78.6382 },
  { name: "Richmond", lat: 37.5407, lon: -77.4360 },
  { name: "Washington", lat: 38.9072, lon: -77.0369 },
  { name: "Philadelphia", lat: 39.9526, lon: -75.1652 }
];

const hurricaneForecastLabels = [
  { day: "Mon AM", wind: "65 mph" },
  { day: "Mon PM", wind: "80 mph" },
  { day: "Tue AM", wind: "55 mph" },
  { day: "Tue PM", wind: "45 mph" },
  { day: "Wed AM", wind: "40 mph" },
  { day: "Wed PM", wind: "35 mph" },
  { day: "Thu AM", wind: "30 mph" },
  { day: "Thu PM", wind: "25 mph" },
  { day: "Fri AM", wind: "20 mph" }
];

function cleanText(value) {
  return String(value ?? "").replace(/[-\u2013\u2014]/g, " ");
}

function money(value) {
  const number = Number(value || 0);
  if (number < 0) return `(${fmtMoney.format(Math.abs(number))})`;
  return fmtMoney.format(number);
}

function compactMoney(value) {
  return fmtCompactMoney.format(Number(value || 0));
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

function titleCase(value) {
  return cleanText(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function projectUsPoint(lat, lon) {
  const x = ((lon + 125) / 59) * 920 + 40;
  const y = ((50 - lat) / 26) * 520 + 30;
  return { x, y };
}

function corridorPolygon(points, factor) {
  const left = [];
  const right = [];
  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const p = projectUsPoint(point.lat, point.lon);
    const a = projectUsPoint(previous.lat, previous.lon);
    const b = projectUsPoint(next.lat, next.lon);
    const dx = b.x - a.x || 1;
    const dy = b.y - a.y || 1;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const width = Math.max(14, point.radius * factor);
    const coastalBias = index < 5 ? 1 : 0.84;
    left.push(`${(p.x + nx * width * coastalBias).toFixed(1)},${(p.y + ny * width).toFixed(1)}`);
    right.unshift(`${(p.x - nx * width * coastalBias).toFixed(1)},${(p.y - ny * width).toFixed(1)}`);
  });
  return left.concat(right).join(" ");
}

function hurricaneForecastLabel(point, index) {
  const projected = projectUsPoint(point.lat, point.lon);
  const label = hurricaneForecastLabels[index] || { day: point.label, wind: "" };
  const dx = index < 3 ? -76 : index < 6 ? 16 : 20;
  const dy = index % 2 === 0 ? -18 : 28;
  return `<g class="forecast-label" transform="translate(${projected.x + dx} ${projected.y + dy})"><rect x="0" y="-16" width="70" height="32" rx="4"></rect><text x="6" y="-3">${cleanText(label.day)}</text><text x="6" y="11">${cleanText(label.wind)}</text></g>`;
}

function hurricaneCityLabel(city) {
  const point = projectUsPoint(city.lat, city.lon);
  return `<g class="city-label" transform="translate(${point.x} ${point.y})"><circle r="2.6"></circle><text x="6" y="-5">${cleanText(city.name)}</text></g>`;
}

function showHurricaneDetail(row, target) {
  state.hurricaneSelected = row.id;
  const detail = target.querySelector(".hurricane-detail");
  if (detail) {
    const scenarioName = state.data?.hurricane?.scenario?.name || "Hurricane Debby 2024 Scenario";
    detail.innerHTML = `<h4>${cleanText(row.name)}</h4><div class="detail-grid"><span>City, State<br><strong>${cleanText(row.city)}, ${cleanText(row.state)}</strong></span><span>Property type<br><strong>${cleanText(row.type)}</strong></span><span>Estimated value<br><strong>${money(row.estimatedValue)}</strong></span><span>Exposure tier<br><strong>${cleanText(row.exposureTier)}</strong></span><span>Distance to storm path<br><strong>${row.distanceToPathMiles} miles</strong></span><span>Status<br><strong>${cleanText(row.status)}</strong></span><span>Scenario<br><strong>${cleanText(scenarioName)}</strong></span></div>`;
  }
  document.querySelectorAll("[data-hurricane-property]").forEach((node) => {
    node.classList.toggle("selected", node.dataset.hurricaneProperty === row.id);
  });
}

function renderHurricaneMap(data, target) {
  target.innerHTML = "";
  const scenario = data.scenario;
  const pathPoints = scenario.stormPath.map((point) => projectUsPoint(point.lat, point.lon));
  const line = pathPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const summary = el("div", "narrative-box", `${scenario.name}. ${scenario.affectedCount} potentially affected properties. Total potentially exposed value is ${money(scenario.totalPotentialExposure)}. Highest exposure state is ${scenario.highestExposureState}. Synthetic exposure demo based on a named storm scenario.`);
  const mapWrap = el("div", "hurricane-map-frame");
  mapWrap.innerHTML = `<svg viewBox="570 165 335 390" role="img" aria-label="Southeast and East Coast hurricane exposure map with state boundaries, forecast cone, storm markers, city labels, and property markers">
    <rect x="560" y="150" width="370" height="430" fill="#dcecf1"></rect>
    <g class="state-layer">
      ${scenario.statePaths.map((statePath) => `<path class="state-boundary" d="${statePath.path}" aria-label="${cleanText(statePath.name)}"></path>`).join("")}
    </g>
    <polygon class="forecast-cone" points="${corridorPolygon(scenario.stormPath, 1.18)}"></polygon>
    <polygon class="storm-band watch-band" points="${corridorPolygon(scenario.stormPath, 0.96)}"></polygon>
    <polygon class="storm-band moderate-band" points="${corridorPolygon(scenario.stormPath, 0.62)}"></polygon>
    <polygon class="storm-band high-band" points="${corridorPolygon(scenario.stormPath, 0.34)}"></polygon>
    <g class="city-layer">${hurricaneCityLabels.map(hurricaneCityLabel).join("")}</g>
    <polyline class="storm-track" points="${line}"></polyline>
    ${scenario.stormPath.map((point, index) => {
      const projected = pathPoints[index];
      return `<g class="storm-marker" transform="translate(${projected.x} ${projected.y})"><circle r="${index < 2 ? 8 : 6}"></circle><path d="M-4 0 C-1 -5 5 -5 6 0 C4 4 -2 5 -5 1"></path></g>`;
    }).join("")}
    ${scenario.stormPath.map(hurricaneForecastLabel).join("")}
    <g class="scenario-label"><rect x="590" y="184" width="202" height="48" rx="6"></rect><text x="604" y="205">${cleanText(scenario.name)}</text><text x="604" y="223">Synthetic executive exposure view</text></g>
    <g class="property-layer"></g>
  </svg>`;
  const legend = el("div", "exposure-legend");
  Object.entries(exposureColors).forEach(([tier, color]) => {
    const item = el("span");
    const definition = scenario.tierDefinitions.find((row) => row.tier === tier);
    item.innerHTML = `<i style="background:${color}"></i><strong>${cleanText(tier)}</strong> ${cleanText(definition?.description || "")}`;
    legend.appendChild(item);
  });
  const detail = el("div", "record-detail hurricane-detail");
  target.append(summary, mapWrap, legend, detail);

  const layer = mapWrap.querySelector(".property-layer");
  data.properties.forEach((row) => {
    const point = projectUsPoint(row.lat, row.lon);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", row.exposureTier === "Outside" ? 5 : 7);
    dot.setAttribute("fill", exposureColors[row.exposureTier]);
    dot.setAttribute("class", "hurricane-dot");
    dot.dataset.hurricaneProperty = row.id;
    dot.setAttribute("tabindex", "0");
    dot.setAttribute("aria-label", cleanText(`${row.name}, ${row.exposureTier}`));
    dot.addEventListener("click", () => showHurricaneDetail(row, target));
    dot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") showHurricaneDetail(row, target);
    });
    layer.appendChild(dot);
  });
  const first = data.properties.find((row) => row.exposureTier === "High") || data.properties[0];
  if (first) showHurricaneDetail(first, target);
}

function renderHurricaneTable(data, target) {
  target.innerHTML = "";
  const summary = el("div", "metric-grid hurricane-summary");
  const affected = data.properties
    .filter((row) => ["High", "Moderate"].includes(row.exposureTier))
    .sort((a, b) => b.estimatedValue - a.estimatedValue);
  [
    ["Potentially affected properties", data.scenario.affectedCount],
    ["Total potentially exposed value", money(data.scenario.totalPotentialExposure)],
    ["Highest exposure state", data.scenario.highestExposureState],
    ["Highest value affected property", affected[0]?.name || "None"],
    ["Storm scenario name", data.scenario.name]
  ].forEach(([label, value]) => {
    const box = el("div", "metric-box");
    box.innerHTML = `<span>${cleanText(label)}</span><strong>${cleanText(value)}</strong>`;
    summary.appendChild(box);
  });
  const wrap = el("div", "table-wrap");
  const table = el("table");
  table.innerHTML = `<thead><tr><th>Property</th><th>City, State</th><th>Property type</th><th>Estimated value</th><th>Exposure tier</th><th>Distance to storm path</th><th>Status</th></tr></thead>`;
  const body = el("tbody");
  affected
    .forEach((row) => {
      const tr = el("tr");
      tr.dataset.hurricaneProperty = row.id;
      tr.innerHTML = `<td>${cleanText(row.name)}</td><td>${cleanText(row.city)}, ${cleanText(row.state)}</td><td>${cleanText(row.type)}</td><td>${money(row.estimatedValue)}</td><td><span class="exposure-pill ${row.exposureTier.toLowerCase()}">${cleanText(row.exposureTier)}</span></td><td>${row.distanceToPathMiles} miles</td><td>${cleanText(row.status)}</td>`;
      tr.addEventListener("click", () => showHurricaneDetail(row, document.getElementById("hurricane-map")));
      body.appendChild(tr);
    });
  table.appendChild(body);
  wrap.appendChild(table);
  target.append(summary, wrap);
}

function renderProviderWorkspace(data, target) {
  const rows = data.workspaceRows;
  target.innerHTML = "";
  const controls = el("div", "control-row");
  const type = makeSelect("Provider type", optionList(rows.map((d) => d.type)), "Oncology");
  const specialty = makeSelect("Specialty", ["All", ...optionList(rows.map((d) => d.specialty))], "All");
  const minimum = makeRange("Minimum members", 0, 200, 20);
  const review = makeSelect("Review providers", ["Off", "On"], "Off");
  controls.append(type.wrap, specialty.wrap, minimum.wrap, review.wrap);

  const narrative = el("div", "narrative-box");
  const tableWrap = el("div", "table-wrap");
  target.append(controls, narrative, tableWrap);

  function update() {
    let current = rows.filter((row) => row.type === type.input.value);
    if (specialty.input.value !== "All") current = current.filter((row) => row.specialty === specialty.input.value);
    current = current.filter((row) => row.members >= Number(minimum.input.value));
    if (review.input.value === "On") current = current.filter((row) => row.status === "Materially above median");
    current = current.sort((a, b) => b.ratio - a.ratio).slice(0, 6);

    narrative.textContent = cleanText(`${current.length} examples shown. Providers materially above the peer median are the clearest outliers for review.`);
    tableWrap.innerHTML = "";
    const table = el("table");
    table.innerHTML = `<thead><tr><th>Provider</th><th>Specialty</th><th>Cost per active member month</th><th>Peer median</th><th>Amount above or below median</th><th>Ratio to peer median</th><th>Review status</th></tr></thead>`;
    const body = el("tbody");
    current.forEach((row) => {
      const tr = el("tr", statusKey(row.status));
      tr.innerHTML = `<td>${cleanText(row.provider)}</td><td>${cleanText(row.specialty)}</td><td>${money(row.cost)}</td><td>${money(row.peerMedian)}</td><td>${money(row.variance)}</td><td>${row.ratio.toFixed(2)}</td><td><span class="status ${statusKey(row.status)}">${cleanText(row.status)}</span></td>`;
      body.appendChild(tr);
    });
    table.appendChild(body);
    tableWrap.appendChild(table);
  }

  [type.input, specialty.input, review.input].forEach((input) => input.addEventListener("change", update));
  minimum.input.addEventListener("input", update);
  update();
}

function renderProviderComparison(data, target) {
  target.innerHTML = "";
  const rows = data.workspaceRows
    .filter((row) => row.type === "Oncology" && row.members >= 20)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 6);
  const max = Math.max(...rows.map((row) => row.cost)) || 1;
  rows.forEach((row) => {
    const line = el("div", `comparison-row ${statusKey(row.status)}`);
    line.innerHTML = `<div><strong>${cleanText(row.provider)}</strong><span>${cleanText(row.specialty)}</span></div><div class="comparison-track"><span class="median-marker" style="left:${Math.min(100, (row.peerMedian / max) * 100)}%"></span><span class="comparison-fill" style="width:${Math.min(100, (row.cost / max) * 100)}%"></span></div><div>${row.ratio.toFixed(2)} times median</div>`;
    target.appendChild(line);
  });
  target.appendChild(el("p", "chart-note", "Vertical markers show the peer median. Longer bars show provider cost per active member month."));
}

function renderAcquisitionFunnel(data, target) {
  target.innerHTML = "";
  const auto = data.funnel.find((row) => row.label === "Auto match")?.count || 0;
  const suggested = data.funnel.find((row) => row.label === "Suggested match")?.count || 0;
  const review = data.funnel.find((row) => row.label === "Review required")?.count || 0;
  const noMatch = data.funnel.find((row) => row.label === "No confident match")?.count || 0;
  [
    ["Acquired catalog", "1.4 million acquired products", "Compared with 4 million existing products"],
    ["Normalized records", "Descriptions, brands, packs, units", "Prepared for matching"],
    ["Exact matches", fmtNum.format(auto), "Safe deterministic outcomes"],
    ["High confidence fuzzy matches", fmtNum.format(suggested), "Candidate ranking for strong text matches"],
    ["Manual review queue", fmtNum.format(review), "Ranked candidates for stewardship"],
    ["Unmatched or excluded records", fmtNum.format(noMatch), "New product or no viable candidate"],
    ["Approved matches", "Reviewer output", "Browser and Excel decisions"]
  ].forEach(([label, value, note], index) => {
    const stage = el("div", "pipeline-stage");
    stage.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${cleanText(label)}</strong><b>${cleanText(value)}</b><small>${cleanText(note)}</small>`;
    target.appendChild(stage);
  });
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
    detail.innerHTML = `<div class="selected-product-card"><span>Selected acquired product</span><h4>${cleanText(row.acquired)}</h4><dl><dt>Confidence</dt><dd>${cleanText(row.confidence)}</dd><dt>Method</dt><dd>${cleanText(row.method)}</dd><dt>Decision status</dt><dd>${cleanText(row.decision)}</dd></dl></div>
      <div class="candidate-compare">
        <article><span>Primary recommended match</span><h4>${cleanText(row.recommended)}</h4><strong>${row.score}</strong><p>${cleanText(row.evidence)}</p></article>
        <article><span>Second closest match</span><h4>${cleanText(row.secondBest)}</h4><strong>${row.secondScore}</strong><p>Compare score, description, pack size, brand and evidence before approval.</p></article>
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
    const topRows = data.scenario.slice(0, 4);
    summary.innerHTML = `<div class="contract-state current"><span>Current network baseline</span><strong>${money(data.summary.baseline_spend || 0)}</strong><p>Eligible DME service categories priced through current network rates.</p></div>
      <div class="contract-state preferred"><span>Preferred provider scenario</span><strong>${money(projectedSpend)}</strong><p>${steer.input.value} percent expected volume shift at ${rate.input.value} percent of benchmark.</p></div>
      <div class="contract-impact"><span>Projected savings</span><strong>${money(estimate)}</strong><p>Decision signal: continue contracting review if access, capacity and service scope remain acceptable.</p></div>
      <div class="service-group-grid">${topRows.map((row) => `<div><span>${cleanText(row.code)} ${cleanText(row.category)}</span><strong>${money(row.projectedSavings * steerFactor * rateFactor)}</strong><small>${cleanText(row.description)}</small></div>`).join("")}</div>`;
  }

  [steer.input, rate.input].forEach((input) => input.addEventListener("input", update));
  update();
}

function renderContractBridge(data, target) {
  target.innerHTML = "";
  const lookup = Object.fromEntries(data.bridge.map((row) => [row.label, row.value]));
  const steps = [
    { label: "Projected", value: lookup.projected_savings, endpoint: true },
    { label: "Rate variance", value: (lookup.preferred_rate_savings_effect || 0) + (lookup.residual_rate_savings_effect || 0) },
    { label: "Utilization", value: lookup.utilization_forecast_error || 0 },
    { label: "Volume shift", value: lookup.missed_steerage_savings_effect || 0 },
    { label: "Service mix", value: lookup.service_mix_forecast_error || 0 },
    { label: "Leakage", value: lookup.residual_rate_savings_effect || 0 },
    { label: "Validated savings", value: lookup.actual_savings, endpoint: true }
  ];
  let running = steps[0].value;
  const display = steps.map((step, index) => {
    if (index === 0 || step.endpoint) return { ...step, start: 0, end: step.value, shown: step.value };
    const start = running;
    running += step.value;
    return { ...step, start, end: running, shown: step.value };
  });
  const max = Math.max(...display.flatMap((step) => [step.start, step.end, 0]), 1);
  const waterfall = el("div", "waterfall");
  waterfall.innerHTML = display.map((step) => {
    const left = Math.min(step.start, step.end) / max * 100;
    const width = Math.max(2, Math.abs(step.end - step.start) / max * 100);
    const cls = step.endpoint ? "endpoint" : step.shown < 0 ? "unfavorable" : "favorable";
    const value = step.endpoint ? money(step.end) : `${step.shown < 0 ? "minus " : "plus "}${money(Math.abs(step.shown))}`;
    return `<div class="waterfall-row"><span>${cleanText(step.label)}</span><div class="waterfall-track"><div class="waterfall-bar ${cls}" style="--left:${left}%;--width:${width}%"></div></div><strong>${cleanText(value)}</strong></div>`;
  }).join("");
  target.appendChild(waterfall);
}

function renderWorldcupRankGap(data, target) {
  target.innerHTML = "";
  const table = el("table");
  table.innerHTML = `<thead><tr><th>Team</th><th>Total value rank</th><th>Top three rank</th><th>Lineup floor rank</th><th>Rank gap</th><th>Points</th><th>Outcome</th></tr></thead>`;
  const body = el("tbody");
  data.rankGaps.forEach((row) => {
    const tr = el("tr");
    tr.innerHTML = `<td>${cleanText(row.team)}</td><td>${row.totalRank}</td><td>${row.topThreeRank}</td><td>${row.floorRank}</td><td>${signed(row.rankGap)}</td><td>${row.points}</td><td><span class="outcome-pill ${row.advanced ? "advanced" : "eliminated"}">${row.advanced ? "Advanced" : "Eliminated"}</span></td>`;
    body.appendChild(tr);
  });
  table.appendChild(body);
  target.classList.add("rank-gap-table");
  target.appendChild(table);
  target.appendChild(el("p", "chart-note", "Positive gaps mean lineup floor ranked stronger than total team value. Negative gaps mean headline value ranked stronger than lineup floor."));
}

function renderWorldcupComparison(data, target) {
  target.innerHTML = "";
  const rows = data.comparison;
  rows.forEach((row) => {
    const block = el("div", "record-detail");
    block.innerHTML = `<h4>${cleanText(row.team)}</h4><p><span class="outcome-pill ${row.advanced ? "advanced" : "eliminated"}">${row.advanced ? "Advanced" : "Eliminated"}</span> ${row.points} points. Goal difference ${signed(row.goalDifference)}.</p><div class="metric-grid"><div class="metric-box"><span>Total team value</span><strong>${compactMoney(row.totalValue)}</strong><span>Rank ${row.totalRank}</span></div><div class="metric-box"><span>Top three average</span><strong>${compactMoney(row.topThree)}</strong><span>Rank ${row.topThreeRank}</span></div><div class="metric-box"><span>Lineup floor value</span><strong>${compactMoney(row.floor)}</strong><span>Rank ${row.floorRank}</span></div></div>`;
    target.appendChild(block);
  });
  target.appendChild(el("p", "chart-note", "Mexico had weaker headline value ranks but a stronger lineup floor rank and advanced as group winner. Uruguay had stronger headline value ranks, a weaker lineup floor rank, and was eliminated."));
}

function renderExpandedVisual(sourceId, destination) {
  const data = state.data;
  if (!data) return;
  const map = {
    "provider-workspace": () => renderProviderWorkspace(data.provider, destination),
    "provider-comparison": () => renderProviderComparison(data.provider, destination),
    "contract-scenario": () => renderContractScenario(data.preferred, destination),
    "contract-bridge": () => renderContractBridge(data.preferred, destination),
    "acquisition-funnel": () => renderAcquisitionFunnel(data.acquisition, destination),
    "acquisition-review": () => renderAcquisitionReview(data.acquisition, destination),
    "hurricane-map": () => renderHurricaneMap(data.hurricane, destination),
    "hurricane-table": () => renderHurricaneTable(data.hurricane, destination),
    "worldcup-comparison": () => renderWorldcupComparison(data.worldcup, destination),
    "worldcup-rank-gap": () => renderWorldcupRankGap(data.worldcup, destination)
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
  const jump = document.getElementById("section-jump");
  function setActive(id) {
    if (!id) return;
    links.forEach((link) => {
      if (link.dataset.sectionLink === id) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (jump) {
      const value = `#${id}`;
      if ([...jump.options].some((option) => option.value === value)) jump.value = value;
    }
  }
  if (jump) {
    jump.addEventListener("change", () => {
      window.location.hash = jump.value;
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
  if (!("IntersectionObserver" in window)) return;
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
    if (/[-\u2013\u2014]/.test(text)) problems.push(text);
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
    renderProviderComparison(data.provider, document.getElementById("provider-comparison"));
    renderContractScenario(data.preferred, document.getElementById("contract-scenario"));
    renderContractBridge(data.preferred, document.getElementById("contract-bridge"));
    renderAcquisitionFunnel(data.acquisition, document.getElementById("acquisition-funnel"));
    renderAcquisitionReview(data.acquisition, document.getElementById("acquisition-review"));
    renderHurricaneMap(data.hurricane, document.getElementById("hurricane-map"));
    renderHurricaneTable(data.hurricane, document.getElementById("hurricane-table"));
    renderWorldcupComparison(data.worldcup, document.getElementById("worldcup-comparison"));
    renderWorldcupRankGap(data.worldcup, document.getElementById("worldcup-rank-gap"));
    wireExpanders();
    wireSectionNavigation();
    checkVisibleCopy();
  })
  .catch((error) => {
    console.error("Portfolio data failed to load", error);
  });
