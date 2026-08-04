let rawData = [];
let categoryChart;
let monthlyChart;

let state = {
  level: "category",
  selectedCategory: null,
  selectedCourse: null
};

document.addEventListener("DOMContentLoaded", loadData);

/* =====================================================
   LOAD DATA
===================================================== */

async function loadData() {
  try {
    const response = await fetch(
      "data/enrollments.json?v=" + Date.now()
    );

    if (!response.ok) {
      throw new Error("Unable to load enrollments.json");
    }

    rawData = await response.json();

    if (!Array.isArray(rawData)) {
      throw new Error("enrollments.json must contain an array");
    }

    render();
  } catch (error) {
    console.error("Error loading enrolment data:", error);

    const listContainer =
      document.getElementById("listContainer");

    if (listContainer) {
      listContainer.innerHTML = `
        <div class="empty">
          Unable to load enrolment data.
        </div>
      `;
    }
  }
}

function refreshDashboard() {
  loadData();
}

/* =====================================================
   MAIN RENDER
===================================================== */

function render() {
  renderKPI();
  renderSummary();
  renderMonthlyChart();
  renderBreadcrumb();
  renderList();

  /*
  Uncomment this only if your HTML contains:
  <canvas id="categoryChart"></canvas>
  */
  // renderChart();
}

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function fee(row) {
  const value = String(row.course_fee ?? "0")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  return Number(value) || 0;
}

function typeOfStudent(row) {
  return String(row["new/existing"] || "")
    .trim()
    .toLowerCase();
}

function newPercent(data) {
  if (!data.length) return 0;

  const newRows = data.filter(row =>
    typeOfStudent(row).includes("new")
  );

  return (newRows.length / data.length) * 100;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatShortCurrency(value) {
  const amount = Number(value) || 0;

  if (amount >= 10000000) {
    return "₹" + (amount / 10000000).toFixed(2) + " Cr";
  }

  if (amount >= 100000) {
    return "₹" + (amount / 100000).toFixed(2) + " L";
  }

  if (amount >= 1000) {
    return "₹" + (amount / 1000).toFixed(1) + " K";
  }

  return formatCurrency(amount);
}

function getDateValue(row) {
  return (
    row.enrolment_date ||
    row.enrollment_date ||
    row.date ||
    row.created_at ||
    ""
  );
}

function getMonthLabel(dateText) {
  if (!dateText) return "Unknown";

  /*
    Handles dates such as:
    01-Aug-2026
    2026-08-01
  */

  const parts = String(dateText).split("-");

  if (
    parts.length === 3 &&
    parts[0].length === 2 &&
    isNaN(parts[1])
  ) {
    return parts[1].substring(0, 3);
  }

  const date = new Date(dateText);

  if (isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-US", {
    month: "short"
  });
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.innerText = value;
  }
}

/* =====================================================
   KPI CARDS
===================================================== */

function renderKPI() {
  const totalRevenue = rawData.reduce(
    (sum, row) => sum + fee(row),
    0
  );

  const totalStudents = rawData.length;

  const newRows = rawData.filter(row =>
    typeOfStudent(row).includes("new")
  );

  const existingRows = rawData.filter(row =>
    typeOfStudent(row).includes("existing")
  );

  const newRevenue = newRows.reduce(
    (sum, row) => sum + fee(row),
    0
  );

  const existingRevenue = existingRows.reduce(
    (sum, row) => sum + fee(row),
    0
  );

  const averageRevenue =
    totalStudents > 0
      ? totalRevenue / totalStudents
      : 0;

  const newStudentShare =
    totalStudents > 0
      ? (newRows.length / totalStudents) * 100
      : 0;

  setText(
    "totalRevenue",
    formatShortCurrency(totalRevenue)
  );

  setText(
    "totalStudents",
    totalStudents.toLocaleString("en-IN")
  );

  setText(
    "avgRevenue",
    formatShortCurrency(averageRevenue)
  );

  setText(
    "existingRevenue",
    formatShortCurrency(existingRevenue)
  );

  setText(
    "newRevenue",
    formatShortCurrency(newRevenue)
  );

  setText(
    "existingCount",
    existingRows.length.toLocaleString("en-IN")
  );

  setText(
    "newCount",
    newRows.length.toLocaleString("en-IN")
  );

  setText(
    "newShare",
    newStudentShare.toFixed(1) + "%"
  );

  setText(
    "newShareText",
    `${newRows.length} of ${totalStudents} enrolments`
  );
}

/* =====================================================
   DASHBOARD SUMMARY
===================================================== */

function renderSummary() {
  const totalRevenue = rawData.reduce(
    (sum, row) => sum + fee(row),
    0
  );

  const totalStudents = rawData.length;

  setText(
    "summaryText",
    `${totalStudents.toLocaleString("en-IN")} enrolments · ` +
    `${formatShortCurrency(totalRevenue)} revenue · FY27`
  );

  const now = new Date();

  setText(
    "updatedAt",
    "Updated " +
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
  );
}

