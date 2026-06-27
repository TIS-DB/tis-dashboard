let weeklyData = {
  weeks: [],
  links: []
};

let selectedWeek = "";
let activeFilter = "all";

const weeklyContainer = document.getElementById("weeklyContainer");
const updatedAt = document.getElementById("updatedAt");
const weekSelect = document.getElementById("weekSelect");

document.addEventListener("DOMContentLoaded", loadWeeklyReview);

async function loadWeeklyReview() {
  try {
    const res = await fetch("data/weeklyreview.json?v=" + Date.now());

    if (!res.ok) throw new Error("weeklyreview.json not found");

    weeklyData = await res.json();

    setupWeekDropdown();
    renderSummary();
    renderWeeklyReview();

  } catch (err) {
    console.error("Error loading weeklyreview.json", err);
    weeklyContainer.innerHTML = `<div class="empty">Unable to load weekly review data</div>`;
  }
}

function refreshWeeklyReview() {
  loadWeeklyReview();
}

function setupWeekDropdown() {
  const weeks = weeklyData.weeks || [];

  if (!weeks.length) {
    weekSelect.innerHTML = `<option>No weeks found</option>`;
    return;
  }

  selectedWeek = selectedWeek || weeks[weeks.length - 1].week;

  weekSelect.innerHTML = weeks.map(w => `
    <option value="${escapeAttr(w.week)}" ${w.week === selectedWeek ? "selected" : ""}>
      ${escapeHtml(w.label || w.week)}
    </option>
  `).join("");
}

function changeWeek() {
  selectedWeek = weekSelect.value;
  renderSummary();
  renderWeeklyReview();
}

function getCurrentWeekData() {
  const weeks = weeklyData.weeks || [];
  return weeks.find(w => w.week === selectedWeek) || weeks[weeks.length - 1] || { dashboard: [] };
}

function renderSummary() {
  const weekData = getCurrentWeekData();
  const dashboard = weekData.dashboard || [];

  const totalUnits = dashboard.length;
  const totalRisks = countSectionItems(dashboard, "Risks");
  const totalChallenges = countSectionItems(dashboard, "Challenges");
  const totalSupport = countSectionItems(dashboard, "Support Required");

  const avgProgress = totalUnits
    ? Math.round(dashboard.reduce((sum, x) => sum + num(x.progress_percent), 0) / totalUnits)
    : 0;

  document.getElementById("totalUnits").innerText = totalUnits;
  document.getElementById("totalRisks").innerText = totalRisks;
  document.getElementById("totalChallenges").innerText = totalChallenges;
  document.getElementById("totalSupport").innerText = totalSupport;
  document.getElementById("avgProgress").innerText = avgProgress + "%";

  updatedAt.innerText =
    "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderWeeklyReview() {
  const weekData = getCurrentWeekData();
  let dashboard = weekData.dashboard || [];

  dashboard = dashboard.filter(item => {
    const status = clean(item.status).toLowerCase();

    if (activeFilter === "attention") return status.includes("attention");
    if (activeFilter === "track") return status.includes("track");
    if (activeFilter === "blocked") return status.includes("block");

    return true;
  });

  if (!dashboard.length) {
    weeklyContainer.innerHTML = `<div class="empty">No weekly review data found</div>`;
    return;
  }

  weeklyContainer.innerHTML = dashboard.map(item => renderReviewCard(item)).join("");
}

function renderReviewCard(item) {
  const links = getLinksForIncharge(item.incharge);
  const status = getStatus(item.status);

  return `
    <article class="weekly-card-new ${status.borderClass}">

      <aside class="weekly-owner-panel">
        <div class="weekly-avatar">${getInitials(item.incharge)}</div>

        <h3>${escapeHtml(item.incharge)}</h3>
        <p>${escapeHtml(item.team)}</p>
        <p class="weekly-sr">Sr. No. ${escapeHtml(item.sr_no)}</p>

        <span class="weekly-status ${status.className}">
          ${escapeHtml(item.status || "On Track")}
        </span>

        <div class="progress-circle" style="--progress:${num(item.progress_percent)}">
          <span>${num(item.progress_percent)}%</span>
        </div>

        <p class="progress-note">Progress</p>
      </aside>

      <section class="weekly-detail-grid">
        ${renderSection(item, "Progress / Output", "blue")}
        ${renderSection(item, "Current Project Status", "green")}
        ${renderSection(item, "Risks", "red")}
        ${renderSection(item, "Challenges", "orange")}
        ${renderSection(item, "Support Required", "green")}
      </section>

      <aside class="weekly-links-panel">
        <h4>Reference Links</h4>
        ${renderLinks(links)}
      </aside>

    </article>
  `;
}

