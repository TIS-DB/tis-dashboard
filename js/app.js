let allData = [];
let rawData = [];

let selectedFinancialYear = "";

let monthlyChart;
let monthlyRevenueChart;
let categoryChart;

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

let state = {
  level: "category",
  selectedCategory: null,
  selectedCourse: null
};

document.addEventListener(
  "DOMContentLoaded",
  loadData
);

/* =====================================================
   LOAD DATA
===================================================== */

async function loadData() {
  try {
    const response = await fetch(
      "data/enrollments.json?v=" +
      Date.now()
    );

    if (!response.ok) {
      throw new Error(
        "Unable to load enrollments.json"
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "enrollments.json must contain an array"
      );
    }

    allData = data;

    renderFinancialYearDropdown();
    applyFinancialYearFilter();
    render();

  } catch (error) {
    console.error(
      "Error loading enrolment data:",
      error
    );

    const listContainer =
      document.getElementById(
        "listContainer"
      );

    if (listContainer) {
      listContainer.innerHTML = `
        <div class="empty">
          Unable to load enrolment data.
          Please check enrollments.json.
        </div>
      `;
    }
  }
}

function refreshDashboard() {
  loadData();
}

/* =====================================================
   FINANCIAL YEAR FILTER
===================================================== */

function normaliseFinancialYear(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getFinancialYearNumber(value) {
  const match =
    String(value || "").match(/\d+/);

  return match
    ? Number(match[0])
    : 0;
}

function getUniqueFinancialYears() {
  const years = allData
    .map(row =>
      normaliseFinancialYear(
        row.financial_year
      )
    )
    .filter(Boolean);

  return [...new Set(years)].sort(
    (a, b) =>
      getFinancialYearNumber(b) -
      getFinancialYearNumber(a)
  );
}

function renderFinancialYearDropdown() {
  const dropdown =
    document.getElementById(
      "financialYearSelect"
    );

  if (!dropdown) {
    return;
  }

  const financialYears =
    getUniqueFinancialYears();

  if (!financialYears.length) {
    selectedFinancialYear = "";

    dropdown.innerHTML = `
      <option value="">
        No financial year
      </option>
    `;

    return;
  }

  /*
    Keep the selected year after refreshing.
    Otherwise use the latest available year.
  */

  if (
    !selectedFinancialYear ||
    !financialYears.includes(
      selectedFinancialYear
    )
  ) {
    selectedFinancialYear =
      financialYears[0];
  }

  dropdown.innerHTML =
    financialYears
      .map(year => `
        <option
          value="${year}"
          ${
            year === selectedFinancialYear
              ? "selected"
              : ""
          }
        >
          ${year}
        </option>
      `)
      .join("");
}

function applyFinancialYearFilter() {
  rawData = allData.filter(row => {
    const rowYear =
      normaliseFinancialYear(
        row.financial_year
      );

    return (
      rowYear === selectedFinancialYear
    );
  });

  state.level = "category";
  state.selectedCategory = null;
  state.selectedCourse = null;
}

function changeFinancialYear() {
  const dropdown =
    document.getElementById(
      "financialYearSelect"
    );

  if (!dropdown) {
    return;
  }

  selectedFinancialYear =
    normaliseFinancialYear(
      dropdown.value
    );

  applyFinancialYearFilter();
  render();
}

/* =====================================================
   MAIN RENDER
===================================================== */

function render() {
  renderKPI();
  renderSummary();
  renderMonthlyChart();
  renderMonthlyRevenueChart();
  renderCategoryRevenueChart();
  renderBreadcrumb();
  renderList();
}

/* =====================================================
   GENERAL HELPERS
===================================================== */

function fee(row) {
  const value = String(
    row.course_fee ?? "0"
  )
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  return Number(value) || 0;
}

function typeOfStudent(row) {
  return String(
    row["new/existing"] || ""
  )
    .trim()
    .toLowerCase();
}

function isNewStudent(row) {
  return typeOfStudent(row)
    .includes("new");
}

function isExistingStudent(row) {
  return typeOfStudent(row)
    .includes("existing");
}

function newPercent(data) {
  if (!data.length) {
    return 0;
  }

  const newRows =
    data.filter(isNewStudent);

  return (
    newRows.length /
    data.length
  ) * 100;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }
  ).format(Number(value) || 0);
}

function formatShortCurrency(value) {
  const amount =
    Number(value) || 0;

  if (amount >= 10000000) {
    return (
      "₹" +
      (amount / 10000000)
        .toFixed(2) +
      " Cr"
    );
  }

  if (amount >= 100000) {
    return (
      "₹" +
      (amount / 100000)
        .toFixed(2) +
      " L"
    );
  }

  if (amount >= 1000) {
    return (
      "₹" +
      (amount / 1000)
        .toFixed(1) +
      " K"
    );
  }

  return formatCurrency(amount);
}

