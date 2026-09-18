"use strict";

const state = {
  manifest: null,
  eventType: "finance",
  group: null,
  groupData: null,
  pair: null,
  split: "test",
  search: "",
  page: 1,
  pageSize: 50,
};

const elements = {};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compactNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function score(value) {
  return Number(value).toFixed(6);
}

function probability(value) {
  return Number(value).toFixed(4);
}

function percentage(numerator, denominator) {
  if (!denominator) return "0.00%";
  return `${(100 * numerator / denominator).toFixed(2)}%`;
}

function clip(value, low = 0.02, high = 0.98) {
  return Math.min(high, Math.max(low, value));
}

function logit(value) {
  return Math.log(value / (1 - value));
}

function sigmoid(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function aggregatePredictions(row, pair) {
  const pi = row.predictions[pair.member_i_index];
  const pj = row.predictions[pair.member_j_index];
  const logMethod = pair.methods.find((method) => method.key === "our_log_odds");
  const linearMethod = pair.methods.find((method) => method.key === "linear_pool");
  const qLog = sigmoid(
    logMethod.weight_on_i * logit(clip(pi)) +
    (1 - logMethod.weight_on_i) * logit(clip(pj))
  );
  const qLinear = linearMethod.weight_on_i * pi + (1 - linearMethod.weight_on_i) * pj;
  return { qLog, qLinear };
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

function cacheElements() {
  [
    "metric-grid", "type-summary-body", "hero-pdf-link", "pdf-download", "pdf-frame",
    "type-tabs", "group-select", "pair-select", "selection-note", "download-original",
    "download-pair", "download-json", "group-chips", "group-title", "group-subtitle",
    "strongest-model", "member-table-body", "pair-heading", "method-table-body",
    "figure-download", "group-figure", "row-count", "event-search", "page-size",
    "prediction-table-head", "prediction-table-body", "page-prev", "page-next",
    "page-status", "loading-overlay",
  ].forEach((id) => { elements[id] = $(id); });
}

function renderOverview() {
  const summary = state.manifest.summary;
  const cards = [
    [summary.event_types, "Event types", "Politics, Finance, and Weather"],
    [summary.groups, "Legal groups", "Each has at least 1,000 shared events"],
    [summary.weak_pair_occurrences, "Weak-pair occurrences", "Pairs may recur across distinct groups"],
    [summary.aligned_group_forecast_instances, "Aligned forecast rows", "Exact rows exported at group level"],
  ];
  elements["metric-grid"].innerHTML = cards.map(([value, label, detail]) => `
    <article class="metric-card">
      <span class="metric-value">${compactNumber(value)}</span>
      <span class="metric-label">${escapeHtml(label)}</span>
      <span class="metric-detail">${escapeHtml(detail)}</span>
    </article>
  `).join("");

  elements["type-summary-body"].innerHTML = state.manifest.type_summary.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${compactNumber(row.groups)}</td>
      <td>${compactNumber(row.pairs)}</td>
      <td>${compactNumber(row.log_lower_brier)} <span class="fraction">(${percentage(row.log_lower_brier, row.pairs)})</span></td>
      <td>${compactNumber(row.linear_lower_brier)} <span class="fraction">(${percentage(row.linear_lower_brier, row.pairs)})</span></td>
      <td>${compactNumber(row.log_strict)} <span class="fraction">(${percentage(row.log_strict, row.pairs)})</span></td>
      <td>${compactNumber(row.linear_strict)} <span class="fraction">(${percentage(row.linear_strict, row.pairs)})</span></td>
    </tr>
  `).join("");
  elements["hero-pdf-link"].href = state.manifest.pdf;
  elements["pdf-download"].href = state.manifest.pdf;
  elements["pdf-frame"].src = `${state.manifest.pdf}#page=1&view=FitH`;
}

function eventTypeGroups() {
  return state.manifest.groups.filter((group) => group.event_type === state.eventType);
}

function renderTypeTabs() {
  elements["type-tabs"].innerHTML = state.manifest.type_summary.map((row) => `
    <button type="button" role="tab" data-event-type="${escapeHtml(row.event_type)}"
      aria-selected="${row.event_type === state.eventType}">${escapeHtml(row.label)}</button>
  `).join("");
  elements["type-tabs"].querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      if (state.eventType === button.dataset.eventType) return;
      state.eventType = button.dataset.eventType;
      state.page = 1;
      renderTypeTabs();
      renderGroupOptions();
      await selectGroup(eventTypeGroups()[0]);
    });
  });
}