/* =====================================================
   MONTHLY ENROLMENT CHART
===================================================== */

function renderMonthlyChart() {
  const chartCanvas =
    document.getElementById("monthlyChart");

  if (!chartCanvas || typeof Chart === "undefined") {
    return;
  }

  const monthOrder = [
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar"
  ];

  const monthMap = {};

  monthOrder.forEach(month => {
    monthMap[month] = {
      existing: 0,
      new: 0
    };
  });

  rawData.forEach(row => {
    const month = getMonthLabel(getDateValue(row));

    if (!monthMap[month]) {
      return;
    }

    if (typeOfStudent(row).includes("existing")) {
      monthMap[month].existing++;
    } else if (typeOfStudent(row).includes("new")) {
      monthMap[month].new++;
    }
  });

  const existingData = monthOrder.map(
    month => monthMap[month].existing
  );

  const newData = monthOrder.map(
    month => monthMap[month].new
  );

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(chartCanvas, {
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
        tooltip: {
          callbacks: {
            label(context) {
              return (
                context.dataset.label +
                ": " +
                context.raw +
                " students"
              );
            }
          }
        },

        legend: {
          position: "top",
          align: "end",

          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: {
              size: 12
            }
          }
        }
      },

      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          },

          ticks: {
            font: {
              size: 12
            },
            maxRotation: 0,
            minRotation: 0
          }
        },

        y: {
          stacked: true,
          beginAtZero: true,

          grid: {
            color: "#e5e5e5"
          },

          ticks: {
            precision: 0,
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

/* =====================================================
   CATEGORY REVENUE CHART
===================================================== */

function renderChart() {
  const chartCanvas =
    document.getElementById("categoryChart");

  if (!chartCanvas || typeof Chart === "undefined") {
    return;
  }

  const grouped = groupByCategory(rawData);

  const labels = grouped.map(
    item => item.category
  );

  const existingData = grouped.map(group =>
    rawData
      .filter(row =>
        row.course_category === group.category &&
        typeOfStudent(row).includes("existing")
      )
      .reduce(
        (sum, row) => sum + fee(row),
        0
      )
  );

  const newData = grouped.map(group =>
    rawData
      .filter(row =>
        row.course_category === group.category &&
        typeOfStudent(row).includes("new")
      )
      .reduce(
        (sum, row) => sum + fee(row),
        0
      )
  );

  if (categoryChart) {
    categoryChart.destroy();
  }

  categoryChart = new Chart(chartCanvas, {
    type: "bar",

    data: {
      labels: labels,

      datasets: [
        {
          label: "Existing Revenue",
          data: existingData,
          backgroundColor: "#368ddb",
          borderRadius: 5
        },
        {
          label: "New Revenue",
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
        tooltip: {
          callbacks: {
            label(context) {
              return (
                context.dataset.label +
                ": " +
                formatCurrency(context.raw)
              );
            }
          }
        },

        legend: {
          position: "top",
          align: "end",

          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: {
              size: 12
            }
          }
        }
      },

      scales: {
        x: {
          grid: {
            display: false
          },

          ticks: {
            font: {
              size: 11
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false
          }
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "#e5e5e5"
          },

          ticks: {
            font: {
              size: 12
            },

            callback(value) {
              return formatShortCurrency(value);
            }
          }
        }
      }
    }
  });
}

/* =====================================================
   BREADCRUMB
===================================================== */

function renderBreadcrumb() {
  const breadcrumb =
    document.getElementById("breadcrumb");

  if (!breadcrumb) {
    return;
  }

  if (state.level === "category") {
    breadcrumb.innerText =
      "Tap category → course → students";
  }

  if (state.level === "course") {
    breadcrumb.innerHTML = `
      <span onclick="goHome()">Home</span>
      →
      ${state.selectedCategory}
    `;
  }

  if (state.level === "student") {
    breadcrumb.innerHTML = `
      <span onclick="goHome()">Home</span>
      →
      <span onclick="backToCourses()">
        ${state.selectedCategory}
      </span>
      →
      ${state.selectedCourse}
    `;
  }
}

/* =====================================================
   CATEGORY, COURSE AND STUDENT LIST
===================================================== */

function renderList() {
  const box = document.getElementById("listContainer");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  /* -----------------------------
     CATEGORY LEVEL
  ----------------------------- */

  if (state.level === "category") {
    const grouped = groupByCategory(rawData);

    grouped.forEach(item => {
      const categoryRows = rawData.filter(
        row =>
          (row.course_category || "Uncategorised") ===
          item.category
      );

      const newPct =
        newPercent(categoryRows).toFixed(0);

      box.innerHTML += `
        <div
          class="list-card"
          onclick="drillToCourse(
            '${encodeURIComponent(item.category)}'
          )"
        >
          <div class="icon">▶</div>

          <div class="title">
            ${item.category}
          </div>

          <div>
            <div class="amount">
              ${formatShortCurrency(item.revenue)}
            </div>

            <div class="students">
              ${item.count} students · ${newPct}% new
            </div>
          </div>
        </div>
      `;
    });

    box.innerHTML += grandTotalCard(rawData);
  }

  /* -----------------------------
     COURSE LEVEL
  ----------------------------- */

  if (state.level === "course") {
    const filtered = rawData.filter(
      row =>
        (row.course_category || "Uncategorised") ===
        state.selectedCategory
    );

    const grouped = groupByCourse(filtered);

    grouped.forEach(item => {
      const courseRows = filtered.filter(
        row =>
          (row.course_name || "Unnamed Course") ===
          item.course
      );

      const newPct =
        newPercent(courseRows).toFixed(0);

      box.innerHTML += `
        <div
          class="list-card"
          onclick="drillToStudent(
            '${encodeURIComponent(item.course)}'
          )"
        >
          <div class="icon">▶</div>

          <div class="title">
            ${item.course}
          </div>

          <div>
            <div class="amount">
              ${formatShortCurrency(item.revenue)}
            </div>

            <div class="students">
              ${item.count} students · ${newPct}% new
            </div>
          </div>
        </div>
      `;
    });

    box.innerHTML += grandTotalCard(filtered);
  }

  /* -----------------------------
     STUDENT LEVEL
  ----------------------------- */

  if (state.level === "student") {
    const filtered = rawData.filter(
      row =>
        (row.course_name || "Unnamed Course") ===
          state.selectedCourse &&
        (row.course_category || "Uncategorised") ===
          state.selectedCategory
    );

    filtered.forEach(row => {
      const initials =
        getInitials(row.student_name);

      box.innerHTML += `
        <div class="student-row">

          <div class="avatar">
            ${initials}
          </div>

          <div>
            <div class="title">
              ${row.student_name || "Unnamed Student"}
            </div>

            <div class="students">
              ${row.enrolment_date || ""}
            </div>
          </div>

          <div>
            <div class="amount">
              ${formatCurrency(fee(row))}
            </div>

            <div class="badge">
              ${row["new/existing"] || ""}
            </div>
          </div>

        </div>
      `;
    });

    box.innerHTML += grandTotalCard(filtered);
  }
}

/* =====================================================
   GRAND TOTAL CARD
===================================================== */

function grandTotalCard(data) {
  const totalRevenue = data.reduce(
    (sum, row) => sum + fee(row),
    0
  );

  const newPct =
    newPercent(data).toFixed(0);

  return `
    <div class="list-card grand-total-card">

      <div></div>

      <div class="title">
        Grand Total
      </div>

      <div>
        <div class="amount">
          ${formatShortCurrency(totalRevenue)}
        </div>

        <div class="students">
          ${data.length} students · ${newPct}% new
        </div>
      </div>

    </div>
  `;
}

/* =====================================================
   GROUP DATA BY CATEGORY
===================================================== */

function groupByCategory(data) {
  const map = {};

  data.forEach(row => {
    const category =
      row.course_category || "Uncategorised";

    if (!map[category]) {
      map[category] = {
        category: category,
        count: 0,
        revenue: 0
      };
    }

    map[category].count++;
    map[category].revenue += fee(row);
  });

  return Object.values(map).sort(
    (a, b) => b.revenue - a.revenue
  );
}

/* =====================================================
   GROUP DATA BY COURSE
===================================================== */

function groupByCourse(data) {
  const map = {};

  data.forEach(row => {
    const course =
      row.course_name || "Unnamed Course";

    if (!map[course]) {
      map[course] = {
        course: course,
        count: 0,
        revenue: 0
      };
    }

    map[course].count++;
    map[course].revenue += fee(row);
  });

  return Object.values(map).sort(
    (a, b) => b.revenue - a.revenue
  );
}

/* =====================================================
   STUDENT INITIALS
===================================================== */

function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

/* =====================================================
   DRILL-DOWN NAVIGATION
===================================================== */

function drillToCourse(category) {
  state.level = "course";
  state.selectedCategory =
    decodeURIComponent(category);
  state.selectedCourse = null;

  render();
}

function drillToStudent(course) {
  state.level = "student";
  state.selectedCourse =
    decodeURIComponent(course);

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

/* =====================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
===================================================== */

window.drillToCourse = drillToCourse;
window.drillToStudent = drillToStudent;
window.goHome = goHome;
window.backToCourses = backToCourses;
window.refreshDashboard = refreshDashboard;
window.goToStudents = goToStudents;
