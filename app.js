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

function showHurricaneDetail(row, target) {
  state.hurricaneSelected = row.id;
  const detail = target.querySelector(".hurricane-detail");
  if (detail) {
    detail.innerHTML = `<h4>${cleanText(row.name)}</h4><div class="detail-grid"><span>City, State<br><strong>${cleanText(row.city)}, ${cleanText(row.state)}</strong></span><span>Property type<br><strong>${cleanText(row.type)}</strong></span><span>Estimated value<br><strong>${money(row.estimatedValue)}</strong></span><span>Exposure tier<br><strong>${cleanText(row.exposureTier)}</strong></span><span>Distance to storm path<br><strong>${row.distanceToPathMiles} miles</strong></span><span>Status<br><strong>${cleanText(row.status)}</strong></span></div>`;
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
  const coneLeft = scenario.stormPath.map((point) => {
    const p = projectUsPoint(point.lat, point.lon);
    return `${p.x - point.radius * 0.72},${p.y + point.radius * 0.28}`;
  });
  const coneRight = [...scenario.stormPath].reverse().map((point) => {
    const p = projectUsPoint(point.lat, point.lon);
    return `${p.x + point.radius * 0.54},${p.y - point.radius * 0.2}`;
  });
  const summary = el("div", "narrative-box", `${scenario.affectedCount} potentially affected properties. Total potentially exposed value is ${money(scenario.totalPotentialExposure)}. Highest exposure state is ${scenario.highestExposureState}.`);
  const mapWrap = el("div", "hurricane-map-frame");
  mapWrap.innerHTML = `<svg viewBox="0 0 1000 600" role="img" aria-label="USA map with hurricane exposure markers">
    <rect x="0" y="0" width="1000" height="600" fill="#fbfcfb"></rect>
    <path d="M99 151 L164 95 L286 77 L396 91 L516 84 L668 114 L780 168 L884 246 L898 321 L848 396 L734 453 L573 493 L408 472 L276 512 L162 478 L107 386 L83 276 Z" fill="#eef3f0" stroke="#c9d2ce" stroke-width="2"></path>
    <path d="M730 458 C788 468 842 497 867 541 C795 554 737 539 700 498 Z" fill="#eef3f0" stroke="#c9d2ce" stroke-width="2"></path>
    <path d="M708 150 C752 222 795 291 841 382" fill="none" stroke="#d8dedb" stroke-width="2"></path>
    <path d="M584 101 C593 191 590 286 573 493" fill="none" stroke="#d8dedb" stroke-width="2"></path>
    <path d="M387 91 C394 183 392 299 408 472" fill="none" stroke="#d8dedb" stroke-width="2"></path>
    <path d="M196 112 C223 224 224 350 162 478" fill="none" stroke="#d8dedb" stroke-width="2"></path>
    <polygon points="${coneLeft.concat(coneRight).join(" ")}" fill="#dfeaf0" opacity="0.78" stroke="#95afbc" stroke-width="2"></polygon>
    <polyline points="${line}" fill="none" stroke="#1f5f7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <text x="78" y="72" fill="#667078" font-size="18">USA portfolio view</text>
    <text x="650" y="90" fill="#1f5f7a" font-size="16">${cleanText(scenario.name)}</text>
    <g class="property-layer"></g>
  </svg>`;
  const legend = el("div", "exposure-legend");
  Object.entries(exposureColors).forEach(([tier, color]) => {
    const item = el("span");
    item.innerHTML = `<i style="background:${color}"></i>${cleanText(tier)}`;
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
  [
    ["Potentially affected properties", data.scenario.affectedCount],
    ["Total potentially exposed value", money(data.scenario.totalPotentialExposure)],
    ["Highest exposure state", data.scenario.highestExposureState],
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
  data.properties
    .filter((row) => ["High", "Moderate"].includes(row.exposureTier))
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
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
  const max = Math.max(...data.funnel.map((d) => d.count)) || 1;
  data.funnel.forEach((row) => {
    const line = el("div", "bar-row");
    line.innerHTML = `<span>${cleanText(row.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${(row.count / max) * 100}%"></span></span><strong>${fmtNum.format(row.count)}</strong>`;
    target.appendChild(line);
  });
}

function renderAcquisitionReview(data, target) {
  target.innerHTML = "";
  const list = el("div", "record-list");
  const detail = el("div", "record-detail");
  target.append(list, detail);

  function show(row) {
    const reviewControl = row.outcome === "Review"
      ? `<label>Review decision<select><option>Approve primary match</option><option>Choose second closest match</option><option>Send for stewardship review</option></select></label>`
      : `<p><strong>Decision:</strong> ${cleanText(row.decision)}</p>`;
    detail.innerHTML = `<h4>${cleanText(row.acquired)}</h4><p><strong>Primary recommended match:</strong> ${cleanText(row.recommended)}</p><p><strong>Primary confidence score:</strong> ${row.score}</p><p><strong>Second closest match:</strong> ${cleanText(row.secondBest)}</p><p><strong>Second closest score:</strong> ${row.secondScore}</p><p><strong>Evidence:</strong> ${cleanText(row.evidence)}</p><p><strong>Method:</strong> ${cleanText(row.method)}</p>${reviewControl}`;
  }

  data.review.slice(0, 8).forEach((row, index) => {
    const button = el("button", "record-button", `${row.outcome}: ${row.acquired}`);
    button.type = "button";
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
  const summary = el("div", "narrative-box");
  const bars = el("div");
  target.append(controls, summary, bars);

  function update() {
    const steerFactor = Number(steer.input.value) / 70;
    const rateFactor = (100 - Number(rate.input.value)) / 20;
    const baseSavings = Number(data.summary.projected_savings || 0);
    const estimate = baseSavings * steerFactor * rateFactor;
    summary.textContent = cleanText(`Estimated projected savings are ${money(estimate)} for this specific DME provider arrangement at ${steer.input.value} percent volume shift and ${rate.input.value} percent of benchmark.`);
    bars.innerHTML = "";
    data.scenario.slice(0, 8).forEach((row) => {
      const adjusted = row.projectedSavings * steerFactor * rateFactor;
      const line = el("div", "bar-row");
      line.innerHTML = `<span>${cleanText(row.code)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(4, Math.min(100, adjusted / 50000))}%"></span></span><strong>${money(adjusted)}</strong>`;
      bars.appendChild(line);
    });
  }

  [steer.input, rate.input].forEach((input) => input.addEventListener("input", update));
  update();
}

function renderContractBridge(data, target) {
  target.innerHTML = "";
  const rows = data.bridge;
  const max = Math.max(...rows.map((d) => Math.abs(d.value))) || 1;
  rows.forEach((row) => {
    const line = el("div", "bar-row");
    const color = row.value >= 0 ? "#2d6b57" : "#a23b3b";
    line.innerHTML = `<span>${cleanText(titleCase(row.label))}</span><span class="bar-track"><span class="bar-fill" style="width:${(Math.abs(row.value) / max) * 100}%;background:${color}"></span></span><strong>${money(row.value)}</strong>`;
    target.appendChild(line);
  });
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
