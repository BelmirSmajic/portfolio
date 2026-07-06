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
    renderWorldcupComparison(data.worldcup, document.getElementById("worldcup-comparison"));
    renderWorldcupRankGap(data.worldcup, document.getElementById("worldcup-rank-gap"));
    wireExpanders();
    wireSectionNavigation();
    checkVisibleCopy();
  })
  .catch((error) => {
    console.error("Portfolio data failed to load", error);
  });
