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

    if (!res.ok) {
      throw new Error("cskpi.json not found");
    }

    cskpiData = await res.json();

    renderHeader();
    renderFilters();
    renderSummary();
    renderKPIs();
  } catch (err) {
    console.error("Error loading cskpi.json", err);

    kpiContainer.innerHTML = `
      <div class="empty">Unable to load CS KPI data</div>
    `;
  }
}

function refreshCSKPI() {
  loadCSKPI();
}

function renderHeader() {
  const period = cskpiData[0]?.time_period_analysed || "";

  dashboardSummary.innerText =
    `Customer Success KPI Scorecard · ${period}`;

  updatedTime.innerText =
    "Updated " +
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

function renderFilters() {
  const categories = [
    "All",
    ...new Set(
      cskpiData
        .map(kpi => clean(kpi.kpi_category))
        .filter(Boolean)
    )
  ];

  categoryFilters.innerHTML = categories
    .map(category => `
      <button
        class="cs-filter-chip ${
          category === activeCategory ? "active" : ""
        }"
        onclick="setCSCategory('${escapeAttr(category)}')">
        ${escapeHtml(category)}
      </button>
    `)
    .join("");
}

function renderSummary() {
  const kpis = cskpiData || [];

  document.getElementById("totalKpis").innerText =
    kpis.length;

  document.getElementById("onTrackKpis").innerText =
    kpis.filter(kpi => getKPIStatus(kpi).status === "on-track").length;

  document.getElementById("atRiskKpis").innerText =
    kpis.filter(kpi => getKPIStatus(kpi).status === "at-risk").length;

  document.getElementById("offTrackKpis").innerText =
    kpis.filter(kpi => getKPIStatus(kpi).status === "off-track").length;
}

function renderKPIs() {
  let kpis = cskpiData || [];

  if (activeCategory !== "All") {
    kpis = kpis.filter(
      kpi => clean(kpi.kpi_category) === activeCategory
    );
  }

  if (!kpis.length) {
    kpiContainer.innerHTML = `
      <div class="empty">No KPI found for this category</div>
    `;
    return;
  }

  kpiContainer.innerHTML = kpis
    .map(kpi => renderKPICard(kpi))
    .join("");
}

function renderKPICard(kpi) {
  const status = getKPIStatus(kpi);
  const valueText = formatValue(kpi.kpi_value, kpi);
  const progress = getProgressPercent(kpi);

  const breakdown = [
    {
      label: "NI",
      value: kpi.ni_kpi
    },
    {
      label: "Foundation",
      value: kpi.foundation_kpi
    },
    {
      label: "Bandra",
      value: kpi.bandra_kpi
    },
    {
      label: "Dadar",
      value: kpi.dadar_kpi
    }
  ].filter(item => hasValue(item.value));

  return `
    <article class="cs-kpi-card">

      <div class="cs-kpi-top">
        <div>
          <h2>${escapeHtml(kpi.kpi_name)}</h2>

          <p class="cs-period">
            ${escapeHtml(kpi.time_period_analysed)}
          </p>
        </div>

        <span class="cs-status-pill ${status.className}">
          ${status.label}
        </span>
      </div>

      <p class="cs-metric">
        ${escapeHtml(kpi.metric)}
      </p>

      <div class="cs-kpi-main">
        <span class="cs-category-pill">
          ${escapeHtml(kpi.kpi_category)}
        </span>

        <div class="cs-value-block">
          <div class="cs-kpi-value ${status.valueClass}">
            ${valueText}
          </div>

          <p>
            Target: ${escapeHtml(kpi.target)}
          </p>
        </div>
      </div>

      <div class="cs-progress">
        <div
          class="cs-progress-bar ${status.progressClass}"
          style="width:${progress}%">
        </div>
      </div>

      ${
        breakdown.length
          ? `
            <div class="cs-breakdown-title">
              NI & Foundation / Centre Split
            </div>

            <div class="cs-breakdown-grid">
              ${breakdown
                .map(item => {
                  const breakdownKPI = {
                    ...kpi,
                    kpi_value: item.value
                  };

                  const breakdownStatus =
                    getKPIStatus(breakdownKPI);

                  const breakdownProgress =
                    getProgressPercent(breakdownKPI);

                  return `
                    <div class="cs-breakdown-card">
                      <h4>${escapeHtml(item.label)}</h4>

                      <div class="${breakdownStatus.valueClass}">
                        ${formatValue(item.value, kpi)}
                      </div>

                      <div class="cs-mini-progress">
                        <div
                          class="${breakdownStatus.progressClass}"
                          style="width:${breakdownProgress}%">
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : ""
      }

    </article>
  `;
}

function setCSCategory(category) {
  activeCategory = category;

  renderFilters();
  renderKPIs();
}

/*
 * Determines whether the KPI value represents time.
 *
 * Query Response TAT is measured in hours and must not
 * be shown as a percentage.
 */
function isTimeKPI(kpi = {}) {
  const kpiName = clean(kpi.kpi_name).toLowerCase();

  /*
   * Only Query Response TAT is measured in hours.
   * Every other KPI is treated as a percentage.
   */
  return (
    kpiName.includes("query response tat") ||
    kpiName.includes("query turnaround time") ||
    kpiName.includes("query turn around time")
  );
}

/*
 * Converts a KPI value into a number while respecting
 * whether it is a percentage or an hour-based value.
 */
function getNumericValue(value, kpi = {}) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const raw = clean(value);

  const numericText = raw
    .replace(/%/g, "")
    .replace(/hours?/gi, "")
    .replace(/hrs?/gi, "")
    .trim();

  const parsedNumber = Number(numericText);

  if (Number.isNaN(parsedNumber)) {
    return 0;
  }

  /*
   * Time values such as 10.1 or 0.5 must remain unchanged.
   */
  if (isTimeKPI(kpi)) {
    return parsedNumber;
  }

  /*
   * If the JSON already contains %, return the number directly.
   * Example: "88.6%" becomes 88.6.
   */
  if (raw.includes("%")) {
    return parsedNumber;
  }

  /*
   * Decimal percentage values are converted into percentages.
   * Example: 0.886 becomes 88.6.
   */
  if (parsedNumber <= 1) {
    return parsedNumber * 100;
  }

  /*
   * Whole percentage values remain unchanged.
   * Example: 88.6 remains 88.6.
   */
  return parsedNumber;
}

function getKPIStatus(kpi) {
  const value = getNumericValue(kpi.kpi_value, kpi);
  const targetValue = extractTargetNumber(kpi.target);
  const targetText = clean(kpi.target);

  const lowerIsBetter =
    targetText.includes("<") ||
    targetText.includes("≤");

  let status = "off-track";

  if (lowerIsBetter) {
    if (value <= targetValue) {
      status = "on-track";
    } else if (value <= targetValue * 1.25) {
      status = "at-risk";
    }
  } else {
    if (value >= targetValue) {
      status = "on-track";
    } else if (value >= targetValue * 0.75) {
      status = "at-risk";
    }
  }

  if (status === "on-track") {
    return {
      status: "on-track",
      label: "On track",
      className: "cs-on-track",
      valueClass: "green",
      progressClass: "green-bar"
    };
  }

  if (status === "at-risk") {
    return {
      status: "at-risk",
      label: "At risk",
      className: "cs-at-risk",
      valueClass: "gold",
      progressClass: "gold-bar"
    };
  }

  return {
    status: "off-track",
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
  const value = getNumericValue(kpi.kpi_value, kpi);
  const targetValue = extractTargetNumber(kpi.target);
  const targetText = clean(kpi.target);

  const lowerIsBetter =
    targetText.includes("<") ||
    targetText.includes("≤");

  if (!targetValue) {
    return Math.min(Math.max(value, 0), 100);
  }

  /*
   * For lower-is-better KPIs:
   * Example: Query Response TAT target ≤24 hours.
   * A value of 10.1 hours gives a full progress bar.
   */
  if (lowerIsBetter) {
    return Math.min(
      (targetValue / Math.max(value, targetValue)) * 100,
      100
    );
  }

  /*
   * For higher-is-better KPIs:
   * Example: Attendance target ≥90%.
   */
  return Math.min(
    Math.max((value / targetValue) * 100, 0),
    100
  );
}

function formatValue(value, kpi = {}) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const raw = clean(value);
  const numericValue = getNumericValue(value, kpi);

  /*
   * Display Query Response TAT as hours.
   */
  if (isTimeKPI(kpi)) {
    return (
      numericValue.toFixed(
        numericValue % 1 === 0 ? 0 : 1
      ) + " hrs"
    );
  }

  /*
   * Preserve values that already contain a % sign.
   */
  if (raw.includes("%")) {
    return raw;
  }

  return (
    numericValue.toFixed(
      numericValue % 1 === 0 ? 0 : 1
    ) + "%"
  );
}

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    clean(value) !== ""
  );
}

function clean(value) {
  return String(value ?? "").trim();
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
  return clean(text)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

window.refreshCSKPI = refreshCSKPI;
window.setCSCategory = setCSCategory;
