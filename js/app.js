let rawData = [];
let categoryChart;
let monthlyChart;

let state = {
  level: "category",
  selectedCategory: null,
  selectedCourse: null
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
});

async function loadData() {
  const res = await fetch("data/enrollments.json?v=" + Date.now());
  rawData = await res.json();
  render();
}

function refreshDashboard() {
  loadData();
}

function render() {
  renderKPI();
  renderSummary();
  renderMonthlyChart();
  //renderChart();
  renderBreadcrumb();
  renderList();
}

function fee(r) {
  return Number(r.course_fee || 0);
}

function typeOfStudent(r) {
  return String(r["new/existing"] || "").toLowerCase();
}

function newPercent(data) {
  if (!data.length) return 0;

  const newRows = data.filter(r => typeOfStudent(r).includes("new"));
  return (newRows.length / data.length) * 100;
}

function formatShortCurrency(value) {
  if (value >= 10000000) return "₹" + (value / 10000000).toFixed(2) + " Cr";
  if (value >= 100000) return "₹" + (value / 100000).toFixed(2) + " L";
  return "₹" + value.toLocaleString();
}

function getDateValue(r) {
  return r.enrolment_date || r.enrollment_date || r.date || r.created_at || "";
}

function getMonthLabel(dateText) {
  if (!dateText) return "Unknown";

  const d = new Date(dateText);

  if (isNaN(d)) return "Unknown";

  return d.toLocaleString("en-US", { month: "short" });
}

function renderKPI() {
  const totalRevenue = rawData.reduce((s, r) => s + fee(r), 0);
  const totalStudents = rawData.length;

  const newRows = rawData.filter(r => typeOfStudent(r).includes("new"));
  const existingRows = rawData.filter(r => typeOfStudent(r).includes("existing"));

  const newRevenue = newRows.reduce((s, r) => s + fee(r), 0);
  const existingRevenue = existingRows.reduce((s, r) => s + fee(r), 0);

  const avg = totalStudents ? totalRevenue / totalStudents : 0;
  const share = totalStudents ? (newRows.length / totalStudents) * 100 : 0;

  document.getElementById("totalRevenue").innerText = formatShortCurrency(totalRevenue);
  document.getElementById("totalStudents").innerText = totalStudents;
  document.getElementById("avgRevenue").innerText = formatShortCurrency(avg);
  document.getElementById("existingRevenue").innerText = formatShortCurrency(existingRevenue);
  document.getElementById("newRevenue").innerText = formatShortCurrency(newRevenue);
  document.getElementById("existingCount").innerText = existingRows.length;
  document.getElementById("newCount").innerText = newRows.length;
  document.getElementById("newShare").innerText = share.toFixed(1) + "%";
  document.getElementById("newShareText").innerText =
    `${newRows.length} of ${totalStudents} students`;
}

function renderSummary() {
  const totalRevenue = rawData.reduce((s, r) => s + fee(r), 0);
  const totalStudents = rawData.length;

  document.getElementById("summaryText").innerText =
    `${totalStudents} enrolments · ${formatShortCurrency(totalRevenue)} revenue · FY27`;

  const now = new Date();
  document.getElementById("updatedAt").innerText =
    "Updated " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMonthlyChart() {
  const monthOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  const monthMap = {};
  monthOrder.forEach(m => {
    monthMap[m] = { existing: 0, new: 0 };
  });

  rawData.forEach(r => {
    const month = getMonthLabel(getDateValue(r));
    if (!monthMap[month]) return;

    if (typeOfStudent(r).includes("existing")) {
      monthMap[month].existing++;
    } else if (typeOfStudent(r).includes("new")) {
      monthMap[month].new++;
    }
  });

  const existingData = monthOrder.map(m => monthMap[m].existing);
  const newData = monthOrder.map(m => monthMap[m].new);

  const ctx = document.getElementById("monthlyChart");

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthOrder,
      datasets: [
        {
          label: "Existing",
          data: existingData,
          backgroundColor: "#368ddb",
          borderRadius: 5,
          stack: "monthly"
        },
        {
          label: "New",
          data: newData,
          backgroundColor: "#1b9d7f",
          borderRadius: 5,
          stack: "monthly"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 12 }
          }
        }
      },

      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { size: 12 },
            maxRotation: 0,
            minRotation: 0
          }
        },

        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: "#e5e5e5" },
          ticks: {
            precision: 0,
            font: { size: 12 }
          }
        }
      }
    }
  });
}