function setText(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.innerText = value;
  }
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =====================================================
   DATE AND MONTH HANDLING
===================================================== */

function getMonthLabel(dateText) {
  if (!dateText) {
    return "Unknown";
  }

  const value =
    String(dateText).trim();

  /*
    Format: 03-Aug-2026
  */

  const dayMonthYear =
    value.match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/
    );

  if (dayMonthYear) {
    const month =
      dayMonthYear[2]
        .substring(0, 3)
        .toLowerCase();

    const matchedMonth =
      monthOrder.find(
        item =>
          item.toLowerCase() === month
      );

    return matchedMonth || "Unknown";
  }

  /*
    Format: 2026-08-03
  */

  const yearMonthDay =
    value.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

  if (yearMonthDay) {
    const monthNumber =
      Number(yearMonthDay[2]);

    const calendarMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];

    return (
      calendarMonths[
        monthNumber - 1
      ] || "Unknown"
    );
  }

  const date =
    new Date(value);

  if (isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short"
    }
  );
}

/* =====================================================
   KPI CARDS
===================================================== */

function renderKPI() {
  const totalEnrolments =
    rawData.length;

  const newRows =
    rawData.filter(isNewStudent);

  const existingRows =
    rawData.filter(
      isExistingStudent
    );

  const totalRevenue =
    rawData.reduce(
      (sum, row) =>
        sum + fee(row),
      0
    );

  const newRevenue =
    newRows.reduce(
      (sum, row) =>
        sum + fee(row),
      0
    );

  const existingRevenue =
    existingRows.reduce(
      (sum, row) =>
        sum + fee(row),
      0
    );

  const averageRevenue =
    totalEnrolments
      ? totalRevenue /
        totalEnrolments
      : 0;

  const newStudentShare =
    totalEnrolments
      ? (
          newRows.length /
          totalEnrolments
        ) * 100
      : 0;

  setText(
    "totalStudents",
    totalEnrolments
      .toLocaleString("en-IN")
  );

  setText(
    "existingCount",
    existingRows.length
      .toLocaleString("en-IN")
  );

  setText(
    "newCount",
    newRows.length
      .toLocaleString("en-IN")
  );

  setText(
    "totalRevenue",
    formatShortCurrency(
      totalRevenue
    )
  );

  setText(
    "existingRevenue",
    formatShortCurrency(
      existingRevenue
    )
  );

  setText(
    "newRevenue",
    formatShortCurrency(
      newRevenue
    )
  );

  setText(
    "avgRevenue",
    formatShortCurrency(
      averageRevenue
    )
  );

  setText(
    "newShare",
    newStudentShare
      .toFixed(1) + "%"
  );

  setText(
    "newShareText",
    `${newRows.length} of ` +
    `${totalEnrolments} enrolments`
  );
}

/* =====================================================
   HEADER SUMMARY
===================================================== */

function renderSummary() {
  const totalRevenue =
    rawData.reduce(
      (sum, row) =>
        sum + fee(row),
      0
    );

  const yearText =
    selectedFinancialYear ||
    "Financial Year";

  setText(
    "summaryText",
    `${rawData.length.toLocaleString("en-IN")} enrolments · ` +
    `${formatShortCurrency(totalRevenue)} revenue · ` +
    `${yearText}`
  );

  const now = new Date();

  setText(
    "updatedAt",
    "Updated " +
      now.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )
  );
}

/* =====================================================
   MONTHLY DATA
===================================================== */

function getMonthlyData() {
  const monthMap = {};

  monthOrder.forEach(month => {
    monthMap[month] = {
      existingCount: 0,
      newCount: 0,
      existingRevenue: 0,
      newRevenue: 0
    };
  });

  rawData.forEach(row => {
    const month =
      getMonthLabel(
        getDateValue(row)
      );

    if (!monthMap[month]) {
      return;
    }

    if (isExistingStudent(row)) {
      monthMap[month]
        .existingCount++;

      monthMap[month]
        .existingRevenue +=
        fee(row);
    }

    if (isNewStudent(row)) {
      monthMap[month]
        .newCount++;

      monthMap[month]
        .newRevenue +=
        fee(row);
    }
  });

  return monthMap;
}

/* =====================================================
   MONTHLY ENROLMENT CHART
===================================================== */

