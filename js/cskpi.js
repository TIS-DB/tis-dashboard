let cskpiData = [];
let activeCategory = "All";

const kpiContainer = document.getElementById("kpiContainer");
const categoryFilters = document.getElementById("categoryFilters");
const updatedTime = document.getElementById("updatedTime");
const dashboardSummary = document.getElementById("dashboardSummary");

document.addEventListener("DOMContentLoaded", loadCSKPI);

async function loadCSKPI() {
  try {
    const res = await fetch("data/cskpi.json?v=" + Date.now());
    if (!res.ok) throw new Error("cskpi.json not found");

    cskpiData = await res.json();

    renderHeader();
    renderFilters();
    renderSummary();
    renderKPIs();

  } catch (err) {
    console.error("Error loading cskpi.json", err);
    kpiContainer.innerHTML = `<div class="empty">Unable to load CS KPI data</div>`;
  }
}

function refreshCSKPI() {
  loadCSKPI();
}

function renderHeader() {
  const period = cskpiData[0]?.time_period_analysed || "";
  dashboardSummary.innerText = `Customer Success KPI Scorecard · ${period}`;

  updatedTime.innerText =
    "Updated " + new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

function renderFilters() {
  const categories = [
    "All",
    ...new Set(cskpiData.map(k => clean(k.kpi_category)).filter(Boolean))
  ];

  categoryFilters.innerHTML = categories.map(cat => `
    <button
      class="cs-filter-chip ${cat === activeCategory ? "active" : ""}"
      onclick="setCSCategory('${escapeAttr(cat)}')">
      ${escapeHtml(cat)}
    </button>
  `).join("");
}

function renderSummary() {
  const kpis = cskpiData || [];

  document.getElementById("totalKpis").innerText = kpis.length;
  document.getElementById("onTrackKpis").innerText =
    kpis.filter(k => getKPIStatus(k).status === "on-track").length;
  document.getElementById("atRiskKpis").innerText =
    kpis.filter(k => getKPIStatus(k).status === "at-risk").length;
  document.getElementById("offTrackKpis").innerText =
    kpis.filter(k => getKPIStatus(k).status === "off-track").length;
}

function renderKPIs() {
  let kpis = cskpiData || [];

  if (activeCategory !== "All") {
    kpis = kpis.filter(k => clean(k.kpi_category) === activeCategory);
  }

  if (!kpis.length) {
    kpiContainer.innerHTML = `<div class="empty">No KPI found for this category</div>`;
    return;
  }

  kpiContainer.innerHTML = kpis.map(kpi => renderKPICard(kpi)).join("");
}

function renderKPICard(kpi) {
  const status = getKPIStatus(kpi);
  const valueText = formatValue(kpi.kpi_value);
  const progress = getProgressPercent(kpi);

  const breakdown = [
    { label: "NI", value: kpi.ni_kpi },
    { label: "Foundation", value: kpi.foundation_kpi },
    { label: "Bandra", value: kpi.bandra_kpi },
    { label: "Dadar", value: kpi.dadar_kpi }
  ].filter(x => clean(x.value));

  return `
    <article class="cs-kpi-card">

      <div class="cs-kpi-top">
        <div>
          <h2>${escapeHtml(kpi.kpi_name)}</h2>
          <p class="cs-period">${escapeHtml(kpi.time_period_analysed)}</p>
        </div>

        <span class="cs-status-pill ${status.className}">
          ${status.label}
        </span>
      </div>

      <p class="cs-metric">${escapeHtml(kpi.metric)}</p>

      <div class="cs-kpi-main">
        <span class="cs-category-pill">${escapeHtml(kpi.kpi_category)}</span>

        <div class="cs-value-block">
          <div class="cs-kpi-value ${status.valueClass}">
            ${valueText}
          </div>
          <p>Target: ${escapeHtml(kpi.target)}</p>
        </div>
      </div>

      <div class="cs-progress">
        <div class="cs-progress-bar ${status.progressClass}" style="width:${progress}%"></div>
      </div>

      ${breakdown.length ? `
        <div class="cs-breakdown-title">NI & Foundation / Centre Split</div>

        <div class="cs-breakdown-grid">
          ${breakdown.map(x => `
            <div class="cs-breakdown-card">
              <h4>${escapeHtml(x.label)}</h4>
              <div class="${getKPIStatus({ ...kpi, kpi_value: x.value }).valueClass}">
                ${formatValue(x.value)}
              </div>
              <div class="cs-mini-progress">
                <div style="width:${Math.min(num(x.value), 100)}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}

    </article>
  `;
}

function setCSCategory(category) {
  activeCategory = category;
  renderFilters();
  renderKPIs();
}

function getKPIStatus(kpi) {
  const value = num(kpi.kpi_value);
  const targetValue = extractTargetNumber(kpi.target);
  const targetText = clean(kpi.target);

  let lowerIsBetter = targetText.includes("<") || targetText.includes("≤");

  let status = "off-track";

  if (lowerIsBetter) {
    if (value <= targetValue) status = "on-track";
    else if (value <= targetValue * 1.25) status = "at-risk";
  } else {
    if (value >= targetValue) status = "on-track";
    else if (value >= targetValue * 0.75) status = "at-risk";
  }

  if (status === "on-track") {
    return { status, label: "On track", className: "cs-on-track", valueClass: "green", progressClass: "green-bar" };
  }

  if (status === "at-risk") {
    return { status, label: "At risk", className: "cs-at-risk", valueClass: "gold", progressClass: "gold-bar" };
  }

  return { status, label: "Off track", className: "cs-off-track", valueClass: "red", progressClass: "red-bar" };
}

function extractTargetNumber(target) {
  const match = String(target || "").match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function getProgressPercent(kpi) {
  const value = num(kpi.kpi_value);
  const targetValue = extractTargetNumber(kpi.target);
  const lowerIsBetter = clean(kpi.target).includes("<") || clean(kpi.target).includes("≤");

  if (!targetValue) return Math.min(value, 100);

  if (lowerIsBetter) {
    return Math.min((targetValue / Math.max(value, targetValue)) * 100, 100);
  }

  return Math.min((value / targetValue) * 100, 100);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  const raw = clean(value);
  const n = num(raw);
  if (raw.includes("%")) return n.toFixed(n % 1 === 0 ? 0 : 1) + "%";
  return raw;
}

function clean(value) {
  return String(value || "").trim();
}

function num(value) {
  return Number(clean(value).replace("%", "")) || 0;
}

function escapeHtml(text) {
  return clean(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(text) {
  return clean(text).replaceAll("'", "\\'");
}

window.refreshCSKPI = refreshCSKPI;
window.setCSCategory = setCSCategory;