function renderChart() {
  const grouped = groupByCategory(rawData);

  const labels = grouped.map(r => r.category);

  const existingData = grouped.map(g =>
    rawData
      .filter(r => r.course_category === g.category && typeOfStudent(r).includes("existing"))
      .reduce((s, r) => s + fee(r), 0)
  );

  const newData = grouped.map(g =>
    rawData
      .filter(r => r.course_category === g.category && typeOfStudent(r).includes("new"))
      .reduce((s, r) => s + fee(r), 0)
  );

  const ctx = document.getElementById("categoryChart");

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Existing",
          data: existingData,
          backgroundColor: "#368ddb",
          borderRadius: 5
        },
        {
          label: "New",
          data: newData,
          backgroundColor: "#1b9d7f",
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 12 }
          }
        }
      },

      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false
          }
        },

        y: {
          beginAtZero: true,
          grid: { color: "#e5e5e5" },
          ticks: {
            font: { size: 12 },
            callback: value => formatShortCurrency(value)
          }
        }
      }
    }
  });
}

function renderBreadcrumb() {
  const b = document.getElementById("breadcrumb");

  if (state.level === "category") {
    b.innerText = "Tap category → course → students";
  }

  if (state.level === "course") {
    b.innerHTML = `<span onclick="goHome()">Home</span> → ${state.selectedCategory}`;
  }

  if (state.level === "student") {
    b.innerHTML =
      `<span onclick="goHome()">Home</span> → 
       <span onclick="backToCourses()">${state.selectedCategory}</span> → 
       ${state.selectedCourse}`;
  }
}

function renderList() {
  const box = document.getElementById("listContainer");
  box.innerHTML = "";

  if (state.level === "category") {
    const grouped = groupByCategory(rawData);

    grouped.forEach(r => {
      const categoryRows = rawData.filter(x => x.course_category === r.category);
      const newPct = newPercent(categoryRows).toFixed(0);

      box.innerHTML += `
        <div class="list-card" onclick="drillToCourse('${encodeURIComponent(r.category)}')">
          <div class="icon">▶</div>
          <div class="title">${r.category}</div>
          <div>
            <div class="amount">${formatShortCurrency(r.revenue)}</div>
            <div class="students">${r.count} students · ${newPct}% new</div>
          </div>
        </div>`;
    });

    box.innerHTML += grandTotalCard(rawData);
  }

  if (state.level === "course") {
    const filtered = rawData.filter(r => r.course_category === state.selectedCategory);
    const grouped = groupByCourse(filtered);

    grouped.forEach(r => {
      const courseRows = filtered.filter(x => x.course_name === r.course);
      const newPct = newPercent(courseRows).toFixed(0);

      box.innerHTML += `
        <div class="list-card" onclick="drillToStudent('${encodeURIComponent(r.course)}')">
          <div class="icon">▶</div>
          <div class="title">${r.course}</div>
          <div>
            <div class="amount">${formatShortCurrency(r.revenue)}</div>
            <div class="students">${r.count} students · ${newPct}% new</div>
          </div>
        </div>`;
    });
  }

  if (state.level === "student") {
    const filtered = rawData.filter(r => r.course_name === state.selectedCourse);

    filtered.forEach(r => {
      const initials = getInitials(r.student_name);

      box.innerHTML += `
        <div class="student-row">
          <div class="avatar">${initials}</div>
          <div>
            <div class="title">${r.student_name}</div>
            <div class="students">${r.enrolment_date || ""}</div>
          </div>
          <div>
            <div class="amount">₹${fee(r).toLocaleString()}</div>
            <div class="badge">${r["new/existing"] || ""}</div>
          </div>
        </div>`;
    });
  }
}

function grandTotalCard(data) {
  const totalRevenue = data.reduce((s, r) => s + fee(r), 0);
  const newPct = newPercent(data).toFixed(0);

  return `
    <div class="list-card">
      <div></div>
      <div class="title">Grand Total</div>
      <div>
        <div class="amount">₹${totalRevenue.toLocaleString()}</div>
        <div class="students">${data.length} students · ${newPct}% new</div>
      </div>
    </div>`;
}

function groupByCategory(data) {
  const map = {};

  data.forEach(r => {
    const cat = r.course_category || "Uncategorised";

    if (!map[cat]) {
      map[cat] = { category: cat, count: 0, revenue: 0 };
    }

    map[cat].count++;
    map[cat].revenue += fee(r);
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

function groupByCourse(data) {
  const map = {};

  data.forEach(r => {
    const course = r.course_name || "Unnamed Course";

    if (!map[course]) {
      map[course] = { course, count: 0, revenue: 0 };
    }

    map[course].count++;
    map[course].revenue += fee(r);
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map(x => x[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function drillToCourse(category) {
  state.level = "course";
  state.selectedCategory = decodeURIComponent(category);
  render();
}

function drillToStudent(course) {
  state.level = "student";
  state.selectedCourse = decodeURIComponent(course);
  render();
}

function backToCourses() {
  state.level = "course";
  state.selectedCourse = null;
  render();
}

function goHome() {
  state.level = "category";
  state.selectedCategory = null;
  state.selectedCourse = null;
  render();
}

function goToStudents() {
    window.location.href = "student.html";
}

window.drillToCourse = drillToCourse;
window.drillToStudent = drillToStudent;
window.goHome = goHome;
window.backToCourses = backToCourses;
window.refreshDashboard = refreshDashboard;