function renderMonthlyChart() {
  const canvas =
    document.getElementById(
      "monthlyChart"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  const monthMap =
    getMonthlyData();

  const existingData =
    monthOrder.map(
      month =>
        monthMap[month]
          .existingCount
    );

  const newData =
    monthOrder.map(
      month =>
        monthMap[month]
          .newCount
    );

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart =
    new Chart(canvas, {
      type: "bar",

      data: {
        labels: monthOrder,

        datasets: [
          {
            label: "Existing",
            data: existingData,
            backgroundColor:
              "#368ddb",
            borderRadius: 5,
            stack:
              "monthlyEnrolments"
          },
          {
            label: "New",
            data: newData,
            backgroundColor:
              "#1b9d7f",
            borderRadius: 5,
            stack:
              "monthlyEnrolments"
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: "index",
          intersect: false
        },

        plugins: {
          legend: {
            position: "top",
            align: "end",

            labels: {
              boxWidth: 12,
              boxHeight: 12
            }
          },

          tooltip: {
            callbacks: {
              label(context) {
                return (
                  context.dataset
                    .label +
                  ": " +
                  context.raw +
                  " enrolments"
                );
              },

              footer(items) {
                const total =
                  items.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.raw || 0
                      ),
                    0
                  );

                return (
                  "Total: " + total
                );
              }
            }
          }
        },

        scales: {
          x: {
            stacked: true,

            grid: {
              display: false
            }
          },

          y: {
            stacked: true,
            beginAtZero: true,

            grid: {
              color: "#e5e5e5"
            },

            ticks: {
              precision: 0
            },

            title: {
              display: true,
              text:
                "Number of enrolments"
            }
          }
        }
      }
    });
}

/* =====================================================
   MONTHLY REVENUE CHART
===================================================== */

function renderMonthlyRevenueChart() {
  const canvas =
    document.getElementById(
      "monthlyRevenueChart"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  const monthMap =
    getMonthlyData();

  const existingRevenueData =
    monthOrder.map(
      month =>
        monthMap[month]
          .existingRevenue
    );

  const newRevenueData =
    monthOrder.map(
      month =>
        monthMap[month]
          .newRevenue
    );

  if (monthlyRevenueChart) {
    monthlyRevenueChart.destroy();
  }

  monthlyRevenueChart =
    new Chart(canvas, {
      type: "bar",

      data: {
        labels: monthOrder,

        datasets: [
          {
            label:
              "Existing Revenue",
            data:
              existingRevenueData,
            backgroundColor:
              "#368ddb",
            borderRadius: 5,
            stack:
              "monthlyRevenue"
          },
          {
            label:
              "New Revenue",
            data:
              newRevenueData,
            backgroundColor:
              "#1b9d7f",
            borderRadius: 5,
            stack:
              "monthlyRevenue"
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: "index",
          intersect: false
        },

        plugins: {
          legend: {
            position: "top",
            align: "end",

            labels: {
              boxWidth: 12,
              boxHeight: 12
            }
          },

          tooltip: {
            callbacks: {
              label(context) {
                return (
                  context.dataset
                    .label +
                  ": " +
                  formatCurrency(
                    context.raw
                  )
                );
              },

              footer(items) {
                const total =
                  items.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.raw || 0
                      ),
                    0
                  );

                return (
                  "Total: " +
                  formatCurrency(
                    total
                  )
                );
              }
            }
          }
        },

        scales: {
          x: {
            stacked: true,

            grid: {
              display: false
            }
          },

          y: {
            stacked: true,
            beginAtZero: true,

            grid: {
              color: "#e5e5e5"
            },

            ticks: {
              callback(value) {
                return (
                  formatShortCurrency(
                    value
                  )
                );
              }
            },

            title: {
              display: true,
              text: "Revenue"
            }
          }
        }
      }
    });
}

/* =====================================================
   CATEGORY REVENUE CHART
===================================================== */

