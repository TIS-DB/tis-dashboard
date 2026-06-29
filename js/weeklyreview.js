let weeklyData = {
  dashboard: [],
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

function setupWeekDropdown() {
  const weeks = [...new Set((weeklyData.dashboard || []).map(x => clean(x.week)).filter(Boolean))];

  if (!weeks.length) {
    weekSelect.innerHTML = `<option>No weeks found</option>`;
    return;
  }

  selectedWeek = selectedWeek || weeks[weeks.length - 1];

  weekSelect.innerHTML = weeks.map(w => `
    <option value="${escapeAttr(w)}" ${w === selectedWeek ? "selected" : ""}>
      Week ${escapeHtml(w)}
    </option>
  `).join("");
}

function changeWeek() {
  selectedWeek = weekSelect.value;
  renderSummary();
  renderWeeklyReview();
}

function getCurrentRows() {
  return (weeklyData.dashboard || []).filter(x => clean(x.week) === selectedWeek);
}

function groupDashboardRows(rows) {
  const map = {};

  rows.forEach(row => {
    const key = `${clean(row.incharge)}|${clean(row.business_unit)}`;

    if (!map[key]) {
      map[key] = {
        incharge: row.incharge,
        business_unit: row.business_unit,
        sr_no: row.sr_no,
        progress_percent: 0,
        status: row.status,
        sections: []
      };
    }

    let section = map[key].sections.find(s => s.section === row.section);

    if (!section) {
      section = {
        section: row.section,
        items: []
      };
      map[key].sections.push(section);
    }

    section.items.push(row);
  });

  return Object.values(map).map(unit => {
    const allItems = unit.sections.flatMap(s => s.items);
    unit.progress_percent = Math.round(
      allItems.reduce((sum, x) => sum + num(x.progress_percent || x["progress_%"]), 0) / allItems.length
    );

    return unit;
  });
}

function renderSummary() {
  const rows = getCurrentRows();
  const grouped = groupDashboardRows(rows);

  document.getElementById("totalUnits").innerText = grouped.length;
  document.getElementById("totalRisks").innerText = rows.filter(x => clean(x.section) === "Risks").length;
  document.getElementById("totalChallenges").innerText = rows.filter(x => clean(x.section) === "Challenges").length;
  document.getElementById("totalSupport").innerText = rows.filter(x => clean(x.section) === "Support Required").length;

  const avgProgress = rows.length
    ? Math.round(rows.reduce((sum, x) => sum + num(x.progress_percent || x["progress_%"]), 0) / rows.length)
    : 0;

  document.getElementById("avgProgress").innerText = avgProgress + "%";

  updatedAt.innerText =
    "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderWeeklyReview() {
  let rows = getCurrentRows();
  let dashboard = groupDashboardRows(rows);

  dashboard = dashboard.filter(item => {
    const allStatuses = item.sections.flatMap(s => s.items).map(x => clean(x.status).toLowerCase()).join(" ");

    if (activeFilter === "attention") return allStatuses.includes("pending") || allStatuses.includes("open");
    if (activeFilter === "track") return allStatuses.includes("progress") || allStatuses.includes("complete");
    if (activeFilter === "blocked") return allStatuses.includes("block");

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
  //const status = getStatus(item.status);
const status = getStatus(item.status, item);
  
  return `
    <article class="weekly-card-new ${status.borderClass}">

      <aside class="weekly-owner-panel">
        <div class="weekly-avatar">${getInitials(item.incharge)}</div>

        <h3>${escapeHtml(item.incharge)}</h3>
        <p>${escapeHtml(item.business_unit)}</p>
        <p class="weekly-sr">Sr. No. ${escapeHtml(item.sr_no)}</p>

        <span class="weekly-status ${status.className}">
        ${escapeHtml(status.label)}
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
        ${renderSection(item, "Key Updates", "blue")}
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

  if (!section || !section.items.length) {
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
    </div>
  `;
}

function renderLinks(links) {
  if (!links.length) return `<p class="muted">No links added</p>`;

  return `
    <div class="weekly-link-list">
      ${links.map(link => `
        <a class="weekly-link-pill"
           href="${escapeAttr(link.url)}"
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
    .filter(row => clean(row.link_url))
    .map(row => ({
      title: clean(row.link_title),
      url: clean(row.link_url)
    }));
}

function setFilter(filter) {
  activeFilter = filter;

  document.querySelectorAll(".filter-chip").forEach(btn => btn.classList.remove("active"));

  if (filter === "all") document.getElementById("filterAll").classList.add("active");
  if (filter === "attention") document.getElementById("filterAttention").classList.add("active");
  if (filter === "track") document.getElementById("filterTrack").classList.add("active");
  if (filter === "blocked") document.getElementById("filterBlocked").classList.add("active");

  renderWeeklyReview();
}

/*function getStatus(statusText) {
  const s = clean(statusText).toLowerCase();

  if (s.includes("block")) return { className: "status-blocked", borderClass: "border-blocked" };
  if (s.includes("pending") || s.includes("open")) return { className: "status-watch", borderClass: "border-watch" };

  return { className: "status-complete", borderClass: "border-complete" };
}*/
function getStatus(statusText, item = null) {
  if (!item || !item.sections) {
    const s = clean(statusText).toLowerCase();

    if (s.includes("block")) {
      return { className: "status-blocked", borderClass: "border-blocked", label: "Blocked" };
    }

    if (s.includes("pending") || s.includes("open")) {
      return { className: "status-watch", borderClass: "border-watch", label: "Needs Attention" };
    }

    return { className: "status-complete", borderClass: "border-complete", label: "On Track" };
  }

  const supportItems = item.sections
    .filter(s => clean(s.section) === "Support Required")
    .flatMap(s => s.items);

  const supportStatuses = supportItems
    .map(x => clean(x.status).toLowerCase())
    .join(" ");

  if (supportStatuses.includes("block")) {
    return { className: "status-blocked", borderClass: "border-blocked", label: "Blocked" };
  }

  if (supportStatuses.includes("pending") || supportStatuses.includes("open")) {
    return { className: "status-watch", borderClass: "border-watch", label: "Needs Attention" };
  }

  return { className: "status-complete", borderClass: "border-complete", label: "On Track" };
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
    .replaceAll("'", "&#039;");
}

function escapeAttr(text) {
  return clean(text).replaceAll('"', "%22");
}

window.refreshWeeklyReview = loadWeeklyReview;
window.changeWeek = changeWeek;
window.setFilter = setFilter;
