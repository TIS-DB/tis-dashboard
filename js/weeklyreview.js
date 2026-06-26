let weeklyData = {
  dashboard: [],
  links: []
};

const weeklyContainer = document.getElementById("weeklyContainer");
const updatedAt = document.getElementById("updatedAt");

document.addEventListener("DOMContentLoaded", loadWeeklyReview);

async function loadWeeklyReview() {
  try {
    const res = await fetch("data/weeklyreview.json?v=" + Date.now());

    if (!res.ok) throw new Error("weeklyreview.json not found");

    weeklyData = await res.json();

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

function renderSummary() {
  const grouped = groupDashboardRows(weeklyData.dashboard || []);

  document.getElementById("totalUnits").innerText = grouped.length;
  document.getElementById("totalRisks").innerText = grouped.filter(x => hasText(x.risks)).length;
  document.getElementById("totalChallenges").innerText = grouped.filter(x => hasText(x.challenges)).length;
  document.getElementById("totalSupport").innerText = grouped.filter(x => hasText(x.support_required)).length;

  updatedAt.innerText =
    "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderWeeklyReview() {
  const grouped = groupDashboardRows(weeklyData.dashboard || []);

  if (!grouped.length) {
    weeklyContainer.innerHTML = `<div class="empty">No weekly review data found</div>`;
    return;
  }

  weeklyContainer.innerHTML = grouped.map(item => renderReviewCard(item)).join("");
}

function groupDashboardRows(rows) {
  const grouped = [];
  let current = null;

  rows.forEach(row => {
    const incharge = clean(row.incharge);
    const srNo = clean(row["sr._no"]);

    if (incharge || srNo) {
      current = {
        sr_no: srNo,
        incharge: incharge || "Not Assigned",
        title: getBusinessTitle(incharge),
        operational_performance: [],
        project_status: [],
        risks: [],
        challenges: [],
        support_required: []
      };

      grouped.push(current);
    }

    if (!current) return;

    pushIfText(current.operational_performance, row.operational_performance);
    pushIfText(current.project_status, row.project_status);
    pushIfText(current.risks, row.risks);
    pushIfText(current.challenges, row.challenges);
    pushIfText(current.support_required, row.support_required);
  });

  return grouped;
}

function renderReviewCard(item) {
  const relatedLinks = getLinksForIncharge(item.incharge);
  const status = getStatus(item);

  return `
    <article class="weekly-card">

      <div class="weekly-card-head">
        <div>
          <div class="weekly-eyebrow">${escapeHtml(item.title)}</div>
          <h3>${escapeHtml(item.incharge)}</h3>
          ${item.sr_no ? `<p class="weekly-sr">Sr. No. ${escapeHtml(item.sr_no)}</p>` : ""}
        </div>

        <div class="weekly-head-right">
          <span class="weekly-status ${status.className}">${status.label}</span>
          <div class="weekly-avatar">${getInitials(item.incharge)}</div>
        </div>
      </div>

      <div class="weekly-two-column">
        <div>
          ${renderSection("Progress / Output", item.operational_performance, "blue")}
          ${renderSection("Current Project Status", item.project_status, "green")}
        </div>

        <div>
          ${renderSection("Risks", item.risks, "gold")}
          ${renderSection("Challenges", item.challenges, "gold")}
          ${renderSection("Support Required", item.support_required, "green")}
        </div>
      </div>

      ${renderLinks(relatedLinks)}

    </article>
  `;
}

function renderSection(title, values, colorClass) {
  if (!values || !values.length) return "";

  return `
    <div class="weekly-section">
      <h4 class="${colorClass}">${title}</h4>
      ${values.map(v => `<p>${escapeHtml(v)}</p>`).join("")}
    </div>
  `;
}

function renderLinks(links) {
  if (!links.length) return "";

  return `
    <div class="weekly-links">
      <h4>Reference Documents</h4>
      <div class="weekly-link-list">
        ${links.map(link => `
          <a class="weekly-link-pill"
             href="${escapeAttr(link.url)}"
             target="_blank"
             rel="noopener noreferrer">
             🔗 ${escapeHtml(link.title)}
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

function getLinksForIncharge(incharge) {
  const links = weeklyData.links || [];
  const result = [];

  let currentIncharge = "";

  links.forEach(row => {
    if (clean(row.incharge)) {
      currentIncharge = clean(row.incharge);
    }

    const title = clean(row.links);
    const url = clean(row.url || row.link || row.hyperlink);

    if (
      currentIncharge.toLowerCase() === clean(incharge).toLowerCase() &&
      title &&
      url
    ) {
      result.push({ title, url });
    }
  });

  return result;
}

function getBusinessTitle(incharge) {
  const links = weeklyData.links || [];
  let currentIncharge = "";

  for (const row of links) {
    if (clean(row.incharge)) {
      currentIncharge = clean(row.incharge);
    }

    if (
      currentIncharge.toLowerCase() === clean(incharge).toLowerCase() &&
      clean(row.team)
    ) {
      return clean(row.team);
    }
  }

  return "Business Unit";
}

function getStatus(item) {
  if (hasText(item.risks) || hasText(item.challenges)) {
    return { label: "Needs Attention", className: "status-watch" };
  }

  if (hasText(item.support_required)) {
    return { label: "Support Needed", className: "status-risk" };
  }

  return { label: "On Track", className: "status-complete" };
}

function pushIfText(arr, value) {
  const text = clean(value);
  if (text) arr.push(text);
}

function hasText(arr) {
  return Array.isArray(arr) && arr.some(x => clean(x));
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