function renderCategoryRevenueChart() {
  const canvas =
    document.getElementById(
      "categoryChart"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  const grouped =
    groupByCategory(rawData);

  const labels =
    grouped.map(
      item => item.category
    );

  const existingRevenueData =
    grouped.map(group => {
      return rawData
        .filter(row => {
          const category =
            row.course_category ||
            "Uncategorised";

          return (
            category ===
              group.category &&
            isExistingStudent(row)
          );
        })
        .reduce(
          (sum, row) =>
            sum + fee(row),
          0
        );
    });

  const newRevenueData =
    grouped.map(group => {
      return rawData
        .filter(row => {
          const category =
            row.course_category ||
            "Uncategorised";

          return (
            category ===
              group.category &&
            isNewStudent(row)
          );
        })
        .reduce(
          (sum, row) =>
            sum + fee(row),
          0
        );
    });

  if (categoryChart) {
    categoryChart.destroy();
  }

  categoryChart =
    new Chart(canvas, {
      type: "bar",

      data: {
        labels: labels,

        datasets: [
          {
            label:
              "Existing Revenue",
            data:
              existingRevenueData,
            backgroundColor:
              "#368ddb",
            borderRadius: 5,
            stack:
              "categoryRevenue"
          },
          {
            label:
              "New Revenue",
            data:
              newRevenueData,
            backgroundColor:
              "#1b9d7f",
            borderRadius: 5,
            stack:
              "categoryRevenue"
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: "index",
          intersect: false
        },

        plugins: {
          legend: {
            position: "top",
            align: "end",

            labels: {
              boxWidth: 12,
              boxHeight: 12
            }
          },

          tooltip: {
            callbacks: {
              label(context) {
                return (
                  context.dataset
                    .label +
                  ": " +
                  formatCurrency(
                    context.raw
                  )
                );
              },

              footer(items) {
                const total =
                  items.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.raw || 0
                      ),
                    0
                  );

                return (
                  "Total: " +
                  formatCurrency(
                    total
                  )
                );
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
              autoSkip: false,
              maxRotation: 30,
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
              callback(value) {
                return (
                  formatShortCurrency(
                    value
                  )
                );
              }
            },

            title: {
              display: true,
              text: "Revenue"
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
    document.getElementById(
      "breadcrumb"
    );

  if (!breadcrumb) {
    return;
  }

  if (state.level === "category") {
    breadcrumb.innerText =
      `${selectedFinancialYear} · ` +
      "Tap category → course → students";
  }

  if (state.level === "course") {
    breadcrumb.innerHTML = `
      <span onclick="goHome()">
        ${escapeHtml(
          selectedFinancialYear
        )}
      </span>
      →
      ${escapeHtml(
        state.selectedCategory
      )}
    `;
  }

  if (state.level === "student") {
    breadcrumb.innerHTML = `
      <span onclick="goHome()">
        ${escapeHtml(
          selectedFinancialYear
        )}
      </span>
      →
      <span onclick="backToCourses()">
        ${escapeHtml(
          state.selectedCategory
        )}
      </span>
      →
      ${escapeHtml(
        state.selectedCourse
      )}
    `;
  }
}

/* =====================================================
   PROGRAMME BREAKDOWN
===================================================== */

function renderList() {
  const box =
    document.getElementById(
      "listContainer"
    );

  if (!box) {
    return;
  }

  box.innerHTML = "";

  if (!rawData.length) {
    box.innerHTML = `
      <div class="empty">
        No enrolment data found for
        ${escapeHtml(
          selectedFinancialYear
        )}.
      </div>
    `;

    return;
  }

  if (state.level === "category") {
    renderCategoryList(box);
  }

  if (state.level === "course") {
    renderCourseList(box);
  }

  if (state.level === "student") {
    renderStudentList(box);
  }
}

/* =====================================================
   CATEGORY LIST
===================================================== */

function renderCategoryList(box) {
  const grouped =
    groupByCategory(rawData);

  grouped.forEach(item => {
    const categoryRows =
      rawData.filter(
        row =>
          (
            row.course_category ||
            "Uncategorised"
          ) === item.category
      );

    const newPct =
      newPercent(
        categoryRows
      ).toFixed(0);

    const card =
      document.createElement("div");

    card.className =
      "list-card";

    card.innerHTML = `
      <div class="icon">▶</div>

      <div class="title">
        ${escapeHtml(
          item.category
        )}
      </div>

      <div>
        <div class="amount">
          ${formatShortCurrency(
            item.revenue
          )}
        </div>

        <div class="students">
          ${item.count} enrolments ·
          ${newPct}% new
        </div>
      </div>
    `;

    card.addEventListener(
      "click",
      () =>
        drillToCourse(
          item.category
        )
    );

    box.appendChild(card);
  });

  box.insertAdjacentHTML(
    "beforeend",
    grandTotalCard(rawData)
  );
}

/* =====================================================
   COURSE LIST
===================================================== */

function renderCourseList(box) {
  const filtered =
    rawData.filter(
      row =>
        (
          row.course_category ||
          "Uncategorised"
        ) ===
        state.selectedCategory
    );

  const grouped =
    groupByCourse(filtered);

  grouped.forEach(item => {
    const courseRows =
      filtered.filter(
        row =>
          (
            row.course_name ||
            "Unnamed Course"
          ) === item.course
      );

    const newPct =
      newPercent(
        courseRows
      ).toFixed(0);

    const card =
      document.createElement("div");

    card.className =
      "list-card";

    card.innerHTML = `
      <div class="icon">▶</div>

      <div class="title">
        ${escapeHtml(
          item.course
        )}
      </div>

      <div>
        <div class="amount">
          ${formatShortCurrency(
            item.revenue
          )}
        </div>

        <div class="students">
          ${item.count} enrolments ·
          ${newPct}% new
        </div>
      </div>
    `;

    card.addEventListener(
      "click",
      () =>
        drillToStudent(
          item.course
        )
    );

    box.appendChild(card);
  });

  box.insertAdjacentHTML(
    "beforeend",
    grandTotalCard(filtered)
  );
}

/* =====================================================
   STUDENT LIST
===================================================== */

function renderStudentList(box) {
  const filtered =
    rawData.filter(
      row =>
        (
          row.course_name ||
          "Unnamed Course"
        ) ===
          state.selectedCourse &&
        (
          row.course_category ||
          "Uncategorised"
        ) ===
          state.selectedCategory
    );

  filtered.forEach(row => {
    const studentRow =
      document.createElement("div");

    studentRow.className =
      "student-row";

    studentRow.innerHTML = `
      <div class="avatar">
        ${escapeHtml(
          getInitials(
            row.student_name
          )
        )}
      </div>

      <div>
        <div class="title">
          ${escapeHtml(
            row.student_name ||
            "Unnamed Student"
          )}
        </div>

        <div class="students">
          ${escapeHtml(
            getDateValue(row)
          )}
        </div>
      </div>

      <div>
        <div class="amount">
          ${formatCurrency(
            fee(row)
          )}
        </div>

        <div class="badge">
          ${escapeHtml(
            row["new/existing"] ||
            ""
          )}
        </div>
      </div>
    `;

    box.appendChild(studentRow);
  });

  box.insertAdjacentHTML(
    "beforeend",
    grandTotalCard(filtered)
  );
}

/* =====================================================
   GRAND TOTAL
===================================================== */

function grandTotalCard(data) {
  const totalRevenue =
    data.reduce(
      (sum, row) =>
        sum + fee(row),
      0
    );

  const newPct =
    newPercent(data).toFixed(0);

  return `
    <div
      class="list-card grand-total-card"
    >
      <div></div>

      <div class="title">
        Grand Total
      </div>

      <div>
        <div class="amount">
          ${formatShortCurrency(
            totalRevenue
          )}
        </div>

        <div class="students">
          ${data.length} enrolments ·
          ${newPct}% new
        </div>
      </div>
    </div>
  `;
}

/* =====================================================
   GROUP BY CATEGORY
===================================================== */

function groupByCategory(data) {
  const map = {};

  data.forEach(row => {
    const category =
      row.course_category ||
      "Uncategorised";

    if (!map[category]) {
      map[category] = {
        category: category,
        count: 0,
        revenue: 0
      };
    }

    map[category].count++;
    map[category].revenue +=
      fee(row);
  });

  return Object
    .values(map)
    .sort(
      (a, b) =>
        b.revenue -
        a.revenue
    );
}

/* =====================================================
   GROUP BY COURSE
===================================================== */

function groupByCourse(data) {
  const map = {};

  data.forEach(row => {
    const course =
      row.course_name ||
      "Unnamed Course";

    if (!map[course]) {
      map[course] = {
        course: course,
        count: 0,
        revenue: 0
      };
    }

    map[course].count++;
    map[course].revenue +=
      fee(row);
  });

  return Object
    .values(map)
    .sort(
      (a, b) =>
        b.revenue -
        a.revenue
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
    category;
  state.selectedCourse = null;

  renderBreadcrumb();
  renderList();
}

function drillToStudent(course) {
  state.level = "student";
  state.selectedCourse =
    course;

  renderBreadcrumb();
  renderList();
}

function backToCourses() {
  state.level = "course";
  state.selectedCourse = null;

  renderBreadcrumb();
  renderList();
}

function goHome() {
  state.level = "category";
  state.selectedCategory = null;
  state.selectedCourse = null;

  renderBreadcrumb();
  renderList();
}

function goToStudents() {
  window.location.href =
    "student.html";
}

/* =====================================================
   HTML ACCESS
===================================================== */

window.refreshDashboard =
  refreshDashboard;

window.changeFinancialYear =
  changeFinancialYear;

window.drillToCourse =
  drillToCourse;

window.drillToStudent =
  drillToStudent;

window.backToCourses =
  backToCourses;

window.goHome =
  goHome;

window.goToStudents =
  goToStudents;