function renderGroupOptions() {
  const groups = eventTypeGroups();
  elements["group-select"].innerHTML = groups.map((group, index) => `
    <option value="${escapeHtml(group.group_id)}">
      Group ${index + 1} · ${group.group_size} models · ${group.pairs.length} pairs · ${compactNumber(group.common_events)} events
    </option>
  `).join("");
}

async function selectGroup(group) {
  if (!group) return;
  elements["loading-overlay"].classList.remove("hidden");
  state.group = group;
  elements["group-select"].value = group.group_id;
  state.groupData = await fetchJson(group.data_json);
  state.pair = group.pairs[0];
  state.page = 1;
  renderPairOptions();
  renderGroup();
  elements["loading-overlay"].classList.add("hidden");
}

function renderPairOptions() {
  elements["pair-select"].innerHTML = state.group.pairs.map((pair) => {
    const winner = pair.brier_winner === "our_log_odds" ? "log-odds lower" : pair.brier_winner === "linear_pool" ? "linear lower" : "tie";
    return `<option value="${pair.order}">${pair.order}. ${escapeHtml(pair.model_i)} + ${escapeHtml(pair.model_j)} · ${winner}</option>`;
  }).join("");
  elements["pair-select"].value = state.pair.order;
}

function methodStatus(method) {
  if (method.strict) return '<span class="status win">Beats strongest</span>';
  if (method.within_5pct) return '<span class="status near">Within 5%</span>';
  return '<span class="status miss">Outside 5%</span>';
}

function pairBestStatus(method) {
  return method.beats_pair_best
    ? '<span class="status win">Improves pair</span>'
    : '<span class="status miss">No improvement</span>';
}

function renderGroup() {
  const group = state.group;
  const pair = state.pair;
  const groups = eventTypeGroups();
  const groupNumber = groups.findIndex((item) => item.group_id === group.group_id) + 1;
  elements["group-chips"].innerHTML = `
    <span class="chip">${escapeHtml(group.event_type_label)}</span>
    <span class="chip teal">Threshold 1,000</span>
    <span class="chip gold">${group.group_size} models</span>
  `;
  elements["group-title"].textContent = `${group.event_type_label} group ${groupNumber}`;
  elements["group-subtitle"].textContent = `${compactNumber(group.common_events)} common events · ${compactNumber(group.common_instances)} aligned forecast rows · ${group.pairs.length} weak-pair occurrences · ID ${group.group_id_short}…`;
  elements["strongest-model"].innerHTML = `Strongest individual by test Brier<strong>${escapeHtml(group.strong_model)}</strong><span>Brier ${score(group.strong_test_brier)}</span>`;
  elements["selection-note"].innerHTML = `<strong>${escapeHtml(pair.model_i)}</strong><br>+ ${escapeHtml(pair.model_j)}<br><span>${group.train_events} train / ${group.test_events} test events</span>`;

  const members = [...group.members].sort((a, b) => a.test_brier - b.test_brier);
  elements["member-table-body"].innerHTML = members.map((member) => `
    <tr class="${member.name === group.strong_model ? "best-model-row" : ""}">
      <td>${escapeHtml(member.name)}${member.name === group.strong_model ? " · strongest" : ""}</td>
      <td class="numeric">${score(member.test_brier)}</td>
      <td class="numeric">${score(member.test_ece)}</td>
    </tr>
  `).join("");

  elements["pair-heading"].textContent = `${pair.model_i} + ${pair.model_j}`;
  elements["method-table-body"].innerHTML = pair.methods.map((method) => `
    <tr>
      <td>${escapeHtml(method.label)}</td>
      <td class="numeric">${Number(method.weight_on_i).toFixed(4)}</td>
      <td class="numeric">${score(1 - method.test_brier)}</td>
      <td class="numeric">${score(1 - method.test_ece)}</td>
      <td>${methodStatus(method)}</td>
      <td>${pairBestStatus(method)}</td>
    </tr>
  `).join("");

  elements["group-figure"].src = group.figure;
  elements["group-figure"].alt = `${group.event_type_label} group ${groupNumber}: individual and aggregate 1 minus Brier and 1 minus ECE`;
  elements["figure-download"].href = group.figure;
  elements["download-original"].href = group.original_csv_gz;
  elements["download-json"].href = group.data_json;
  renderPredictionTable();
}

function filteredRows() {
  if (!state.groupData) return [];
  const query = state.search.trim().toLocaleLowerCase();
  return state.groupData.rows.filter((row) => {
    if (state.split !== "all" && row.split !== state.split) return false;
    if (!query) return true;
    const event = state.groupData.events[String(row.event)];
    return [event.source, event.event_id, event.direction, event.question]
      .some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
  });
}