function renderSection(item, sectionName, colorClass) {
  const section = (item.sections || []).find(s => clean(s.section) === sectionName);

  if (!section || !section.items || !section.items.length) {
    return `
      <div class="weekly-section-new">
        <h4 class="${colorClass}">${sectionName}</h4>
        <p class="muted">No update</p>
      </div>
    `;
  }

  return `
    <div class="weekly-section-new">
      <h4 class="${colorClass}">${escapeHtml(sectionName)}</h4>

      <ul>
        ${section.items.map(x => `
          <li>
            ${escapeHtml(x.item)}
            ${x.status ? `<span class="mini-status">${escapeHtml(x.status)}</span>` : ""}
          </li>
        `).join("")}
      </ul>

      <div class="last-week-box">
        <strong>Last Week</strong>
        <ul>
          ${section.items
            .filter(x => clean(x.last_week))
            .map(x => `<li>${escapeHtml(x.last_week)}</li>`)
            .join("") || "<li>No last week update</li>"}
        </ul>
      </div>
    </div>
  `;
}

function renderLinks(links) {
  if (!links.length) return `<p class="muted">No links added</p>`;

  return `
    <div class="weekly-link-list">
      ${links.map(link => `
        <a class="weekly-link-pill"
           href="${link.url}"
           target="_blank"
           rel="noopener noreferrer">
           ↗ ${escapeHtml(link.title)}
        </a>
      `).join("")}
    </div>
  `;
}

function getLinksForIncharge(incharge) {
  return (weeklyData.links || [])
    .filter(row => clean(row.incharge).toLowerCase() === clean(incharge).toLowerCase())
    .filter(row => clean(row.url))
    .map(row => ({
      title: clean(row.title || row.links),
      url: clean(row.url || row.link || row.hyperlink)
    }));
}

function countSectionItems(dashboard, sectionName) {
  return dashboard.reduce((sum, item) => {
    const section = (item.sections || []).find(s => clean(s.section) === sectionName);
    return sum + (section && section.items ? section.items.length : 0);
  }, 0);
}

function setFilter(filter) {
  activeFilter = filter;

  document.querySelectorAll(".filter-chip").forEach(btn => {
    btn.classList.remove("active");
  });

  if (filter === "all") document.getElementById("filterAll").classList.add("active");
  if (filter === "attention") document.getElementById("filterAttention").classList.add("active");
  if (filter === "track") document.getElementById("filterTrack").classList.add("active");
  if (filter === "blocked") document.getElementById("filterBlocked").classList.add("active");

  renderWeeklyReview();
}

function getStatus(statusText) {
  const s = clean(statusText).toLowerCase();

  if (s.includes("block")) {
    return {
      className: "status-blocked",
      borderClass: "border-blocked"
    };
  }

  if (s.includes("attention") || s.includes("risk")) {
    return {
      className: "status-watch",
      borderClass: "border-watch"
    };
  }

  return {
    className: "status-complete",
    borderClass: "border-complete"
  };
}

function num(v) {
  return Number(v || 0);
}

function clean(value) {
  return String(value || "").trim();
}

function getInitials(name = "") {
  return clean(name)
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function escapeHtml(text) {
  return clean(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

function escapeAttr(text) {
  return clean(text).replaceAll('"', "%22");
}

window.refreshWeeklyReview = refreshWeeklyReview;
window.changeWeek = changeWeek;
window.setFilter = setFilter;
