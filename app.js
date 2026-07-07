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
  { name: "Tampa", lat: 27.9506, lon: -82.4572, dx: -62, dy: 16 },
  { name: "Tallahassee", lat: 30.4383, lon: -84.2807, dx: -120, dy: 62 },
  { name: "Gainesville", lat: 29.6516, lon: -82.3248, dx: -76, dy: 20 },
  { name: "Jacksonville", lat: 30.3322, lon: -81.6557, dx: 10, dy: -10 },
  { name: "Savannah", lat: 32.0809, lon: -81.0912, dx: -92, dy: -12 },
  { name: "Charleston", lat: 32.7765, lon: -79.9311, dx: 12, dy: 4 },
  { name: "Wilmington", lat: 34.2104, lon: -77.8868, dx: 12, dy: -24 },
  { name: "Raleigh", lat: 35.7796, lon: -78.6382, dx: -74, dy: -16 },
  { name: "Norfolk", lat: 36.8508, lon: -76.2859, dx: 12, dy: 14 },
  { name: "Richmond", lat: 37.5407, lon: -77.4360, dx: -72, dy: -10 },
  { name: "Washington", lat: 38.9072, lon: -77.0369, dx: -96, dy: -8 },
  { name: "Philadelphia", lat: 39.9526, lon: -75.1652, dx: 12, dy: 32 },
  { name: "New York", lat: 40.7128, lon: -74.0060, dx: 14, dy: 18 }
];

const hurricaneForecastLabels = [
  { day: "Mon 8 AM", wind: "65 mph", dx: -116, dy: 26 },
  { day: "Mon 8 PM", wind: "80 mph", dx: -142, dy: -82 },
  { day: "Tue 8 AM", wind: "55 mph", dx: -124, dy: 16 },
  { day: "Tue 8 PM", wind: "45 mph", dx: 34, dy: 42 },
  { day: "Wed 8 AM", wind: "40 mph", dx: 42, dy: -58 },
  { day: "Wed 8 PM", wind: "35 mph", dx: 56, dy: 10 },
  { day: "Thu 8 AM", wind: "30 mph", dx: 42, dy: -48 },
  { day: "Thu 8 PM", wind: "25 mph", dx: 42, dy: -20 },
  { day: "Fri 8 AM", wind: "20 mph", dx: -116, dy: -36 }
];

const hurricaneMapBounds = {
  lonMin: -86.8,
  lonMax: -70.2,
  latMin: 24.7,
  latMax: 42.8,
  width: 960,
  height: 560,
  padX: 54,
  padY: 34
};

const hurricaneConeWidths = [64, 78, 96, 114, 132, 146, 170, 194, 212];

const hurricaneLandShape = [
  [42.8, -88.4], [30.45, -88.4], [30.25, -85.2], [29.95, -84.2],
  [29.45, -83.2], [28.45, -82.65], [27.45, -82.45], [26.2, -82.1],
  [25.25, -81.1], [25.1, -80.25], [26.1, -80.05], [27.35, -80.25],
  [28.7, -80.65], [30.15, -81.25], [31.0, -81.05], [31.8, -81.2],
  [32.25, -80.85], [32.75, -79.95], [33.25, -79.3], [33.85, -78.65],
  [34.55, -77.85], [35.25, -77.15], [36.05, -76.05], [36.85, -75.7],
  [37.75, -75.45], [38.65, -75.05], [39.45, -74.65], [40.15, -74.05],
  [40.7, -73.7], [41.15, -72.75], [41.65, -71.6], [42.35, -70.45],
  [42.8, -70.2]
];

const hurricaneCoastline = hurricaneLandShape.slice(2, -1);