function renderPredictionTable() {
  const members = state.groupData.members;
  elements["prediction-table-head"].innerHTML = `
    <tr>
      <th>Event / forecast instance</th>
      <th>Split</th>
      <th class="numeric">Outcome</th>
      ${members.map((name) => `<th class="numeric">${escapeHtml(name)}</th>`).join("")}
      <th class="numeric aggregate-column">Our log-odds</th>
      <th class="numeric linear-column">Learned linear</th>
    </tr>
  `;

  const rows = filteredRows();
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const visible = rows.slice(start, start + state.pageSize);
  elements["prediction-table-body"].innerHTML = visible.map((row) => {
    const event = state.groupData.events[String(row.event)];
    const aggregate = aggregatePredictions(row, state.pair);
    return `
      <tr>
        <td title="${escapeHtml(event.question)}">
          <span class="event-title">${escapeHtml(event.question || `${event.source} ${event.event_id}`)}</span>
          <span class="event-meta">${escapeHtml(event.source)} · ${escapeHtml(event.event_id)} · ${escapeHtml(event.direction)} · occurrence ${row.event_occurrence_in_split}</span>
        </td>
        <td>${escapeHtml(row.split)}</td>
        <td class="numeric">${probability(row.outcome)}</td>
        ${row.predictions.map((value) => `<td class="numeric">${probability(value)}</td>`).join("")}
        <td class="numeric aggregate-column">${probability(aggregate.qLog)}</td>
        <td class="numeric linear-column">${probability(aggregate.qLinear)}</td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="99">No forecast rows match this filter.</td></tr>';
  elements["row-count"].textContent = `${compactNumber(rows.length)} rows`;
  elements["page-status"].textContent = `Page ${state.page} of ${pages}`;
  elements["page-prev"].disabled = state.page <= 1;
  elements["page-next"].disabled = state.page >= pages;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadSelectedPairCsv() {
  const members = state.groupData.members;
  const headers = [
    "instance", "panel_row", "overall_panel_row", "split", "source", "event_id", "direction",
    "question", "event_occurrence_in_split", "outcome", "event_weight",
    ...members.map((name) => `prediction::${name}`),
    "pair_model_i", "pair_model_j", "our_log_odds_weight_on_i", "learned_linear_weight_on_i",
    "our_log_odds_prediction", "learned_linear_prediction",
  ];
  const lines = [headers.map(csvCell).join(",")];
  state.groupData.rows.forEach((row) => {
    const event = state.groupData.events[String(row.event)];
    const aggregate = aggregatePredictions(row, state.pair);
    const logMethod = state.pair.methods.find((method) => method.key === "our_log_odds");
    const linearMethod = state.pair.methods.find((method) => method.key === "linear_pool");
    const values = [
      row.instance, row.panel_row, row.overall_panel_row, row.split, event.source, event.event_id,
      event.direction, event.question, row.event_occurrence_in_split, row.outcome, row.event_weight,
      ...row.predictions,
      state.pair.model_i, state.pair.model_j, logMethod.weight_on_i, linearMethod.weight_on_i,
      aggregate.qLog, aggregate.qLinear,
    ];
    lines.push(values.map(csvCell).join(","));
  });
  const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.group.event_type}-group-${state.group.display_order}-pair-${state.pair.order}-predictions.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  elements["group-select"].addEventListener("change", async (event) => {
    const group = eventTypeGroups().find((item) => item.group_id === event.target.value);
    await selectGroup(group);
  });
  elements["pair-select"].addEventListener("change", (event) => {
    state.pair = state.group.pairs.find((pair) => pair.order === Number(event.target.value));
    state.page = 1;
    renderGroup();
  });
  document.querySelectorAll('input[name="split"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.split = event.target.value;
      state.page = 1;
      renderPredictionTable();
    });
  });
  elements["event-search"].addEventListener("input", (event) => {
    state.search = event.target.value;
    state.page = 1;
    renderPredictionTable();
  });
  elements["page-size"].addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    renderPredictionTable();
  });
  elements["page-prev"].addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderPredictionTable();
  });
  elements["page-next"].addEventListener("click", () => {
    state.page += 1;
    renderPredictionTable();
  });
  elements["download-pair"].addEventListener("click", downloadSelectedPairCsv);
}

async function init() {
  cacheElements();
  bindEvents();
  try {
    state.manifest = await fetchJson("data/manifest.json");
    renderOverview();
    renderTypeTabs();
    renderGroupOptions();
    await selectGroup(eventTypeGroups()[0]);
  } catch (error) {
    console.error(error);
    elements["loading-overlay"].innerHTML = `<span>Could not load the frozen data: ${escapeHtml(error.message)}</span>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
