let cskpiData = {
  report_period: "",
  kpis: []
};

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
  dashboardSummary.innerText =
    `Customer Success KPI Scorecard · ${cskpiData.report_period || ""}`;

  updatedTime.innerText =
    "Updated " + new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

function renderFilters() {
  const categories = [
    "All",
    ...new Set((cskpiData.kpis || []).map(k => clean(k.category)).filter(Boolean))
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
  const kpis = cskpiData.kpis || [];

  const total = kpis.length;
  const onTrack = kpis.filter(k => getKPIStatus(k).status === "on-track").length;
  const atRisk = kpis.filter(k => getKPIStatus(k).status === "at-risk").length;
  const offTrack = kpis.filter(k => getKPIStatus(k).status === "off-track").length;

  document.getElementById("totalKpis").innerText = total;
  document.getElementById("onTrackKpis").innerText = onTrack;
  document.getElementById("atRiskKpis").innerText = atRisk;
  document.getElementById("offTrackKpis").innerText = offTrack;
}

function renderKPIs() {
  let kpis = cskpiData.kpis || [];

  if (activeCategory !== "All") {
    kpis = kpis.filter(k => clean(k.category) === activeCategory);
  }

  if (!kpis.length) {
    kpiContainer.innerHTML = `<div class="empty">No KPI found for this category</div>`;
    return;
  }

  kpiContainer.innerHTML = kpis.map(kpi => renderKPICard(kpi)).join("");
}

function renderKPICard(kpi) {
  const status = getKPIStatus(kpi);
  const valueText = formatValue(kpi.overall, kpi.unit);
  const progress = getProgressPercent(kpi);

  const breakdown = [
    { label: "NI", value: kpi.ni },
    { label: "Foundation", value: kpi.foundation },
    { label: "Bandra", value: kpi.bandra },
    { label: "Dadar", value: kpi.dadar }
  ].filter(x => x.value !== null && x.value !== undefined && x.value !== "");

  return `
    <article class="cs-kpi-card">

      <div class="cs-kpi-top">
        <div>
          <h2>${escapeHtml(kpi.name)}</h2>
          <p class="cs-period">${escapeHtml(kpi.period || cskpiData.report_period || "")}</p>
        </div>

        <span class="cs-status-pill ${status.className}">
          ${status.label}
        </span>
      </div>

      <p class="cs-metric">${escapeHtml(kpi.metric)}</p>

      <div class="cs-kpi-main">
        <span class="cs-category-pill">${escapeHtml(kpi.category)}</span>

        <div class="cs-value-block">
          <div class="cs-kpi-value ${status.valueClass}">
            ${valueText}
          </div>
          <p>Target: ${escapeHtml(kpi.target)}</p>
        </div>
      </div>

      ${kpi.unit === "%"
        ? `
          <div class="cs-progress">
            <div class="cs-progress-bar ${status.progressClass}" style="width:${progress}%"></div>
          </div>
        `
        : `
          <div class="cs-tat-box ${status.className}">
            ${status.label}
          </div>
        `
      }

      ${breakdown.length ? `
        <div class="cs-breakdown-title">NI & Foundation / Centre Split</div>

        <div class="cs-breakdown-grid">
          ${breakdown.map(x => `
            <div class="cs-breakdown-card">
              <h4>${escapeHtml(x.label)}</h4>
              <div class="${getKPIStatus({ ...kpi, overall: x.value }).valueClass}">
                ${formatValue(x.value, kpi.unit)}
              </div>

              ${kpi.unit === "%"
                ? `
                  <div class="cs-mini-progress">
                    <div style="width:${Math.min(num(x.value), 100)}%"></div>
                  </div>
                `
                : ""
              }
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
  const value = num(kpi.overall);
  const targetValue = extractTargetNumber(kpi.target);
  const direction = clean(kpi.direction) || "higher";

  let status = "off-track";

  if (direction === "lower") {
    if (value <= targetValue) status = "on-track";
    else if (value <= targetValue * 1.25) status = "at-risk";
  } else {
    if (value >= targetValue) status = "on-track";
    else if (value >= targetValue * 0.75) status = "at-risk";
  }

  if (status === "on-track") {
    return {
      status,
      label: "On track",
      className: "cs-on-track",
      valueClass: "green",
      progressClass: "green-bar"
    };
  }

  if (status === "at-risk") {
    return {
      status,
      label: "At risk",
      className: "cs-at-risk",
      valueClass: "gold",
      progressClass: "gold-bar"
    };
  }

  return {
    status,
    label: "Off track",
    className: "cs-off-track",
    valueClass: "red",
    progressClass: "red-bar"
  };
}

function extractTargetNumber(target) {
  const match = String(target || "").match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function getProgressPercent(kpi) {
  const value = num(kpi.overall);

  if (clean(kpi.direction) === "lower") {
    const target = extractTargetNumber(kpi.target);
    if (!target) return 100;
    return Math.min((target / Math.max(value, target)) * 100, 100);
  }

  return Math.min(value, 100);
}

function formatValue(value, unit) {
  if (value === null || value === undefined || value === "") return "-";

  const n = num(value);

  if (unit === "%") return n.toFixed(n % 1 === 0 ? 0 : 1) + "%";
  if (unit === "hrs") return n + " hrs";

  return n.toString();
}

function clean(value) {
  return String(value || "").trim();
}

function num(value) {
  return Number(value || 0);
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
  return escapeHtml(text).replaceAll("'", "\\'");
}

window.refreshCSKPI = refreshCSKPI;
window.setCSCategory = setCSCategory;