const hurricaneStateBoundaryLines = [
  [[30.72, -85.0], [30.72, -82.1], [30.7, -81.45]],
  [[31.0, -85.0], [32.0, -85.05], [33.0, -85.05], [34.1, -85.05]],
  [[35.0, -85.0], [35.0, -83.0], [35.05, -81.05], [34.6, -79.7], [33.85, -78.65]],
  [[32.05, -81.1], [32.5, -81.05], [33.0, -80.45], [33.6, -79.9]],
  [[35.0, -81.0], [35.3, -80.0], [35.7, -78.9], [36.05, -76.05]],
  [[36.55, -83.7], [36.55, -81.8], [36.55, -79.2], [36.55, -75.9]],
  [[37.9, -79.4], [37.6, -78.3], [37.25, -77.2], [37.05, -76.1]],
  [[39.72, -79.5], [39.72, -77.9], [39.35, -76.8], [38.65, -75.05]],
  [[40.1, -80.5], [40.25, -78.8], [40.4, -76.6], [40.15, -74.05]]
];

const hurricaneStateLabels = [
  { code: "FL", lat: 28.3, lon: -82.9 },
  { code: "GA", lat: 32.7, lon: -83.6 },
  { code: "SC", lat: 33.8, lon: -80.7 },
  { code: "NC", lat: 35.6, lon: -79.7 },
  { code: "VA", lat: 37.5, lon: -78.6 },
  { code: "MD", lat: 39.0, lon: -76.8 },
  { code: "PA", lat: 40.55, lon: -77.9 },
  { code: "NJ", lat: 40.05, lon: -74.65 }
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

function projectHurricanePoint(lat, lon) {
  const bounds = hurricaneMapBounds;
  const usableWidth = bounds.width - bounds.padX * 2;
  const usableHeight = bounds.height - bounds.padY * 2;
  const x = bounds.padX + ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * usableWidth;
  const y = bounds.padY + ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * usableHeight;
  return { x, y };
}

function hurricanePointString(point) {
  const projected = Array.isArray(point) ? projectHurricanePoint(point[0], point[1]) : projectHurricanePoint(point.lat, point.lon);
  return `${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
}

function hurricanePolyline(points) {
  return points.map(hurricanePointString).join(" ");
}

function hurricanePolygonPath(points) {
  return `M ${hurricanePolyline(points)} Z`;
}

function forecastConePath(points, scale = 1) {
  const left = [];
  const right = [];
  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const p = projectHurricanePoint(point.lat, point.lon);
    const a = projectHurricanePoint(previous.lat, previous.lon);
    const b = projectHurricanePoint(next.lat, next.lon);
    const dx = b.x - a.x || 1;
    const dy = b.y - a.y || 1;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const width = hurricaneConeWidths[index] * scale;
    left.push(`${(p.x + nx * width).toFixed(1)},${(p.y + ny * width).toFixed(1)}`);
    right.unshift(`${(p.x - nx * width).toFixed(1)},${(p.y - ny * width).toFixed(1)}`);
  });
  return `M ${left.concat(right).join(" L ")} Z`;
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
  const projected = projectHurricanePoint(point.lat, point.lon);
  const label = hurricaneForecastLabels[index] || { day: point.label, wind: "", dx: 16, dy: 16 };
  const x = projected.x + label.dx;
  const y = projected.y + label.dy;
  const anchorX = x + (label.dx < 0 ? 88 : 0);
  return `<g class="forecast-label"><path class="forecast-callout" d="M${projected.x.toFixed(1)} ${projected.y.toFixed(1)} L${anchorX.toFixed(1)} ${(y + 18).toFixed(1)}"></path><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="88" height="38" rx="5"></rect><text x="${(x + 8).toFixed(1)}" y="${(y + 15).toFixed(1)}">${cleanText(label.day)}</text><text x="${(x + 8).toFixed(1)}" y="${(y + 30).toFixed(1)}">${cleanText(label.wind)}</text></g>`;
}

function hurricaneCityLabel(city) {
  const point = projectHurricanePoint(city.lat, city.lon);
  return `<g class="city-label"><circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.8"></circle><text x="${(point.x + city.dx).toFixed(1)}" y="${(point.y + city.dy).toFixed(1)}">${cleanText(city.name)}</text></g>`;
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
  const pathPoints = scenario.stormPath.map((point) => projectHurricanePoint(point.lat, point.lon));
  const line = pathPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const summary = el("div", "narrative-box", `${scenario.name}. ${scenario.affectedCount} potentially affected properties. Total potentially exposed value is ${money(scenario.totalPotentialExposure)}. Highest exposure state is ${scenario.highestExposureState}. Synthetic exposure demo based on a named storm scenario.`);
  const mapWrap = el("div", "hurricane-map-frame");
  mapWrap.innerHTML = `<svg class="weather-map" viewBox="0 0 960 560" role="img" aria-label="Broadcast style Southeast and East Coast hurricane forecast and property exposure map">
    <defs>
      <linearGradient id="oceanGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#b8ddea"></stop>
        <stop offset="58%" stop-color="#7fb8cc"></stop>
        <stop offset="100%" stop-color="#4f91ad"></stop>
      </linearGradient>
      <linearGradient id="landGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e4e0d1"></stop>
        <stop offset="100%" stop-color="#c9d3be"></stop>
      </linearGradient>
      <filter id="mapSoftShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#163444" flood-opacity="0.22"></feDropShadow>
      </filter>
    </defs>
    <rect class="ocean-bg" x="0" y="0" width="960" height="560"></rect>
    <g class="weather-grid">
      <path d="M54 115 H906 M54 251 H906 M54 387 H906"></path>
      <path d="M164 34 V526 M384 34 V526 M604 34 V526 M824 34 V526"></path>
    </g>
    <path class="regional-land" d="${hurricanePolygonPath(hurricaneLandShape)}"></path>
    <path class="coastline" d="M ${hurricanePolyline(hurricaneCoastline)}"></path>
    <g class="state-layer">
      ${hurricaneStateBoundaryLines.map((linePoints) => `<polyline class="state-boundary" points="${hurricanePolyline(linePoints)}"></polyline>`).join("")}
    </g>
    <g class="state-label-layer">
      ${hurricaneStateLabels.map((label) => {
        const p = projectHurricanePoint(label.lat, label.lon);
        return `<text class="state-label" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}">${cleanText(label.code)}</text>`;
      }).join("")}
    </g>
    <path class="forecast-cone" d="${forecastConePath(scenario.stormPath)}"></path>
    <g class="property-layer"></g>
    <g class="city-layer">${hurricaneCityLabels.map(hurricaneCityLabel).join("")}</g>
    <polyline class="storm-track" points="${line}"></polyline>
    ${scenario.stormPath.map((point, index) => {
      const projected = pathPoints[index];
      return `<g class="storm-marker" transform="translate(${projected.x.toFixed(1)} ${projected.y.toFixed(1)})"><circle r="${index < 2 ? 10 : 8}"></circle><path d="M-5 0 C-2 -6 6 -6 7 0 C5 5 -3 6 -6 1"></path></g>`;
    }).join("")}
    ${scenario.stormPath.map(hurricaneForecastLabel).join("")}
    <g class="scenario-label"><rect x="28" y="24" width="292" height="62" rx="7"></rect><text x="44" y="48">${cleanText(scenario.name)}</text><text x="44" y="68">Executive exposure monitoring view</text></g>
    <g class="map-legend"><rect x="724" y="386" width="206" height="136" rx="7"></rect><text x="740" y="412">Exposure legend</text><g transform="translate(742 432)"></g></g>
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
  const insetLegend = mapWrap.querySelector(".map-legend g");
  Object.entries(exposureColors).forEach(([tier, color], index) => {
    const y = index * 22;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.innerHTML = `<circle cx="0" cy="${y}" r="6" fill="${color}"></circle><text x="14" y="${y + 4}">${cleanText(tier)}</text>`;
    insetLegend.appendChild(group);
  });
  data.properties.forEach((row) => {
    if (row.lon < hurricaneMapBounds.lonMin || row.lon > hurricaneMapBounds.lonMax || row.lat < hurricaneMapBounds.latMin || row.lat > hurricaneMapBounds.latMax) return;
    const point = projectHurricanePoint(row.lat, row.lon);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", row.exposureTier === "Outside" ? 4.5 : row.exposureTier === "High" ? 8 : 6.5);
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
