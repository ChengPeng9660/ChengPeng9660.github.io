"use strict";

const state = {
  manifest: null,
  group: null,
  groupData: null,
  pair: null,
  split: "test",
  search: "",
  page: 1,
  pageSize: 50,
};

const element = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatScore(value) {
  return Number(value).toFixed(6);
}

function formatPrediction(value) {
  return Number(value).toFixed(4);
}

function clip(value, low = 0.02, high = 0.98) {
  return Math.min(high, Math.max(low, value));
}

function logit(value) {
  return Math.log(value / (1 - value));
}

function sigmoid(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const expValue = Math.exp(value);
  return expValue / (1 + expValue);
}

function predictionsForRow(row) {
  const pair = state.pair;
  const p1 = row.predictions[pair.member_i_index];
  const p2 = row.predictions[pair.member_j_index];
  const logMethod = pair.methods.find((method) => method.key === "our_log_odds");
  const linearMethod = pair.methods.find((method) => method.key === "linear_pool");
  const logPrediction = sigmoid(
    logMethod.weight_on_i * logit(clip(p1)) +
    (1 - logMethod.weight_on_i) * logit(clip(p2))
  );
  const linearPrediction = linearMethod.weight_on_i * p1 + (1 - linearMethod.weight_on_i) * p2;
  return {
    p1,
    p2,
    logPrediction,
    linearPrediction,
    logBrier: (logPrediction - row.outcome) ** 2,
    linearBrier: (linearPrediction - row.outcome) ** 2,
  };
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json();
}

