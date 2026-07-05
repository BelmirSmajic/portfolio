const state = {};

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const fmtNum = new Intl.NumberFormat("en-US");

function cleanText(value) {
  return String(value ?? "").replace(/[-–—]/g, " ");
}

function money(value) {
  const number = Number(value || 0);
  if (number < 0) return `(${fmtMoney.format(Math.abs(number))})`;
  return fmtMoney.format(number);
}

function pct(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
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

function renderProviderWorkspace(data, target) {
  const rows = data.workspaceRows;
  target.innerHTML = "";
  const controls = el("div", "control-row");
  const type = makeSelect("Provider type", optionList(data.scatter.map((d) => d.type)), "Oncology");
  const specialty = makeSelect("Specialty", ["All", ...optionList(data.scatter.map((d) => d.specialty))], "All");
  const region = makeSelect("Region", ["All", ...optionList(data.scatter.map((d) => d.region))], "All");
  const review = makeSelect("Review providers", ["Off", "On"], "Off");
  controls.append(type.wrap, specialty.wrap, region.wrap, review.wrap);
  const narrative = el("div", "narrative-box");
  const tableWrap = el("div", "table-wrap");
  target.append(controls, narrative, tableWrap);

  function update() {
    let current = rows.filter((row) => row.type === type.input.value);
    if (specialty.input.value !== "All") current = current.filter((row) => row.specialty === specialty.input.value);
    if (region.input.value !== "All") current = current.filter((row) => row.region === region.input.value);
    if (review.input.value === "On") current = current.filter((row) => row.status === "Review");
    narrative.textContent = cleanText(`${current.length} providers shown. The table ranks peer group cost per active member provider month from highest to lowest.`);
    tableWrap.innerHTML = "";
    const table = el("table");
    table.innerHTML = `<thead><tr><th>Provider</th><th>Specialty</th><th>Members</th><th>Cost per active month</th><th>Peer percentile</th><th>Ratio to median</th><th>Status</th></tr></thead>`;
    const body = el("tbody");
    current.forEach((row) => {
      const tr = el("tr");
      tr.innerHTML = `<td>${cleanText(row.provider)}</td><td>${cleanText(row.specialty)}</td><td>${fmtNum.format(row.members)}</td><td>${money(row.cost)}</td><td>${pct(row.percentile)}</td><td>${row.ratio.toFixed(2)}</td><td><span class="status ${row.status.toLowerCase()}">${cleanText(row.status)}</span></td>`;
      body.appendChild(tr);
    });
    table.appendChild(body);
    tableWrap.appendChild(table);
  }

  [type.input, specialty.input, region.input, review.input].forEach((input) => input.addEventListener("change", update));
  update();
}

function renderProviderScatter(data, target) {
  const rows = data.scatter.filter((d) => d.type === "Oncology");
  renderScatter(target, rows, {
    x: "members",
    y: "cost",
    xLabel: "Members",
    yLabel: "Cost per active month",
    color: (d) => statusColor(d.status),
    tooltip: (d) => `${d.provider}. ${fmtNum.format(d.members)} members. ${money(d.paid)} paid. ${money(d.cost)} normalized cost. ${pct(d.percentile)} peer percentile. ${d.status} status.`
  });
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

function statusColor(status) {
  if (status === "Review") return "#a23b3b";
  if (status === "Caution") return "#9a6a16";
  return "#2d6b57";
}

function renderScatter(target, rows, config) {
  target.innerHTML = "";
  const width = 720;
  const height = 380;
  const pad = 48;
  const maxX = Math.max(...rows.map((d) => Number(d[config.x]))) || 1;
  const maxY = Math.max(...rows.map((d) => Number(d[config.y]))) || 1;
  const sx = (value) => pad + (Number(value) / maxX) * (width - pad * 1.5);
  const sy = (value) => height - pad - (Number(value) / maxY) * (height - pad * 1.5);
  const tooltip = el("div", "tooltip", "Move across points to inspect details.");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", cleanText(`${config.xLabel} compared with ${config.yLabel}`));
  svg.innerHTML = `<line x1="${pad}" y1="${height - pad}" x2="${width - 24}" y2="${height - pad}" stroke="#9aa5aa"/><line x1="${pad}" y1="20" x2="${pad}" y2="${height - pad}" stroke="#9aa5aa"/><text x="${pad}" y="${height - 12}" font-size="14">${cleanText(config.xLabel)}</text><text x="12" y="26" font-size="14">${cleanText(config.yLabel)}</text>`;
  rows.forEach((row) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", sx(row[config.x]));
    dot.setAttribute("cy", sy(row[config.y]));
    dot.setAttribute("r", row.status === "Review" || row.advanced ? 6 : 4);
    dot.setAttribute("fill", config.color(row));
    dot.setAttribute("tabindex", "0");
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", cleanText(config.tooltip(row)));
    dot.addEventListener("mouseenter", () => { tooltip.textContent = cleanText(config.tooltip(row)); });
    dot.addEventListener("focus", () => { tooltip.textContent = cleanText(config.tooltip(row)); });
    svg.appendChild(dot);
  });
  target.append(svg, tooltip);
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
    detail.innerHTML = `<h4>${cleanText(row.acquired)}</h4><p><strong>Suggested existing product:</strong> ${cleanText(row.recommended)}</p><p><strong>Confidence:</strong> ${cleanText(row.confidence)} with score ${row.score}</p><p><strong>Method:</strong> ${cleanText(row.method)}</p><p><strong>Review reason:</strong> ${cleanText(row.reason)}</p>`;
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
  const steer = makeRange("Steerage percentage", 40, 90, 70);
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
    summary.textContent = cleanText(`Estimated projected savings are ${money(estimate)} at ${steer.input.value} percent steerage and ${rate.input.value} percent of benchmark.`);
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

function makeRange(labelText, min, max, value) {
  const wrap = el("label", "", `${labelText} ${value}`);
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.value = value;
  input.addEventListener("input", () => { wrap.firstChild.textContent = cleanText(`${labelText} ${input.value}`); });
  wrap.appendChild(input);
  return { wrap, input };
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

function titleCase(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderWorldcupScatter(data, target) {
  renderScatter(target, data.scatter, {
    x: "floor",
    y: "points",
    xLabel: "Bottom three value",
    yLabel: "Group points",
    color: (d) => d.advanced ? "#1f5f7a" : "#9a6a16",
    tooltip: (d) => `${d.team}. Bottom three value ${money(d.floor)}. Points ${d.points}. Goal difference ${signed(d.goalDifference)}. ${d.advanced ? "Advanced" : "Did not advance"}.`
  });
}

function renderWorldcupComparison(data, target) {
  target.innerHTML = "";
  const rows = data.comparison.length ? data.comparison : data.scatter.slice(0, 2);
  const max = Math.max(...rows.flatMap((r) => [r.floor, r.topThree, r.totalValue])) || 1;
  rows.forEach((row) => {
    const block = el("div", "record-detail");
    block.innerHTML = `<h4>${cleanText(row.team)}</h4><p>Points ${row.points}. Goal difference ${signed(row.goalDifference)}. ${row.advanced ? "Advanced" : "Did not advance"}.</p>`;
    [
      ["Lineup floor", row.floor],
      ["Top three average", row.topThree],
      ["Total Core XI value", row.totalValue]
    ].forEach(([label, value]) => {
      const line = el("div", "bar-row");
      line.innerHTML = `<span>${cleanText(label)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(4, (value / max) * 100)}%"></span></span><strong>${money(value)}</strong>`;
      block.appendChild(line);
    });
    target.appendChild(block);
  });
}

function wireExpanders() {
  const dialog = document.getElementById("expand-dialog");
  const body = document.getElementById("dialog-body");
  const close = document.getElementById("close-dialog");
  close.addEventListener("click", () => dialog.close());
  document.querySelectorAll("[data-expand]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = document.getElementById(button.dataset.expand);
      body.innerHTML = "";
      body.appendChild(source.cloneNode(true));
      document.getElementById("dialog-title").textContent = cleanText(button.closest(".visual-panel").querySelector("h3").textContent);
      dialog.showModal();
    });
  });
}

function checkVisibleCopy() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const problems = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.nodeValue.trim();
    const parent = walker.currentNode.parentElement;
    if (!text || !parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) continue;
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
    renderProviderScatter(data.provider, document.getElementById("provider-scatter"));
    renderContractScenario(data.preferred, document.getElementById("contract-scenario"));
    renderContractBridge(data.preferred, document.getElementById("contract-bridge"));
    renderAcquisitionFunnel(data.acquisition, document.getElementById("acquisition-funnel"));
    renderAcquisitionReview(data.acquisition, document.getElementById("acquisition-review"));
    renderWorldcupScatter(data.worldcup, document.getElementById("worldcup-scatter"));
    renderWorldcupComparison(data.worldcup, document.getElementById("worldcup-comparison"));
    wireExpanders();
    checkVisibleCopy();
  })
  .catch((error) => {
    console.error("Portfolio data failed to load", error);
  });
