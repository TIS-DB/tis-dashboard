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
  const status = getStatus(item.status, item);
  const progressClass = getProgressClass(item.progress_percent);

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

        <div class="progress-circle ${progressClass}" style="--progress:${num(item.progress_percent)}">
          <span>${num(item.progress_percent)}%</span>
        </div>

        <p class="progress-note">Progress</p>
      </aside>

      <section class="weekly-detail-grid">
        ${renderSection(item, "Key Updates", "blue")}
        ${renderSection(item, "Operational Performance", "purple")}
        ${renderSection(item, "Project Status", "green")}
        ${renderSection(item, "Risks", "red")}
        ${renderSection(item, "Challenges", "orange")}
        ${renderSection(item, "Support Required", "green support-heading")}
      </section>

    </article>
  `;
}

function renderSection(item, sectionName, colorClass) {
  const section = (item.sections || []).find(
    s => clean(s.section).toLowerCase() === clean(sectionName).toLowerCase()
  );

  const sectionLinks = getLinksForSection(item.incharge, sectionName);
  const supportClass = sectionName === "Support Required" ? "support-section-highlight" : "";

  if (!section || !section.items.length) {
    return `
      <div class="weekly-section-new ${supportClass}">
        <h4 class="${colorClass}">${sectionName}</h4>
        <p class="muted">No update</p>
        ${renderSectionLinks(sectionLinks)}
      </div>
    `;
  }

  return `
    <div class="weekly-section-new ${supportClass}">
      <h4 class="${colorClass}">${escapeHtml(sectionName)}</h4>

      <ul>
        ${section.items.map(x => `
          <li>
            <div class="current-item">
              ${escapeHtml(x.item)}
            </div>

            <div class="item-meta-row">
              ${x.status ? `<span class="mini-status">${escapeHtml(x.status)}</span>` : ""}
              ${x.priority ? `<span class="priority-badge ${getPriorityClass(x.priority)}">${escapeHtml(x.priority)}</span>` : ""}
              ${x.due_date ? `<span class="due-date-badge ${getDueDateClass(x.due_date)}">📅 ${escapeHtml(formatDueDate(x.due_date))}</span>` : ""}
            </div>

            ${
              clean(x.last_week)
                ? `<div class="last-week-inline">
                    <strong>Last week:</strong>
                    ${escapeHtml(x.last_week)}
                   </div>`
                : ""
            }
          </li>
        `).join("")}
      </ul>

      ${renderSectionLinks(sectionLinks)}
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

function getProgressClass(progress) {
  const p = num(progress);

  if (p >= 80) return "progress-green";
  if (p >= 50) return "progress-amber";
  return "progress-red";
}

function getPriorityClass(priority) {
  const p = clean(priority).toLowerCase();

  if (p === "high") return "priority-high";
  if (p === "medium") return "priority-medium";
  if (p === "low") return "priority-low";

  return "priority-medium";
}

function formatDueDate(dateText) {
  const raw = clean(dateText);
  if (!raw) return "";

  const d = new Date(raw);
  if (isNaN(d)) return raw;

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
}

function getDueDateClass(dateText) {
  const d = new Date(clean(dateText));
  if (isNaN(d)) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "due-overdue";
  if (diffDays <= 3) return "due-soon";

  return "due-normal";
}

function getLinksForSection(incharge, sectionName) {
  const sectionKeywords = {
    "Key Updates": ["timeline", "calendar", "tracker", "internal"],
    "Operational Performance": ["budget", "data", "overview", "school wise", "outreach"],
    "Project Status": ["timeline", "tracker", "assignment", "lms", "documentation"],
    "Risks": ["risk", "external", "outreach", "curriculum"],
    "Challenges": ["space", "curriculum", "program"],
    "Support Required": ["mentor", "iit", "regional", "support"]
  };

  const keywords = sectionKeywords[sectionName] || [];

  return (weeklyData.links || [])
    .filter(row => clean(row.incharge).toLowerCase() === clean(incharge).toLowerCase())
    .filter(row => clean(row.link_url))
    .filter(row => {
      const title = clean(row.link_title).toLowerCase();
      return keywords.some(k => title.includes(k));
    })
    .slice(0, 3)
    .map(row => ({
      title: clean(row.link_title),
      url: clean(row.link_url)
    }));
}

function renderSectionLinks(links) {
  if (!links.length) return "";

  return `
    <div class="section-link-row">
      ${links.map(link => `
        <a class="section-link-pill"
           href="${escapeAttr(link.url)}"
           target="_blank"
           rel="noopener noreferrer">
          🔗 ${escapeHtml(link.title)}
        </a>
      `).join("")}
    </div>
  `;
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