function renderSummary() {
  const summary = state.manifest.summary;
  element("overall-summary").textContent =
    `${summary.event_types} event types, ${formatCount(summary.groups)} groups, ` +
    `${formatCount(summary.weak_pair_occurrences)} weak-pair occurrences, and ` +
    `${formatCount(summary.aligned_group_forecast_instances)} aligned forecast rows.`;
  element("type-summary-body").innerHTML = state.manifest.type_summary.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td class="number">${formatCount(row.groups)}</td>
      <td class="number">${formatCount(row.pairs)}</td>
    </tr>
  `).join("");
  element("pdf-link").href = state.manifest.pdf;
}

function groupLabel(group) {
  const sameType = state.manifest.groups.filter((item) => item.event_type === group.event_type);
  const withinType = sameType.findIndex((item) => item.group_id === group.group_id) + 1;
  return `${group.event_type_label} group ${withinType} · ${group.group_size} models · ` +
    `${group.pairs.length} pairs · ${formatCount(group.common_events)} events`;
}

function renderGroupOptions() {
  element("group-select").innerHTML = state.manifest.groups.map((group) => `
    <option value="${escapeHtml(group.group_id)}">${escapeHtml(groupLabel(group))}</option>
  `).join("");
}

async function selectGroup(group) {
  element("loading").classList.remove("hidden");
  state.group = group;
  state.groupData = await fetchJson(group.data_json);
  state.pair = group.pairs[0];
  state.page = 1;
  element("group-select").value = group.group_id;
  renderPairOptions();
  renderSelectedPair();
  element("loading").classList.add("hidden");
}

function renderPairOptions() {
  element("pair-select").innerHTML = state.group.pairs.map((pair) => `
    <option value="${pair.order}">${pair.order}. ${escapeHtml(pair.model_i)} + ${escapeHtml(pair.model_j)}</option>
  `).join("");
  element("pair-select").value = state.pair.order;
}

function memberByName(name) {
  return state.group.members.find((member) => member.name === name);
}

function renderSelectedPair() {
  const group = state.group;
  const pair = state.pair;
  element("group-title").textContent = groupLabel(group);
  element("group-description").textContent =
    `Group ID ${group.group_id} · ${formatCount(group.train_events)} train events · ` +
    `${formatCount(group.test_events)} test events · strongest individual: ${group.strong_model} ` +
    `(test Brier ${formatScore(group.strong_test_brier)}).`;

  const model1 = memberByName(pair.model_i);
  const model2 = memberByName(pair.model_j);
  element("member-table-body").innerHTML = `
    <tr><td>Model 1</td><td>${escapeHtml(pair.model_i)}</td><td class="number">${formatScore(model1.test_brier)}</td></tr>
    <tr><td>Model 2</td><td>${escapeHtml(pair.model_j)}</td><td class="number">${formatScore(model2.test_brier)}</td></tr>
  `;
  element("method-table-body").innerHTML = pair.methods.map((method) => `
    <tr>
      <td>${escapeHtml(method.label)}</td>
      <td class="number">${Number(method.weight_on_i).toFixed(6)}</td>
      <td class="number">${formatScore(method.test_brier)}</td>
    </tr>
  `).join("");

  element("group-figure").src = `${group.figure}?v=${group.data_json_sha256.slice(0, 12)}`;
  element("group-figure").alt = `${group.event_type_label} group figure from the PDF`;
  element("figure-download").href = group.figure;
  element("download-original").href = group.original_csv_gz;
  element("download-json").href = group.data_json;
  renderEventTable();
}

function filteredRows() {
  const query = state.search.trim().toLocaleLowerCase();
  return state.groupData.rows.filter((row) => {
    if (state.split !== "all" && row.split !== state.split) return false;
    if (!query) return true;
    const event = state.groupData.events[String(row.event)];
    return String(event.event_id).toLocaleLowerCase().includes(query);
  });
}

function renderEventTable() {
  const pair = state.pair;
  element("event-table-head").innerHTML = `
    <tr>
      <th>Event ID</th>
      <th class="number">Model 1 prediction<br><small>${escapeHtml(pair.model_i)}</small></th>
      <th class="number">Model 2 prediction<br><small>${escapeHtml(pair.model_j)}</small></th>
      <th class="number log-column">Our log-odds prediction</th>
      <th class="number linear-column">Linear pool prediction</th>
      <th class="number log-column">Our log-odds Brier</th>
      <th class="number linear-column">Linear pool Brier</th>
    </tr>
  `;

  const rows = filteredRows();
  const pageCount = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);
  element("event-table-body").innerHTML = pageRows.map((row) => {
    const event = state.groupData.events[String(row.event)];
    const result = predictionsForRow(row);
    return `
      <tr>
        <td title="${escapeHtml(event.question)}">${escapeHtml(event.event_id)}</td>
        <td class="number">${formatPrediction(result.p1)}</td>
        <td class="number">${formatPrediction(result.p2)}</td>
        <td class="number log-column">${formatPrediction(result.logPrediction)}</td>
        <td class="number linear-column">${formatPrediction(result.linearPrediction)}</td>
        <td class="number log-column">${formatScore(result.logBrier)}</td>
        <td class="number linear-column">${formatScore(result.linearBrier)}</td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="7">No matching rows.</td></tr>';

  element("row-count").textContent = `${formatCount(rows.length)} rows`;
  element("page-status").textContent = `Page ${state.page} of ${pageCount}`;
  element("page-prev").disabled = state.page <= 1;
  element("page-next").disabled = state.page >= pageCount;
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCurrentTable() {
  const pair = state.pair;
  const headers = [
    "event_id",
    `model_1_prediction::${pair.model_i}`,
    `model_2_prediction::${pair.model_j}`,
    "our_log_odds_prediction",
    "linear_pool_prediction",
    "our_log_odds_brier",
    "linear_pool_brier",
  ];
  const lines = [headers.map(csvValue).join(",")];
  filteredRows().forEach((row) => {
    const event = state.groupData.events[String(row.event)];
    const result = predictionsForRow(row);
    lines.push([
      event.event_id,
      result.p1,
      result.p2,
      result.logPrediction,
      result.linearPrediction,
      result.logBrier,
      result.linearBrier,
    ].map(csvValue).join(","));
  });
  const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.group.event_type}-group-${state.group.display_order}-pair-${pair.order}-${state.split}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  element("group-select").addEventListener("change", async (event) => {
    const group = state.manifest.groups.find((item) => item.group_id === event.target.value);
    await selectGroup(group);
  });
  element("pair-select").addEventListener("change", (event) => {
    state.pair = state.group.pairs.find((pair) => pair.order === Number(event.target.value));
    state.page = 1;
    renderSelectedPair();
  });
  element("split-select").addEventListener("change", (event) => {
    state.split = event.target.value;
    state.page = 1;
    renderEventTable();
  });
  element("event-search").addEventListener("input", (event) => {
    state.search = event.target.value;
    state.page = 1;
    renderEventTable();
  });
  element("page-size").addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    renderEventTable();
  });
  element("page-prev").addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderEventTable();
  });
  element("page-next").addEventListener("click", () => {
    state.page += 1;
    renderEventTable();
  });
  element("download-table").addEventListener("click", downloadCurrentTable);
}

async function init() {
  bindEvents();
  try {
    state.manifest = await fetchJson("data/manifest.json");
    renderSummary();
    renderGroupOptions();
    await selectGroup(state.manifest.groups[0]);
  } catch (error) {
    console.error(error);
    element("loading").textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", init);
